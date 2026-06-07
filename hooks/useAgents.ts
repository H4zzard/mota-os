"use client";

import { useState, useEffect, useCallback, type ElementType } from "react";
import {
  Megaphone,
  TrendingUp,
  Video,
  MessageCircle,
  Rocket,
  HeadphonesIcon,
  LayoutList,
  Search,
  Globe,
  Bot,
} from "lucide-react";
import type { ApiAgent } from "@/lib/agent-helpers";

// ─── Icon lookup ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ElementType> = {
  Megaphone,
  TrendingUp,
  Video,
  MessageCircle,
  Rocket,
  HeadphonesIcon,
  LayoutList,
  Search,
  Globe,
  Bot,
};

// ─── Public types ──────────────────────────────────────────────────────────────

export type { ApiAgent };

export interface AgentWithConfig {
  // Compatibilidade com Agent (lib/mocks/agents)
  id: string;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  roleDescription: string | null;
  icon: ElementType;
  color: string;
  bg: string;
  companies: string[];
  capabilities: string[];
  tools: string[];
  status: string;
  category: string | null;
  filesCount: number;
  lastRun: string;
  runs: number;
  // Campos extra de config
  dbId: string;
  provider: string;
  modelId: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  // Raw API row (para edição)
  raw: ApiAgent;
}

export type Agent = AgentWithConfig;

function mapRow(row: ApiAgent): AgentWithConfig {
  const cfg = row.config;
  return {
    id: row.slug,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    longDescription: row.long_description,
    roleDescription: row.role_description,
    icon: ICON_MAP[row.icon] ?? Bot,
    color: row.color,
    bg: row.bg_color,
    companies: row.companies,
    capabilities: row.capabilities,
    tools: row.tools,
    status: row.status,
    category: row.category,
    filesCount: row.files_count,
    lastRun: "—",
    runs: 0,
    dbId: row.id,
    provider: cfg?.provider ?? "anthropic",
    modelId: cfg?.model_id ?? "claude-sonnet-4-6",
    systemPrompt:
      cfg?.system_prompt ??
      `Você é ${row.short_name}, assistente de IA do Grupo Mota Educação. Responda em português.`,
    maxTokens: cfg?.max_tokens ?? 2048,
    temperature: cfg?.temperature ?? 0.7,
    raw: row,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAgents(companyId?: string) {
  const [agents, setAgents] = useState<AgentWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = companyId
      ? `/api/agents?company_id=${encodeURIComponent(companyId)}`
      : "/api/agents";
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ApiAgent[]>;
      })
      .then(rows => setAgents(rows.map(mapRow)))
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Erro ao carregar agentes",
        ),
      )
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { agents, loading, error, reload: load };
}
