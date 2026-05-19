-- ─── companies — adiciona colunas faltando ───────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS description text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url    text,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Trigger updated_at para companies (reutiliza função do init.sql)
DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── companies — enriquece seed existente ────────────────────────────────────
-- Usa ON CONFLICT para upsert seguro por slug, sem duplicar nem apagar dados.
INSERT INTO companies (slug, name, color, initials, description) VALUES
  ('grupo',   'Grupo Mota',       '#10b981', 'GM', 'Holding do Grupo Mota Educação'),
  ('cppem',   'CPPEM Concursos',  '#6366f1', 'CP', 'Preparatório para concursos públicos'),
  ('unicive',  'Unicive',          '#8b5cf6', 'UC', 'Faculdade Unicive'),
  ('colegio',  'Colégio CPPEM',    '#ec4899', 'CC', 'Educação básica e ensino médio'),
  ('everton',  'Everton Mota',     '#f59e0b', 'EM', 'Consultoria e treinamentos')
ON CONFLICT (slug) DO UPDATE
  SET description = EXCLUDED.description
  WHERE companies.description = '';
