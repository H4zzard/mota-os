-- Tabela de integração Notion por empresa (OAuth token não expira no Notion)
CREATE TABLE IF NOT EXISTS notion_integrations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     text        NOT NULL UNIQUE,
  access_token   text        NOT NULL,
  bot_id         text,
  workspace_id   text,
  workspace_name text,
  workspace_icon text,
  connected_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  connected_at   timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Apenas service role acessa (tokens nunca expostos ao cliente)
ALTER TABLE notion_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notion_integrations_service_only"
  ON notion_integrations
  USING (false);
