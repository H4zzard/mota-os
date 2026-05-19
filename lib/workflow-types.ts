// Tipos compartilhados de Workflows — usados em client e server components.
// NÃO importar ai-service ou supabase-server aqui.

export interface WorkflowField {
  id:           string
  label:        string
  type:         "text" | "select" | "textarea" | "number" | "multiselect"
  placeholder?: string
  options?:     string[]
  required?:    boolean
}

export interface WorkflowStep {
  title:       string
  description: string
  fields:      WorkflowField[]
}

export type WorkflowCategory =
  | "marketing" | "traffic" | "content" | "sales" | "management"
  | "launch"    | "reports" | "project" | "support" | "custom"

export type WorkflowOutputType =
  | "text" | "report" | "task_list" | "campaign_plan" | "content_calendar"
  | "sales_script" | "project_plan" | "source_document"

export type WorkflowStatus = "active" | "inactive" | "archived"

export interface DBWorkflow {
  id:               string
  company_id:       string | null
  name:             string
  description:      string | null
  category:         string | null
  area:             string | null      // legado — alias de category
  area_color:       string | null      // legado — cor por área
  status:           WorkflowStatus
  input_schema:     WorkflowField[]
  steps:            WorkflowStep[]
  prompt_template:  string | null
  default_agent_id: string | null
  output_type:      WorkflowOutputType
  metadata:         Record<string, unknown>
  created_by:       string | null
  created_at:       string
  updated_at:       string
  // computados via join com workflow_runs:
  run_count?:       number
  last_run_at?:     string | null
}

export interface DBWorkflowRun {
  id:             string
  workflow_id:    string | null
  workflow_name:  string | null
  company_id:     string | null
  user_id:        string | null
  agent_id:       string | null
  status:         "pending" | "running" | "completed" | "failed" | "canceled" | "done" | "error"
  input:          Record<string, unknown>
  output:         string | null   // alias de result
  result:         string | null   // legado
  output_json:    Record<string, unknown>
  error_message:  string | null
  provider:       string | null
  model_used:     string | null
  input_tokens:   number | null
  output_tokens:  number | null
  started_at:     string | null
  completed_at:   string | null
  created_at:     string
  metadata:       Record<string, unknown>
}

// Mapeamento de categoria → cor
export const CATEGORY_COLOR: Record<string, string> = {
  marketing:   "#16a34a",
  traffic:     "#3b82f6",
  content:     "#8b5cf6",
  design:      "#f59e0b",
  sales:       "#ef4444",
  management:  "#6366f1",
  launch:      "#f97316",
  reports:     "#0ea5e9",
  project:     "#f59e0b",
  support:     "#14b8a6",
  custom:      "#94a3b8",
  // legado (área em pt-BR)
  "Marketing":      "#16a34a",
  "Tráfego Pago":   "#3b82f6",
  "Conteúdo":       "#8b5cf6",
  "Design":         "#f59e0b",
  "Comercial":      "#ef4444",
  "Gestão":         "#6366f1",
  "Lançamentos":    "#f97316",
  "Relatórios":     "#0ea5e9",
  "Pesquisa":       "#0ea5e9",
  "Conversão":      "#14b8a6",
}

export function workflowColor(wf: DBWorkflow): string {
  return (
    wf.area_color ??
    CATEGORY_COLOR[wf.category ?? ""] ??
    CATEGORY_COLOR[wf.area ?? ""] ??
    "#6366f1"
  )
}

export const CATEGORY_LABELS: Record<string, string> = {
  marketing:  "Marketing",
  traffic:    "Tráfego Pago",
  content:    "Conteúdo",
  sales:      "Comercial",
  management: "Gestão",
  launch:     "Lançamentos",
  reports:    "Relatórios",
  project:    "Projetos",
  support:    "Suporte",
  custom:     "Personalizado",
}

export function categoryLabel(cat: string | null): string {
  if (!cat) return "Outros"
  return CATEGORY_LABELS[cat] ?? cat
}

export const OUTPUT_TYPE_LABELS: Record<string, string> = {
  text:              "Texto",
  report:            "Relatório",
  task_list:         "Lista de tarefas",
  campaign_plan:     "Plano de campanha",
  content_calendar:  "Calendário de conteúdo",
  sales_script:      "Script de vendas",
  project_plan:      "Plano de projeto",
  source_document:   "Documento de fonte",
}
