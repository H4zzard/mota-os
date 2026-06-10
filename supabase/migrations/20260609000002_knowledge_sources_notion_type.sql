-- Adiciona tipo "notion" ao CHECK constraint de knowledge_sources
ALTER TABLE knowledge_sources
  DROP CONSTRAINT IF EXISTS knowledge_sources_type_check;

ALTER TABLE knowledge_sources
  ADD CONSTRAINT knowledge_sources_type_check
  CHECK (type IN (
    'playbook','faq','script','product_info','brand_voice',
    'offer','objection','competitor','internal_process',
    'document','link','manual_note','notion'
  ));
