-- ─── Hotfix D.2 — source_files compatibility ─────────────────────────────────
--
-- Problema: source_files.source_id era NOT NULL referenciando a tabela 'sources'
-- (fluxo antigo). O novo upload via /api/source-files/upload não usa 'sources',
-- então a coluna precisa ser nullable para permitir arquivos avulsos.
--
-- Correção: tornar source_id nullable sem quebrar registros existentes.

ALTER TABLE source_files
  ALTER COLUMN source_id DROP NOT NULL;

-- Índice extra para queries de upload por empresa
CREATE INDEX IF NOT EXISTS source_files_upload_status_idx
  ON source_files (upload_status)
  WHERE upload_status IS NOT NULL;

-- Garantia: company_id em source_files aceita null (upload pode não ter empresa
-- mas as inserções via API sempre fornecem company_id). Nada a alterar.

-- Verificação final:
-- source_files.source_id  → nullable (FK para 'sources', legada)
-- source_files.company_id → nullable (preenche via API nova)
-- source_files.knowledge_source_id → nullable (link opcional com knowledge_sources)
-- source_files.upload_status → NOT NULL DEFAULT 'uploaded'
