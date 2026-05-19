-- ─── user_sessions ───────────────────────────────────────────────────────────
-- Registra sessões/dispositivos ativos por usuário.
-- A revogação aqui é lógica (revoked_at); tokens Supabase expiram naturalmente.

CREATE TABLE IF NOT EXISTS user_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   text,
  ip_address   text,
  user_agent   text,
  device_name  text,
  location     text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  metadata     jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx ON user_sessions (user_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS user_sessions_user_revoked_idx ON user_sessions (user_id, revoked_at)
  WHERE revoked_at IS NOT NULL;

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Usuário só acessa suas próprias sessões
CREATE POLICY "user owns sessions" ON user_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
