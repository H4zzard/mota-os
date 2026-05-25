-- ─── L.1 RAG com Embeddings ───────────────────────────────────────────────────
-- Ordem: extensão → colunas → função RPC → índices → RLS

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Garantir extensão pgvector
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. knowledge_chunks — augmentar schema existente
-- ══════════════════════════════════════════════════════════════════════════════

-- Tornar source_id e file_id nullable (originais referenciam a tabela 'sources'
-- do schema legado; novos chunks referenciam knowledge_sources ou agent_files)
ALTER TABLE knowledge_chunks
  ALTER COLUMN source_id DROP NOT NULL;

ALTER TABLE knowledge_chunks
  ALTER COLUMN file_id DROP NOT NULL;

-- Novas chaves estrangeiras para as tabelas modernas
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS knowledge_source_id  uuid         REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS agent_file_id         uuid         REFERENCES agent_files(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id            text,
  ADD COLUMN IF NOT EXISTS agent_id              uuid         REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type           text,
  ADD COLUMN IF NOT EXISTS title                 text,
  ADD COLUMN IF NOT EXISTS content_hash          text,
  ADD COLUMN IF NOT EXISTS chunk_index           integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_count           integer,
  ADD COLUMN IF NOT EXISTS embedding_model       text         NOT NULL DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS created_by            uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz  NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at            timestamptz;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. knowledge_sources — colunas de embedding
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS embedding_status  text  NOT NULL DEFAULT 'pending'
    CHECK (embedding_status IN ('pending','processing','done','error')),
  ADD COLUMN IF NOT EXISTS content_hash      text;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. agent_files — colunas de embedding
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE agent_files
  ADD COLUMN IF NOT EXISTS embedding_status  text  NOT NULL DEFAULT 'pending'
    CHECK (embedding_status IN ('pending','processing','done','error')),
  ADD COLUMN IF NOT EXISTS content_hash      text;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Função RPC para busca semântica
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding   vector(1536),
  match_count       int      DEFAULT 5,
  filter_company    text     DEFAULT NULL,
  filter_agent_id   uuid     DEFAULT NULL,
  filter_source_ids uuid[]   DEFAULT NULL,
  min_similarity    float    DEFAULT 0.4
)
RETURNS TABLE (
  id                  uuid,
  content             text,
  title               text,
  source_type         text,
  knowledge_source_id uuid,
  agent_file_id       uuid,
  company_id          text,
  chunk_index         integer,
  similarity          float
)
LANGUAGE sql STABLE AS $$
  SELECT
    kc.id,
    kc.content,
    kc.title,
    kc.source_type,
    kc.knowledge_source_id,
    kc.agent_file_id,
    kc.company_id,
    kc.chunk_index,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.embedding IS NOT NULL
    AND kc.deleted_at IS NULL
    AND (filter_company    IS NULL OR kc.company_id            = filter_company)
    AND (filter_agent_id   IS NULL OR kc.agent_id              = filter_agent_id)
    AND (filter_source_ids IS NULL OR kc.knowledge_source_id   = ANY(filter_source_ids))
    AND 1 - (kc.embedding <=> query_embedding) >= min_similarity
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Índices
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS knowledge_chunks_knowledge_source_id_idx
  ON knowledge_chunks (knowledge_source_id)
  WHERE knowledge_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_agent_file_id_idx
  ON knowledge_chunks (agent_file_id)
  WHERE agent_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_company_id_idx
  ON knowledge_chunks (company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_content_hash_idx
  ON knowledge_chunks (content_hash)
  WHERE content_hash IS NOT NULL;

-- Índice HNSW para busca ANN (mais eficiente que IVFFlat para bases médias)
-- Requer pgvector >= 0.5. Se falhar, use IVFFlat abaixo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'knowledge_chunks'
      AND indexname = 'knowledge_chunks_embedding_hnsw_idx'
  ) THEN
    EXECUTE 'CREATE INDEX knowledge_chunks_embedding_hnsw_idx
      ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: IVFFlat (já existe o índice original; não recriar)
  NULL;
END $$;
