-- Estende match_knowledge_chunks para aceitar MÚLTIPLAS empresas (escopo).
-- Permite que empresas-filhas (cppem, colegio...) também busquem no conhecimento
-- da empresa "grupo" (guarda-chuva do grupo educacional).
-- Retrocompatível: quem passa só filter_company continua funcionando.

DROP FUNCTION IF EXISTS match_knowledge_chunks(
  vector, int, text, uuid, uuid[], float
);

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding   vector(1536),
  match_count       int      DEFAULT 5,
  filter_company    text     DEFAULT NULL,
  filter_agent_id   uuid     DEFAULT NULL,
  filter_source_ids uuid[]   DEFAULT NULL,
  min_similarity    float    DEFAULT 0.4,
  filter_companies  text[]   DEFAULT NULL
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
    AND (filter_agent_id   IS NULL OR kc.agent_id            = filter_agent_id)
    AND (filter_source_ids IS NULL OR kc.knowledge_source_id = ANY(filter_source_ids))
    AND (
      CASE
        WHEN filter_companies IS NOT NULL THEN kc.company_id = ANY(filter_companies)
        WHEN filter_company   IS NOT NULL THEN kc.company_id = filter_company
        ELSE TRUE
      END
    )
    AND 1 - (kc.embedding <=> query_embedding) >= min_similarity
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
