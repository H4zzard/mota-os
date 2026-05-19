-- ─── Colunas de resultado de teste em destinos Rocket.Chat ──────────────────
-- Adicionadas para armazenar resultado do último teste sem sobrescrever metadata

ALTER TABLE rocketchat_destinations
  ADD COLUMN IF NOT EXISTS error_message  text,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz;
