-- ─── Etapa F.1 Hotfix — Vigias ───────────────────────────────────────────────
-- Adiciona created_at em watcher_logs (backfill de started_at).
-- Idempotente.

ALTER TABLE watcher_logs
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Backfill: usar started_at (que já tem DEFAULT now()) como created_at
UPDATE watcher_logs
  SET created_at = started_at
  WHERE created_at IS NULL;

-- Tornar NOT NULL com DEFAULT para novas linhas
ALTER TABLE watcher_logs
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS watcher_logs_created_at_idx
  ON watcher_logs (created_at DESC);
