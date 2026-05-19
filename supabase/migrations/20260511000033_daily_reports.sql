-- ─── Adicionar department ao profiles (se não existir) ───────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';

-- ─── Tabela de relatórios diários ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_reports (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id           text        NOT NULL,
  report_date          date        NOT NULL,
  name                 text        NOT NULL,
  sector               text,
  role                 text,
  activities           jsonb       NOT NULL DEFAULT '[]',
  report_text          text,
  ai_used              boolean     NOT NULL DEFAULT false,
  status               text        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft','generated','submitted','sent','error')),
  rocketchat_status    text,
  rocketchat_channel   text,
  rocketchat_sent_at   timestamptz,
  generated_at         timestamptz,
  submitted_at         timestamptz,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,

  CONSTRAINT daily_reports_unique_per_day UNIQUE (user_id, company_id, report_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS daily_reports_user_idx    ON daily_reports (user_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_reports_company_idx ON daily_reports (company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_reports_date_idx    ON daily_reports (report_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_reports_status_idx  ON daily_reports (status)    WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Cada usuário lê os próprios relatórios; admins leem todos (verificado na API)
CREATE POLICY "daily_reports_read_own" ON daily_reports
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND user_id = auth.uid());

-- Escrita: usuário escreve os próprios; admin usa service_role (admin client)
CREATE POLICY "daily_reports_write_own" ON daily_reports
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
