-- M.3 — Sales & Finance Metrics
-- Tabelas: sales_transactions, finance_sync_logs, sales_company_mapping

-- ─── sales_transactions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_transactions (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         company_slug NOT NULL,
  source             text         NOT NULL CHECK (source IN ('guru', 'conta_azul', 'manual', 'webhook')),
  external_id        text,
  sale_date          timestamptz  NOT NULL,
  customer_name      text,
  customer_email     text,
  product_id         text,
  product_name       text,
  offer_name         text,
  payment_method     text,
  payment_status     text,
  transaction_status text,
  gross_amount       numeric(12,2),
  net_amount         numeric(12,2),
  fee_amount         numeric(12,2),
  refund_amount      numeric(12,2),
  currency           text         NOT NULL DEFAULT 'BRL',
  installments       integer,
  checkout_url       text,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_content        text,
  utm_term           text,
  metadata           jsonb        NOT NULL DEFAULT '{}',
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS company_id         company_slug,
  ADD COLUMN IF NOT EXISTS source             text,
  ADD COLUMN IF NOT EXISTS external_id        text,
  ADD COLUMN IF NOT EXISTS sale_date          timestamptz,
  ADD COLUMN IF NOT EXISTS customer_name      text,
  ADD COLUMN IF NOT EXISTS customer_email     text,
  ADD COLUMN IF NOT EXISTS product_id         text,
  ADD COLUMN IF NOT EXISTS product_name       text,
  ADD COLUMN IF NOT EXISTS offer_name         text,
  ADD COLUMN IF NOT EXISTS payment_method     text,
  ADD COLUMN IF NOT EXISTS payment_status     text,
  ADD COLUMN IF NOT EXISTS transaction_status text,
  ADD COLUMN IF NOT EXISTS gross_amount       numeric(12,2),
  ADD COLUMN IF NOT EXISTS net_amount         numeric(12,2),
  ADD COLUMN IF NOT EXISTS fee_amount         numeric(12,2),
  ADD COLUMN IF NOT EXISTS refund_amount      numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency           text DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS installments       integer,
  ADD COLUMN IF NOT EXISTS checkout_url       text,
  ADD COLUMN IF NOT EXISTS utm_source         text,
  ADD COLUMN IF NOT EXISTS utm_medium         text,
  ADD COLUMN IF NOT EXISTS utm_campaign       text,
  ADD COLUMN IF NOT EXISTS utm_content        text,
  ADD COLUMN IF NOT EXISTS utm_term           text,
  ADD COLUMN IF NOT EXISTS metadata           jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at         timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_transactions_source_external_id_key'
  ) THEN
    ALTER TABLE sales_transactions
      ADD CONSTRAINT sales_transactions_source_external_id_key
      UNIQUE (source, external_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sales_transactions_company_date_idx
  ON sales_transactions (company_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS sales_transactions_source_idx
  ON sales_transactions (source);

CREATE INDEX IF NOT EXISTS sales_transactions_product_name_idx
  ON sales_transactions (product_name);

CREATE INDEX IF NOT EXISTS sales_transactions_transaction_status_idx
  ON sales_transactions (transaction_status);

CREATE INDEX IF NOT EXISTS sales_transactions_payment_status_idx
  ON sales_transactions (payment_status);

CREATE INDEX IF NOT EXISTS sales_transactions_utm_campaign_idx
  ON sales_transactions (utm_campaign);

ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_sales_transactions" ON sales_transactions;

CREATE POLICY "admin_all_sales_transactions" ON sales_transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── finance_sync_logs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_sync_logs (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text         NOT NULL,
  company_id    company_slug,
  status        text         NOT NULL,
  started_at    timestamptz  NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  processed     integer      NOT NULL DEFAULT 0,
  inserted      integer      NOT NULL DEFAULT 0,
  updated       integer      NOT NULL DEFAULT 0,
  failed        integer      NOT NULL DEFAULT 0,
  error_message text,
  metadata      jsonb        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS finance_sync_logs_source_idx
  ON finance_sync_logs (source);

CREATE INDEX IF NOT EXISTS finance_sync_logs_started_idx
  ON finance_sync_logs (started_at DESC);

ALTER TABLE finance_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_finance_sync_logs" ON finance_sync_logs;

CREATE POLICY "admin_all_finance_sync_logs" ON finance_sync_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── sales_company_mapping ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_company_mapping (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text         NOT NULL,
  match_type  text         NOT NULL CHECK (
    match_type IN (
      'product_name_contains',
      'product_id',
      'offer_name_contains',
      'utm_campaign_contains',
      'explicit_company'
    )
  ),
  match_value text         NOT NULL,
  company_id  company_slug NOT NULL,
  active      boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Limpa duplicados antes de criar índice único
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY source, match_type, match_value, company_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM sales_company_mapping
)
DELETE FROM sales_company_mapping
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_company_mapping_unique_idx
  ON sales_company_mapping (source, match_type, match_value, company_id);

CREATE INDEX IF NOT EXISTS sales_company_mapping_source_idx
  ON sales_company_mapping (source);

CREATE INDEX IF NOT EXISTS sales_company_mapping_active_idx
  ON sales_company_mapping (active);

ALTER TABLE sales_company_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_sales_company_mapping" ON sales_company_mapping;

CREATE POLICY "admin_all_sales_company_mapping" ON sales_company_mapping
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── Seed: mapeamentos padrão ─────────────────────────────────────────────────

INSERT INTO sales_company_mapping (source, match_type, match_value, company_id) VALUES
  -- CPPEM Concursos
  ('guru',       'product_name_contains', 'CPPEM',     'cppem'),
  ('guru',       'product_name_contains', 'Concurso',  'cppem'),
  ('guru',       'product_name_contains', 'PMPE',      'cppem'),
  ('guru',       'product_name_contains', 'PMAL',      'cppem'),
  ('guru',       'offer_name_contains',   'concurso',  'cppem'),
  ('webhook',    'product_name_contains', 'CPPEM',     'cppem'),
  ('webhook',    'product_name_contains', 'Concurso',  'cppem'),

  -- Unicive
  ('guru',       'product_name_contains', 'Unicive',   'unicive'),
  ('guru',       'product_name_contains', 'Tecnólogo', 'unicive'),
  ('guru',       'offer_name_contains',   'unicive',   'unicive'),
  ('webhook',    'product_name_contains', 'Unicive',   'unicive'),
  ('webhook',    'product_name_contains', 'Tecnólogo', 'unicive'),

  -- Conta Azul
  ('conta_azul', 'product_name_contains', 'CPPEM',     'cppem'),
  ('conta_azul', 'product_name_contains', 'Unicive',   'unicive')
ON CONFLICT (source, match_type, match_value, company_id) DO NOTHING;

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_sales_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_transactions_updated_at ON sales_transactions;

CREATE TRIGGER trg_sales_transactions_updated_at
  BEFORE UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_transactions_updated_at();

-- ─── Validação rápida ─────────────────────────────────────────────────────────

SELECT 'sales_transactions' AS table_name, COUNT(*) AS rows FROM sales_transactions
UNION ALL
SELECT 'finance_sync_logs' AS table_name, COUNT(*) AS rows FROM finance_sync_logs
UNION ALL
SELECT 'sales_company_mapping' AS table_name, COUNT(*) AS rows FROM sales_company_mapping;