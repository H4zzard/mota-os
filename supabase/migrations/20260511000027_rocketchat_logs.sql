-- ─── integration_logs ────────────────────────────────────────────────────────
-- Registra envios e ações via integrações externas (Rocket.Chat, WhatsApp, etc.)

CREATE TABLE IF NOT EXISTS integration_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text        NOT NULL,
  action        text        NOT NULL,
  status        text        NOT NULL CHECK (status IN ('success', 'error')),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id    text,
  session_id    uuid,
  payload       jsonb       NOT NULL DEFAULT '{}',
  response      jsonb       NOT NULL DEFAULT '{}',
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_logs_provider_idx ON integration_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_user_idx     ON integration_logs (user_id,   created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_status_idx   ON integration_logs (status,    created_at DESC);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON integration_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
