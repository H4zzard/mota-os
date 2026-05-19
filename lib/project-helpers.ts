/**
 * Helpers compartilhados para as APIs de Projetos.
 * SERVER-SIDE ONLY.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ApiProject {
  id:            string
  name:          string
  description:   string
  company_id:    string
  owner_id:      string | null
  status:        string
  priority:      string
  progress:      number
  budget:        number | null
  budget_used:   number | null
  start_date:    string | null
  due_date:      string | null
  tags:          string[]
  highlights:    string[]
  objectives:    string | null
  metadata:      Record<string, unknown>
  created_by:    string | null
  created_at:    string
  updated_at:    string
  archived_at:   string | null
  deleted_at:    string | null
  tasks_open:    number
  tasks_total:   number
  sessions_count: number
}

export interface ApiTask {
  id:           string
  project_id:   string
  company_id:   string | null
  title:        string
  description:  string
  status:       string
  priority:     string
  assignee_id:  string | null
  assignee_name: string | null
  due_date:     string | null
  completed_at: string | null
  created_by:   string | null
  created_at:   string
  updated_at:   string
  archived:     boolean
}

export interface ApiProjectFile {
  id:             string
  project_id:     string
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

export function mapProject(row: Row): ApiProject {
  return {
    id:            row.id,
    // Prefere coluna 'name' (adicionada pelo hotfix E.1), fallback para 'title' (coluna original)
    name:          row.name ?? row.title ?? "",
    description:   row.description ?? "",
    company_id:    row.company_id,
    // Prefere 'owner_id' (novo), fallback para 'responsible_id' (original)
    owner_id:      row.owner_id ?? row.responsible_id ?? null,
    status:        row.status ?? "planning",
    priority:      row.priority ?? "medium",
    progress:      row.progress ?? 0,
    budget:        row.budget != null ? Number(row.budget) : null,
    budget_used:   row.budget_used != null ? Number(row.budget_used) : null,
    start_date:    row.start_date ?? null,
    // Prefere 'due_date' (novo), fallback para 'end_date' (original)
    due_date:      row.due_date ?? row.end_date ?? null,
    tags:          Array.isArray(row.tags) ? row.tags : [],
    highlights:    Array.isArray(row.highlights) ? row.highlights : [],
    objectives:    row.objectives ?? null,
    metadata:      row.metadata ?? {},
    created_by:    row.created_by ?? null,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
    archived_at:   row.archived_at ?? null,
    deleted_at:    row.deleted_at ?? null,
    tasks_open:    row.tasks_open ?? 0,
    tasks_total:   row.tasks_total ?? 0,
    sessions_count: row.sessions_count ?? 0,
  }
}

export function mapTask(row: Row): ApiTask {
  return {
    id:           row.id,
    project_id:   row.project_id,
    company_id:   row.company_id ?? null,
    title:        row.title ?? "",
    description:  row.description ?? "",
    status:       row.status ?? "todo",
    priority:     row.priority ?? "media",
    assignee_id:  row.assignee_id ?? null,
    assignee_name: row.assignee_name ?? null,
    due_date:     row.due_date ?? null,
    completed_at: row.completed_at ?? null,
    created_by:   row.created_by ?? null,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
    archived:     row.archived ?? false,
  }
}

export function mapProjectFile(row: Row): ApiProjectFile {
  return {
    id:             row.id,
    project_id:     row.project_id,
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

export function buildProjectUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const u: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const v = String(body.name).trim()
    u.name  = v  // coluna nova
    u.title = v  // coluna original (mantém sincronizado)
  }
  if (body.description !== undefined) u.description = body.description
  if (body.status      !== undefined) u.status      = body.status
  if (body.priority    !== undefined) u.priority    = body.priority
  if (body.owner_id !== undefined) {
    u.owner_id      = body.owner_id  // coluna nova
    u.responsible_id = body.owner_id  // coluna original
  }
  if (body.start_date !== undefined) u.start_date = body.start_date
  if (body.due_date !== undefined) {
    u.due_date = body.due_date  // coluna nova
    u.end_date = body.due_date  // coluna original
  }
  if (body.budget      !== undefined) u.budget      = body.budget
  if (body.budget_used !== undefined) u.budget_used = body.budget_used
  if (body.objectives  !== undefined) u.objectives  = body.objectives
  if (body.highlights  !== undefined) u.highlights  = body.highlights
  if (body.tags        !== undefined) u.tags        = body.tags
  if (body.progress    !== undefined) u.progress    = body.progress
  if (body.metadata    !== undefined) u.metadata    = body.metadata
  return u
}

/** Recalcula tasks_open, tasks_total e progress no projeto a partir das tarefas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function refreshProjectCounts(admin: any, projectId: string): Promise<void> {
  try {
    const { data: tasks } = await admin
      .from("tasks")
      .select("status")
      .eq("project_id", projectId)
      .eq("archived", false)

    const total    = (tasks ?? []).length
    const done     = (tasks ?? []).filter((t: Row) => t.status === "done").length
    const open     = total - done
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    await admin.from("projects").update({ tasks_total: total, tasks_open: open, progress }).eq("id", projectId)
  } catch {
    // Non-critical — best effort
  }
}
