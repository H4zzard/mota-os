-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — workflow_runs: adiciona workflow_name
-- Migration: 20260511000006
-- ═══════════════════════════════════════════════════════════════════════════════

alter table workflow_runs
  add column if not exists workflow_name text;
