-- M.4 — Adiciona conta_azul ao enum api_provider
-- Necessário para que saveContaAzulTokens consiga inserir na tabela api_connections

ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'conta_azul';
