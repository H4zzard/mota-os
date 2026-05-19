-- ─── Etapa G.1 — Novidades funcional ─────────────────────────────────────────
-- Tabelas: announcements + announcement_reads
-- Idempotente: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.

-- ─── 1. Tabela principal ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text         NOT NULL,
  content      text         NOT NULL,
  type         text         NOT NULL DEFAULT 'update'
                            CHECK (type IN ('update', 'feature', 'fix', 'warning', 'announcement', 'maintenance')),
  status       text         NOT NULL DEFAULT 'published'
                            CHECK (status IN ('draft', 'published', 'archived')),
  version      text,
  company_id   company_slug,
  audience     text         NOT NULL DEFAULT 'all'
                            CHECK (audience IN ('all', 'admins', 'company', 'role')),
  priority     text         NOT NULL DEFAULT 'normal'
                            CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_at timestamptz,
  created_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  deleted_at   timestamptz,
  metadata     jsonb        NOT NULL DEFAULT '{}'
);

-- ─── 2. Tabela de leituras ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcement_reads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  uuid        NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- ─── 3. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS announcements_status_published_at_idx
  ON announcements (status, published_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS announcements_company_status_idx
  ON announcements (company_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS announcements_type_idx
  ON announcements (type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS announcement_reads_user_id_idx
  ON announcement_reads (user_id);

CREATE INDEX IF NOT EXISTS announcement_reads_announcement_id_idx
  ON announcement_reads (announcement_id);

-- ─── 4. Trigger updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();

-- ─── 5. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements: authenticated read" ON announcements;
CREATE POLICY "announcements: authenticated read" ON announcements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "announcements: admin write" ON announcements;
CREATE POLICY "announcements: admin write" ON announcements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "announcement_reads: own" ON announcement_reads;
CREATE POLICY "announcement_reads: own" ON announcement_reads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 6. Seed inicial (apenas se a tabela estiver vazia) ───────────────────────

INSERT INTO announcements (title, content, type, status, version, priority, published_at)
SELECT * FROM (VALUES
  (
    'Agentes 100% configuráveis',
    'Os agentes do Mota OS agora são totalmente configuráveis por empresa. Defina modelo de IA, temperatura, tokens, system prompt, arquivos de memória e muito mais pela interface, sem código.',
    'feature', 'published', 'v1.2', 'high', now() - interval '1 day'
  ),
  (
    'Fontes e playbooks por empresa',
    'As fontes de conhecimento (APIs externas, MCPs, pastas locais e playbooks) agora são vinculadas por empresa, garantindo isolamento completo de dados entre unidades do grupo.',
    'update', 'published', 'v1.1', 'normal', now() - interval '4 days'
  ),
  (
    'Vigias com rotina e horário de análise',
    'Os vigias agora suportam agendamento por frequência (horária, diária, semanal, mensal), horário personalizado no fuso do servidor e dias específicos da semana. O resultado de cada execução é salvo em histórico.',
    'feature', 'published', 'v1.3', 'high', now() - interval '2 hours'
  )
) AS v(title, content, type, status, version, priority, published_at)
WHERE NOT EXISTS (SELECT 1 FROM announcements LIMIT 1);
