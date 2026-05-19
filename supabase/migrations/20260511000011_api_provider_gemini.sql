-- ─── Adiciona 'gemini' à enum api_provider ───────────────────────────────────
-- PostgreSQL permite ADD VALUE IF NOT EXISTS em enums sem recriar o tipo.

ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'gemini';
