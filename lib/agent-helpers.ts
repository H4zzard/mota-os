/**
 * Tipos e mappers para o módulo de Agentes. SERVER-SIDE ONLY.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ApiAgent {
  id:               string
  name:             string
  short_name:       string
  slug:             string
  description:      string
  long_description: string
  role_description: string | null
  status:           string
  icon:             string
  color:            string
  bg_color:         string
  category:         string | null
  capabilities:     string[]
  tools:            string[]
  metadata:         Record<string, unknown>
  created_by:       string | null
  created_at:       string
  updated_at:       string | null
  archived_at:      string | null
  deleted_at:       string | null
  // Dados enriquecidos (join)
  config:           ApiAgentModelConfig | null
  companies:        string[]
  files_count:      number
}

export interface ApiAgentModelConfig {
  agent_id:      string
  provider:      string
  model_id:      string
  system_prompt: string
  temperature:   number
  max_tokens:    number
  updated_at:    string | null
}

export interface ApiAgentFile {
  id:             string
  agent_id:       string
  company_id:     string | null
  uploaded_by:    string | null
  file_name:      string
  file_type:      string
  file_size:      number
  storage_path:   string
  extracted_text: string | null
  status:         string
  metadata:       Record<string, unknown>
  created_at:     string
}

export interface ApiAgentCompany {
  id:         string
  agent_id:   string
  company_id: string
  status:     string
  created_at: string
}

export function mapAgent(
  row: Row,
  config: Row | null = null,
  companies: string[] = [],
  files_count = 0,
): ApiAgent {
  const cfg = config ?? row.config ?? null
  return {
    id:               row.id,
    name:             row.name ?? "",
    short_name:       row.short_name ?? row.name ?? "",
    slug:             row.slug ?? row.id,
    description:      row.description ?? "",
    long_description: row.long_description ?? row.description ?? "",
    role_description: row.role_description ?? row.long_description ?? null,
    status:           row.status ?? "active",
    icon:             row.icon ?? "Bot",
    color:            row.color ?? "#6366f1",
    bg_color:         row.bg_color ?? "rgba(99,102,241,0.12)",
    category:         row.category ?? null,
    capabilities:     Array.isArray(row.capabilities) ? row.capabilities : [],
    tools:            Array.isArray(row.tools) ? row.tools : [],
    metadata:         row.metadata ?? {},
    created_by:       row.created_by ?? null,
    created_at:       row.created_at,
    updated_at:       row.updated_at ?? null,
    archived_at:      row.archived_at ?? null,
    deleted_at:       row.deleted_at ?? null,
    config:           cfg ? {
      agent_id:      cfg.agent_id ?? row.id,
      provider:      cfg.provider      ?? "anthropic",
      model_id:      cfg.model_id      ?? "claude-sonnet-4-6",
      system_prompt: cfg.system_prompt ?? "",
      temperature:   cfg.temperature   ?? 0.7,
      max_tokens:    cfg.max_tokens    ?? 2048,
      updated_at:    cfg.updated_at    ?? null,
    } : null,
    companies,
    files_count,
  }
}

export function mapAgentFile(row: Row): ApiAgentFile {
  return {
    id:             row.id,
    agent_id:       row.agent_id,
    company_id:     row.company_id ?? null,
    uploaded_by:    row.uploaded_by ?? null,
    file_name:      row.file_name ?? "",
    file_type:      row.file_type ?? "",
    file_size:      row.file_size ?? 0,
    storage_path:   row.storage_path ?? "",
    extracted_text: row.extracted_text ?? null,
    status:         row.status ?? "uploaded",
    metadata:       row.metadata ?? {},
    created_at:     row.created_at,
  }
}

export function buildAgentUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const u: Record<string, unknown> = {}
  if (body.name             !== undefined) u.name             = String(body.name).trim()
  if (body.short_name       !== undefined) u.short_name       = String(body.short_name).trim()
  if (body.slug             !== undefined) u.slug             = String(body.slug).trim().toLowerCase()
  if (body.description      !== undefined) u.description      = body.description
  if (body.role_description !== undefined) {
    u.role_description = body.role_description
    u.long_description = body.role_description  // sync legado
  }
  if (body.status       !== undefined) u.status       = body.status
  if (body.icon         !== undefined) u.icon         = body.icon
  if (body.color        !== undefined) u.color        = body.color
  if (body.bg_color     !== undefined) u.bg_color     = body.bg_color
  if (body.category     !== undefined) u.category     = body.category
  if (body.capabilities !== undefined) u.capabilities = body.capabilities
  if (body.tools        !== undefined) u.tools        = body.tools
  if (body.metadata     !== undefined) u.metadata     = body.metadata
  return u
}
