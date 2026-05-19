-- ─── messages: adicionar coluna provider ─────────────────────────────────────
-- Registra qual provedor de IA gerou cada mensagem assistant.
-- Texto livre para suportar futuros provedores além do enum api_provider.

alter table messages
  add column if not exists provider text;
