/**
 * Supabase client — Jarvis
 * Credenciais em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   ← público, vai ao browser
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...             ← server-side only, nunca expor
 */

import { createClient } from "@supabase/supabase-js"
import type {
  UUID,
  UserProfile,
  Company,
  AgentRow,
  AgentModelConfig,
  SessionRow,
  MessageRow,
  ProjectRow,
  TaskRow,
  SourceRow,
  SourceFile,
  KnowledgeChunk,
  WorkflowRow,
  WorkflowRun,
  SkillRow,
  ScheduleRow,
  WatcherRow,
  ApiConnection,
  ActivityLog,
  PaginatedResponse,
} from "./types"

// ─── Clients ─────────────────────────────────────────────────────────────────

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Cliente público — usar em Client Components e Server Components. Respeita RLS. */
export const supabase = createClient(supabaseUrl, supabaseAnon)

/** Cliente admin — usar APENAS em Route Handlers e Server Actions. Bypassa RLS. */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)

// ─── Helper ──────────────────────────────────────────────────────────────────

function assertData<T>(data: T | null, error: unknown, fn: string): T {
  if (error) throw new Error(`[supabase] ${fn}: ${String(error)}`)
  if (data == null) throw new Error(`[supabase] ${fn}: no data returned`)
  return data
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId: UUID): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  return assertData(data, error, "getProfile")
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: UUID }): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .single()
  return assertData(data, error, "upsertProfile")
}

// ─── Companies ───────────────────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name")
  return assertData(data, error, "getCompanies")
}

export async function updateCompany(id: UUID, patch: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  return assertData(data, error, "updateCompany")
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<AgentRow[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("name")
  return assertData(data, error, "getAgents")
}

export async function getAgentModelConfig(agentId: UUID): Promise<AgentModelConfig | null> {
  const { data, error } = await supabase
    .from("agent_model_configs")
    .select("*")
    .eq("agent_id", agentId)
    .single()
  if (error) return null
  return data
}

export async function upsertAgentModelConfig(config: Partial<AgentModelConfig> & { agent_id: UUID }): Promise<AgentModelConfig> {
  const { data, error } = await supabase
    .from("agent_model_configs")
    .upsert(config)
    .select()
    .single()
  return assertData(data, error, "upsertAgentModelConfig")
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions(userId: UUID): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
  return assertData(data, error, "getSessions")
}

export async function createSession(session: Omit<SessionRow, "id" | "created_at" | "message_count" | "last_message_at">): Promise<SessionRow> {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single()
  return assertData(data, error, "createSession")
}

export async function updateSession(id: UUID, patch: Partial<SessionRow>): Promise<SessionRow> {
  const { data, error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  return assertData(data, error, "updateSession")
}

export async function deleteSession(id: UUID): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id)
  if (error) throw new Error(`[supabase] deleteSession: ${error.message}`)
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(sessionId: UUID): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at")
  return assertData(data, error, "getMessages")
}

export async function insertMessage(message: Omit<MessageRow, "id" | "created_at">): Promise<MessageRow> {
  const { data, error } = await supabase
    .from("messages")
    .insert(message)
    .select()
    .single()
  return assertData(data, error, "insertMessage")
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
  return assertData(data, error, "getProjects")
}

export async function getProject(id: UUID): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()
  return assertData(data, error, "getProject")
}

export async function createProject(project: Omit<ProjectRow, "id" | "created_at" | "updated_at">): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single()
  return assertData(data, error, "createProject")
}

export async function updateProject(id: UUID, patch: Partial<ProjectRow>): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  return assertData(data, error, "updateProject")
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks(projectId?: UUID): Promise<TaskRow[]> {
  let q = supabase.from("tasks").select("*").order("position")
  if (projectId) q = q.eq("project_id", projectId)
  const { data, error } = await q
  return assertData(data, error, "getTasks")
}

export async function createTask(task: Omit<TaskRow, "id" | "created_at" | "updated_at">): Promise<TaskRow> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single()
  return assertData(data, error, "createTask")
}

export async function updateTask(id: UUID, patch: Partial<TaskRow>): Promise<TaskRow> {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  return assertData(data, error, "updateTask")
}

export async function deleteTask(id: UUID): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw new Error(`[supabase] deleteTask: ${error.message}`)
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function getSources(): Promise<SourceRow[]> {
  const { data, error } = await supabase.from("sources").select("*").order("name")
  return assertData(data, error, "getSources")
}

export async function upsertSource(source: Partial<SourceRow> & { id?: UUID }): Promise<SourceRow> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(source)
    .select()
    .single()
  return assertData(data, error, "upsertSource")
}

export async function getSourceFiles(sourceId: UUID): Promise<SourceFile[]> {
  const { data, error } = await supabase
    .from("source_files")
    .select("*")
    .eq("source_id", sourceId)
  return assertData(data, error, "getSourceFiles")
}

export async function searchKnowledge(query: string, sourceIds?: UUID[], limit = 10): Promise<KnowledgeChunk[]> {
  // Requer geração de embedding antes de chamar — use embedText(query) do conector OpenAI/Gemini
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: query,   // substitua por vetor real: await embedText(query)
    match_count:     limit,
    source_ids:      sourceIds ?? null,
  })
  return assertData(data, error, "searchKnowledge")
}

// ─── Workflows ───────────────────────────────────────────────────────────────

export async function getWorkflows(): Promise<WorkflowRow[]> {
  const { data, error } = await supabase.from("workflows").select("*").order("name")
  return assertData(data, error, "getWorkflows")
}

export async function createWorkflowRun(run: Omit<WorkflowRun, "id" | "created_at">): Promise<WorkflowRun> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert(run)
    .select()
    .single()
  return assertData(data, error, "createWorkflowRun")
}

export async function getWorkflowRuns(workflowId: UUID): Promise<WorkflowRun[]> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
  return assertData(data, error, "getWorkflowRuns")
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export async function getSkills(): Promise<SkillRow[]> {
  const { data, error } = await supabase.from("skills").select("*").order("name")
  return assertData(data, error, "getSkills")
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function getSchedules(): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("next_run_at")
  return assertData(data, error, "getSchedules")
}

export async function updateSchedule(id: UUID, patch: Partial<ScheduleRow>): Promise<ScheduleRow> {
  const { data, error } = await supabase
    .from("schedules")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  return assertData(data, error, "updateSchedule")
}

// ─── Watchers ────────────────────────────────────────────────────────────────

export async function getWatchers(): Promise<WatcherRow[]> {
  const { data, error } = await supabase.from("watchers").select("*").order("name")
  return assertData(data, error, "getWatchers")
}

// ─── API Connections ─────────────────────────────────────────────────────────

export async function getApiConnections(): Promise<Omit<ApiConnection, "config">[]> {
  const { data, error } = await supabase
    .from("api_connections")
    // never return config — it may contain keys
    .select("id, provider, name, status, last_tested_at, created_at, updated_at")
  return assertData(data, error, "getApiConnections") as Omit<ApiConnection, "config">[]
}

export async function upsertApiConnection(conn: Partial<ApiConnection> & { provider: string }): Promise<Omit<ApiConnection, "config">> {
  const { data, error } = await supabase
    .from("api_connections")
    .upsert(conn)
    .select("id, provider, name, status, last_tested_at, created_at, updated_at")
    .single()
  return assertData(data, error, "upsertApiConnection") as Omit<ApiConnection, "config">
}

// ─── Activity logs ───────────────────────────────────────────────────────────

export async function getLogs(limit = 50): Promise<PaginatedResponse<ActivityLog>> {
  const { data, error, count } = await supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit)
  const rows = assertData(data, error, "getLogs")
  return {
    data:     rows,
    count:    count ?? rows.length,
    page:     1,
    per_page: limit,
    has_more: (count ?? 0) > limit,
  }
}

export async function insertLog(log: Omit<ActivityLog, "id" | "created_at">): Promise<void> {
  const { error } = await supabase.from("activity_logs").insert(log)
  if (error) throw new Error(`[supabase] insertLog: ${error.message}`)
}
