-- ─── M.1 Dashboard Executivo — Tabelas de métricas e snapshots ───────────────
-- Corrigida: comparação company_slug = company_slug nas policies

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. dashboard_metrics — recebe dados de tráfego/marketing de qualquer fonte
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      company_slug NOT NULL,
  source          text         NOT NULL
                  CHECK (source IN ('meta_ads','google_ads','ga4','reportei','manual','jarvis')),
  metric_date     date         NOT NULL,
  metric_name     text         NOT NULL
                  CHECK (metric_name IN (
                    'spend','impressions','clicks','leads','sales','revenue',
                    'cpc','cpl','cac','roi','conversion_rate',
                    'sessions','users','pageviews'
                  )),
  metric_value    numeric,
  dimension       text,
  dimension_value text,
  campaign_id     text,
  campaign_name   text,
  metadata        jsonb        NOT NULL DEFAULT '{}',
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE dashboard_metrics
  ADD COLUMN IF NOT EXISTS company_id      company_slug,
  ADD COLUMN IF NOT EXISTS source          text,
  ADD COLUMN IF NOT EXISTS metric_date     date,
  ADD COLUMN IF NOT EXISTS metric_name     text,
  ADD COLUMN IF NOT EXISTS metric_value    numeric,
  ADD COLUMN IF NOT EXISTS dimension       text,
  ADD COLUMN IF NOT EXISTS dimension_value text,
  ADD COLUMN IF NOT EXISTS campaign_id     text,
  ADD COLUMN IF NOT EXISTS campaign_name   text,
  ADD COLUMN IF NOT EXISTS metadata        jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_metrics_source_check'
      AND conrelid = 'dashboard_metrics'::regclass
  ) THEN
    ALTER TABLE dashboard_metrics
      ADD CONSTRAINT dashboard_metrics_source_check
      CHECK (source IN ('meta_ads','google_ads','ga4','reportei','manual','jarvis'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_metrics_metric_name_check'
      AND conrelid = 'dashboard_metrics'::regclass
  ) THEN
    ALTER TABLE dashboard_metrics
      ADD CONSTRAINT dashboard_metrics_metric_name_check
      CHECK (metric_name IN (
        'spend','impressions','clicks','leads','sales','revenue',
        'cpc','cpl','cac','roi','conversion_rate',
        'sessions','users','pageviews'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_metrics_company_source_date_name_dim_uniq'
      AND conrelid = 'dashboard_metrics'::regclass
  ) THEN
    ALTER TABLE dashboard_metrics
      ADD CONSTRAINT dashboard_metrics_company_source_date_name_dim_uniq
      UNIQUE (company_id, source, metric_date, metric_name, dimension, dimension_value, campaign_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dashboard_metrics_company_date_idx
  ON dashboard_metrics (company_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS dashboard_metrics_company_source_idx
  ON dashboard_metrics (company_id, source);

CREATE INDEX IF NOT EXISTS dashboard_metrics_metric_name_idx
  ON dashboard_metrics (metric_name);

CREATE INDEX IF NOT EXISTS dashboard_metrics_campaign_id_idx
  ON dashboard_metrics (campaign_id)
  WHERE campaign_id IS NOT NULL;

ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_metrics: read" ON dashboard_metrics;

CREATE POLICY "dashboard_metrics: read" ON dashboard_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM company_members
      WHERE company_members.company_id = dashboard_metrics.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "dashboard_metrics: write" ON dashboard_metrics;

CREATE POLICY "dashboard_metrics: write" ON dashboard_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. dashboard_snapshots — análises executivas geradas por IA
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    company_slug NOT NULL,
  snapshot_date date         NOT NULL DEFAULT current_date,
  period        text         NOT NULL DEFAULT 'daily',
  summary       jsonb        NOT NULL DEFAULT '{}',
  ai_analysis   text,
  created_by    uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE dashboard_snapshots
  ADD COLUMN IF NOT EXISTS company_id    company_slug,
  ADD COLUMN IF NOT EXISTS snapshot_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS period        text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS summary       jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_analysis   text,
  ADD COLUMN IF NOT EXISTS created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at    timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_snapshots_period_check'
      AND conrelid = 'dashboard_snapshots'::regclass
  ) THEN
    ALTER TABLE dashboard_snapshots
      ADD CONSTRAINT dashboard_snapshots_period_check
      CHECK (period IN ('daily','weekly','monthly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dashboard_snapshots_company_date_idx
  ON dashboard_snapshots (company_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS dashboard_snapshots_created_at_idx
  ON dashboard_snapshots (created_at DESC);

ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_snapshots: read" ON dashboard_snapshots;

CREATE POLICY "dashboard_snapshots: read" ON dashboard_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM company_members
      WHERE company_members.company_id = dashboard_snapshots.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "dashboard_snapshots: write" ON dashboard_snapshots;

CREATE POLICY "dashboard_snapshots: write" ON dashboard_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── updated_at triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_dashboard_metrics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_metrics_updated_at ON dashboard_metrics;

CREATE TRIGGER trg_dashboard_metrics_updated_at
  BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_metrics_updated_at();

CREATE OR REPLACE FUNCTION update_dashboard_snapshots_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_snapshots_updated_at ON dashboard_snapshots;

CREATE TRIGGER trg_dashboard_snapshots_updated_at
  BEFORE UPDATE ON dashboard_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_snapshots_updated_at();

-- ─── Validação rápida ─────────────────────────────────────────────────────────

SELECT 'dashboard_metrics' AS table_name, COUNT(*) AS rows FROM dashboard_metrics
UNION ALL
SELECT 'dashboard_snapshots' AS table_name, COUNT(*) AS rows FROM dashboard_snapshots;