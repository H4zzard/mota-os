export type TaskStatus   = "backlog" | "todo" | "doing" | "waiting_approval" | "done"
export type TaskPriority = "baixa" | "media" | "alta" | "urgente"

export interface Task {
  id:               string
  title:            string
  description:      string
  status:           TaskStatus
  priority:         TaskPriority
  assigneeName:     string | null
  assignee:         string          // display (fallback "—")
  assigneeInitials: string          // fallback "?"
  assigneeColor:    string          // fallback "#94a3b8"
  companyId:        string | null
  projectColor:     string          // derived from companyId
  dueDate:          string          // ISO "YYYY-MM-DD" or ""
  tags:             string[]
  archived:         boolean
}

export const kanbanColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "backlog",          label: "Backlog",       color: "#64748b" },
  { id: "todo",             label: "A fazer",       color: "#94a3b8" },
  { id: "doing",            label: "Em progresso",  color: "#3b82f6" },
  { id: "waiting_approval", label: "Aguardando OK", color: "#f59e0b" },
  { id: "done",             label: "Concluído",     color: "#16a34a" },
]

export const COMPANY_COLOR: Record<string, string> = {
  cppem:   "#16a34a",
  unicive:  "#3b82f6",
  colegio:  "#8b5cf6",
  everton:  "#f97316",
  grupo:    "#06b6d4",
}
