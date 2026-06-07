-- Índices para filtros personalizados em sales_transactions.
-- pg_trgm habilita ILIKE eficiente em customer_name e product_name.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Busca parcial por nome de cliente (ilike %term%)
CREATE INDEX IF NOT EXISTS sales_transactions_customer_name_trgm_idx
  ON sales_transactions USING GIN (customer_name gin_trgm_ops);

-- Busca parcial por nome de produto (ilike %term%) — complementa o btree existente
CREATE INDEX IF NOT EXISTS sales_transactions_product_name_trgm_idx
  ON sales_transactions USING GIN (product_name gin_trgm_ops);

-- Índice composto para filtros combinados: empresa + período + origem
-- Evita full-scan quando source é adicionado ao filtro principal
CREATE INDEX IF NOT EXISTS sales_transactions_company_date_source_idx
  ON sales_transactions (company_id, sale_date DESC, source);

-- Verifica contagem para confirmar aplicação
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sales_transactions'
ORDER BY indexname;
