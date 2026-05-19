-- ─── HOTFIX: garante colunas necessárias em messages, activity_logs e sessions ─
-- Idempotente — pode ser re-executado sem risco.

-- ─── 1. messages: status + error_message + provider ──────────────────────────
-- (migration 2 + migration 10, caso não tenham sido aplicadas)

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('pending', 'streaming', 'done', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS status        message_status NOT NULL DEFAULT 'done',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS provider      text;

CREATE INDEX IF NOT EXISTS messages_status_idx ON messages (session_id, status)
  WHERE status IN ('pending', 'streaming', 'error');

-- ─── 2. sessions: agent_id nullable + deleted_at + updated_at ────────────────
-- (migration 2 + migration 15)

ALTER TABLE sessions
  ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS sessions_user_active_idx
  ON sessions (user_id, last_message_at DESC)
  WHERE deleted_at IS NULL AND archived = false;

CREATE INDEX IF NOT EXISTS sessions_user_archived_idx
  ON sessions (user_id, last_message_at DESC)
  WHERE deleted_at IS NULL AND archived = true;

CREATE INDEX IF NOT EXISTS sessions_user_pinned_idx
  ON sessions (user_id, last_message_at DESC)
  WHERE deleted_at IS NULL AND pinned = true;

CREATE INDEX IF NOT EXISTS sessions_deleted_at_idx
  ON sessions (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Limpar agent_id inválido em sessões antigas
UPDATE sessions
SET agent_id = NULL
WHERE agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM agents WHERE agents.id = sessions.agent_id);

-- ─── 3. activity_logs: company_id + session_id + user_agent ──────────────────
-- (migration 14)

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS company_id text,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS activity_logs_event_type_idx
  ON activity_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_session_id_idx
  ON activity_logs (session_id)
  WHERE session_id IS NOT NULL;

-- ─── 4. Trigger: atualiza sessions.last_message_at e message_count ───────────
-- (migration 2, caso não tenha sido aplicada)

CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE sessions
  SET
    last_message_at = new.created_at,
    message_count   = message_count + 1
  WHERE id = new.session_id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_session_on_message();

-- ─── 5. Trigger: cria profile no primeiro login ───────────────────────────────
-- (migration 2, caso não tenha sido aplicada)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(split_part(new.email, '@', 1), 'Usuário')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 6. RLS: políticas por usuário (migration 2, caso não aplicada) ───────────

-- sessions
DROP POLICY IF EXISTS "authenticated full access" ON sessions;
DROP POLICY IF EXISTS "sessions: own all" ON sessions;
CREATE POLICY "sessions: own all" ON sessions
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- messages
DROP POLICY IF EXISTS "authenticated full access" ON messages;
DROP POLICY IF EXISTS "messages: own sessions only" ON messages;
CREATE POLICY "messages: own sessions only" ON messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = messages.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = messages.session_id
        AND s.user_id = auth.uid()
    )
  );

-- activity_logs
DROP POLICY IF EXISTS "authenticated full access" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs: own all" ON activity_logs;
CREATE POLICY "activity_logs: own all" ON activity_logs
  FOR ALL TO authenticated
  USING  (coalesce(user_id, auth.uid()) = auth.uid())
  WITH CHECK (user_id = auth.uid());
