-- ─── sessions — adiciona colunas de gestão ───────────────────────────────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger updated_at
DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices úteis para filtros
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

-- ─── Limpar agent_id inválido em sessões antigas ──────────────────────────────
-- Seta agent_id = null para sessões cujo agent_id não existe mais em agents.
UPDATE sessions
SET agent_id = NULL
WHERE agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agents WHERE agents.id = sessions.agent_id
  );
