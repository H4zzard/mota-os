-- ─── api_provider — novos valores ────────────────────────────────────────────
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'meta_ads';
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'google_ads';
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'ga4';
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'supabase';

-- ─── api_conn_status — novos valores ─────────────────────────────────────────
ALTER TYPE api_conn_status ADD VALUE IF NOT EXISTS 'not_configured';
ALTER TYPE api_conn_status ADD VALUE IF NOT EXISTS 'configured';

-- ─── api_connections — adiciona coluna error_message ─────────────────────────
ALTER TABLE api_connections ADD COLUMN IF NOT EXISTS error_message text;
