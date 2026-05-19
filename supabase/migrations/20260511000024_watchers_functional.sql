-- ─── Etapa F.1 — Vigias 100% funcionais ──────────────────────────────────────
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- Não apaga dados existentes.

-- ─── 1. Colunas adicionais em watchers ───────────────────────────────────────

ALTER TABLE watchers
  ADD COLUMN IF NOT EXISTS enabled             boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS schedule_time       time,
  ADD COLUMN IF NOT EXISTS timezone            text        NOT NULL DEFAULT 'America/Recife',
  ADD COLUMN IF NOT EXISTS days_of_week        text[],
  ADD COLUMN IF NOT EXISTS condition_config    jsonb       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_config jsonb       NOT NULL DEFAULT '{"channel":"dashboard"}',
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz DEFAULT now();

-- Sincronizar condition_config ← condition para linhas existentes
UPDATE watchers
  SET condition_config = condition
  WHERE condition_config = '{}' AND condition IS NOT NULL AND condition != '{}';

-- ─── 2. Remover check constraints antigas (ampliar tipos e frequências) ───────

ALTER TABLE watchers DROP CONSTRAINT IF EXISTS watchers_watcher_type_check;
ALTER TABLE watchers DROP CONSTRAINT IF EXISTS watchers_frequency_check;
-- Validação acontece na camada de API — sem constraint de DB para máxima flexibilidade.

-- ─── 3. Atualizar watcher_logs ────────────────────────────────────────────────

ALTER TABLE watcher_logs
  ADD COLUMN IF NOT EXISTS company_id    text,
  ADD COLUMN IF NOT EXISTS result_data   jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matched_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Adicionar 'running' ao status e padronizar nomes
ALTER TABLE watcher_logs DROP CONSTRAINT IF EXISTS watcher_logs_status_check;
ALTER TABLE watcher_logs
  ADD CONSTRAINT watcher_logs_status_check
  CHECK (status IN ('running', 'ok', 'alert', 'error', 'success', 'warning', 'failed'));

-- ─── 4. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS watchers_company_enabled_status_idx
  ON watchers (company_id, enabled, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS watchers_next_check_idx
  ON watchers (next_check_at)
  WHERE deleted_at IS NULL AND enabled = true;

CREATE INDEX IF NOT EXISTS watcher_logs_company_started_idx
  ON watcher_logs (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS watcher_logs_watcher_started_idx
  ON watcher_logs (watcher_id, started_at DESC);

-- ─── 5. Trigger updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_watchers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_watchers_updated_at ON watchers;
CREATE TRIGGER trg_watchers_updated_at
  BEFORE UPDATE ON watchers
  FOR EACH ROW EXECUTE FUNCTION update_watchers_updated_at();

-- ─── 6. RLS — garantir que watchers tenha política permissiva para autenticados
-- (o controle de empresa é feito na camada de API com isGlobalAdmin)

ALTER TABLE watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "watchers: authenticated all" ON watchers;
CREATE POLICY "watchers: authenticated all" ON watchers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
