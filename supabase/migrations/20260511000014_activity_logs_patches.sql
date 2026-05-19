-- ─── activity_logs — adiciona colunas opcionais ──────────────────────────────
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS company_id text,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Índice para filtrar por tipo de evento
CREATE INDEX IF NOT EXISTS activity_logs_event_type_idx
  ON activity_logs (event_type, created_at DESC);

-- Índice para filtrar por sessão
CREATE INDEX IF NOT EXISTS activity_logs_session_id_idx
  ON activity_logs (session_id)
  WHERE session_id IS NOT NULL;
