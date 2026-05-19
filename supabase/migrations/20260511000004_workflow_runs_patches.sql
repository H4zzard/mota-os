-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — Workflow Runs Patches
-- Migration: 20260511000004
-- O que faz:
--   1. Torna workflow_id nullable (mock slugs não são UUIDs do banco)
--   2. Adiciona workflow_slug para referenciar o workflow por ID de mock
--   3. Adiciona company_id, error_message, completed_at
--   4. Atualiza a política RLS (já existe via user_id)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. workflow_id opcional ─────────────────────────────────────────────────

alter table workflow_runs
  alter column workflow_id drop not null;


-- ─── 2. Novas colunas ────────────────────────────────────────────────────────

alter table workflow_runs
  add column if not exists workflow_slug text,
  add column if not exists company_id    text,
  add column if not exists error_message text,
  add column if not exists completed_at  timestamptz;


-- ─── 3. Índice para consultas por usuário + status ───────────────────────────

create index if not exists workflow_runs_user_status_idx
  on workflow_runs (user_id, status, created_at desc);


-- ─── 4. RLS — garantir que a política cobre o novo estado ────────────────────
-- A política "workflow_runs: own all" já usa user_id = auth.uid()
-- Nenhuma alteração necessária.
