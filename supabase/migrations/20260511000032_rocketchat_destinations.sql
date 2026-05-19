-- ─── Destinos Rocket.Chat ────────────────────────────────────────────────────
-- Permite múltiplos destinos com webhook/canal/alias distintos por finalidade
-- (chat, relatório diário, vigias, workflows, etc.)

CREATE TABLE IF NOT EXISTS rocketchat_destinations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  type        text        NOT NULL
                          CHECK (type IN ('chat','daily_report','automation','watcher','workflow','project','general')),
  mode        text        NOT NULL DEFAULT 'webhook'
                          CHECK (mode IN ('webhook','rest')),
  webhook_url text,                     -- secret — nunca retornar completo ao client
  base_url    text,
  user_id     text,
  auth_token  text,                     -- secret — nunca retornar completo ao client
  channel     text        NOT NULL,
  alias       text,
  avatar      text,
  status      text        NOT NULL DEFAULT 'not_configured'
                          CHECK (status IN ('not_configured','configured','connected','error','inactive')),
  is_default  boolean     NOT NULL DEFAULT false,
  company_id  text,                     -- null = global (visível para todas as empresas)
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  metadata    jsonb       NOT NULL DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS rc_dest_type_idx
  ON rocketchat_destinations (type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS rc_dest_company_idx
  ON rocketchat_destinations (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS rc_dest_default_idx
  ON rocketchat_destinations (type, is_default)
  WHERE deleted_at IS NULL AND is_default = true;

-- RLS
ALTER TABLE rocketchat_destinations ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado (admin check feito na API)
CREATE POLICY "rc_dest_read" ON rocketchat_destinations
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Escrita: a API usa service_role (admin client) — políticas permissivas para autenticados
CREATE POLICY "rc_dest_write" ON rocketchat_destinations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Seeds — destinos padrão ─────────────────────────────────────────────────
-- Criados sem webhook_url para forçar configuração pelo admin
INSERT INTO rocketchat_destinations
  (id, name, type, mode, channel, alias, status, is_default, metadata)
VALUES
  (
    'd1000001-0000-0000-0000-000000000001',
    'Chat IA',
    'chat',
    'webhook',
    '#geral',
    'Mota AI',
    'not_configured',
    true,
    '{"description":"Respostas do Chat IA para o canal de atendimento"}'
  ),
  (
    'd1000001-0000-0000-0000-000000000002',
    'Relatório Diário',
    'daily_report',
    'webhook',
    '#relatorios',
    'Mota Reports',
    'not_configured',
    true,
    '{"description":"Relatórios automáticos — canal separado do chat"}'
  ),
  (
    'd1000001-0000-0000-0000-000000000003',
    'Vigias / Alertas',
    'watcher',
    'webhook',
    '#alertas',
    'Mota Vigias',
    'not_configured',
    true,
    '{"description":"Notificações de vigias e automações"}'
  ),
  (
    'd1000001-0000-0000-0000-000000000004',
    'Workflows',
    'workflow',
    'webhook',
    '#workflows',
    'Mota Flows',
    'not_configured',
    true,
    '{"description":"Resultados de execuções de workflows"}'
  )
ON CONFLICT (id) DO NOTHING;
