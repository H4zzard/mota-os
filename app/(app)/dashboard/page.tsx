import { redirect } from "next/navigation"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { DashboardClient }   from "./DashboardClient"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklyPoint       = { day: string; sessions: number; workflows: number; tasks: number }
export type AgentUsageItem    = { name: string; fullName: string; uses: number; color: string }
export type CompanyUsageItem  = { name: string; value: number; color: string }
export type RecentSessionItem = { id: string; title: string; agentName: string | null; agentColor: string | null; companyName: string; timeAgo: string }
export type WorkflowRunItem   = { name: string; slug: string; runs: number }
export type WorkflowErrorItem = { id: string; name: string; errorMessage: string; timeAgo: string }
export type PendingTaskItem   = { id: string; title: string; companyId: string | null; companyName: string; priority: string; timeAgo: string }

export type DashboardData = {
  userName:    string
  greeting:    string
  todayLabel:  string
  sessionsToday:   number
  messagesToday:   number
  workflowsToday:  number
  workflowErrors:  number
  tasksToday:      number
  tasksDone:       number
  weeklyActivity:  WeeklyPoint[]
  agentUsage:      AgentUsageItem[]
  companyUsage:    CompanyUsageItem[]
  recentSessions:  RecentSessionItem[]
  workflowActivity: WorkflowRunItem[]
  recentErrors:    WorkflowErrorItem[]
  pendingTasks:    PendingTaskItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_DISPLAY: Record<string, { name: string; color: string }> = {
  cppem:   { name: "CPPEM Concursos", color: "#16a34a" },
  unicive:  { name: "Unicive",         color: "#3b82f6" },
  colegio:  { name: "Colégio CPPEM",   color: "#8b5cf6" },
  everton:  { name: "Everton Mota",    color: "#f97316" },
  grupo:    { name: "Grupo Mota",      color: "#06b6d4" },
}

function companyDisplay(slug: string | null): { name: string; color: string } {
  return COMPANY_DISPLAY[slug ?? ""] ?? { name: slug ?? "—", color: "#94a3b8" }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "ontem" : `há ${days}d`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  })
}

function buildWeekly(
  sessions:  { created_at: string }[],
  workflows: { created_at: string }[],
  tasks:     { created_at: string }[],
): WeeklyPoint[] {
  const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const prefix = d.toISOString().slice(0, 10)
    return {
      day:       i === 6 ? "Hoje" : DAY_NAMES[d.getDay()],
      sessions:  sessions.filter(r => r.created_at.startsWith(prefix)).length,
      workflows: workflows.filter(r => r.created_at.startsWith(prefix)).length,
      tasks:     tasks.filter(r => r.created_at.startsWith(prefix)).length,
    }
  })
}

function buildAgentUsage(
  sessionRows: { agent_id: string | null }[],
  agentRows:   { id: string; short_name: string; name: string; color: string }[],
): AgentUsageItem[] {
  const counts: Record<string, number> = {}
  for (const s of sessionRows) {
    if (s.agent_id) counts[s.agent_id] = (counts[s.agent_id] ?? 0) + 1
  }
  return agentRows
    .map(a => ({ name: a.short_name, fullName: a.name, uses: counts[a.id] ?? 0, color: a.color }))
    .filter(a => a.uses > 0)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 7)
}

function buildCompanyUsage(sessionRows: { company_id: string | null }[]): CompanyUsageItem[] {
  const total = sessionRows.length
  if (total === 0) return []
  const counts: Record<string, number> = {}
  for (const s of sessionRows) {
    const k = s.company_id ?? "grupo"
    counts[k] = (counts[k] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([k, n]) => ({
      name:  companyDisplay(k).name,
      value: Math.round((n / total) * 100),
      color: companyDisplay(k).color,
    }))
    .sort((a, b) => b.value - a.value)
}

function buildWorkflowActivity(runs: { workflow_slug: string | null; workflow_name: string | null }[]): WorkflowRunItem[] {
  const map: Record<string, { name: string; runs: number }> = {}
  for (const r of runs) {
    const key  = r.workflow_slug ?? "unknown"
    const name = r.workflow_name ?? key.replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    if (!map[key]) map[key] = { name, runs: 0 }
    map[key].runs++
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b.runs - a.runs)
    .slice(0, 5)
    .map(([slug, { name, runs }]) => ({ slug, name, runs }))
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Time boundaries
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO       = todayStart.toISOString()
  const sevenDaysAgo   = new Date(todayStart); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenDaysISO   = sevenDaysAgo.toISOString()
  const thirtyDaysAgo  = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysISO  = thirtyDaysAgo.toISOString()

  // ── Parallel queries ────────────────────────────────────────────────────────
  const [
    { count: sessionsToday },
    { count: messagesToday },
    { count: workflowsToday },
    { count: workflowErrors },
    { count: tasksToday },
    { count: tasksDone },
    { data: weeklySess },
    { data: weeklyWf },
    { data: weeklyTasks },
    { data: agentRows },
    { data: sessAgents },
    { data: sessCompanies },
    { data: recentSessRaw },
    { data: wfRunsAll },
    { data: errorsRaw },
    { data: pendingRaw },
    { data: profile },
  ] = await Promise.all([
    admin.from("sessions")      .select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    admin.from("messages")      .select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    admin.from("workflow_runs") .select("*", { count: "exact", head: true }).gte("created_at", todayISO).eq("status", "done"),
    admin.from("workflow_runs") .select("*", { count: "exact", head: true }).gte("created_at", todayISO).eq("status", "error"),
    admin.from("tasks")         .select("*", { count: "exact", head: true }).gte("created_at", todayISO).eq("archived", false),
    admin.from("tasks")         .select("*", { count: "exact", head: true }).eq("status", "done").eq("archived", false),
    admin.from("sessions")      .select("created_at").gte("created_at", sevenDaysISO),
    admin.from("workflow_runs") .select("created_at").gte("created_at", sevenDaysISO).eq("status", "done"),
    admin.from("tasks")         .select("created_at").gte("created_at", sevenDaysISO).eq("archived", false),
    admin.from("agents")        .select("id, short_name, name, color"),
    admin.from("sessions")      .select("agent_id").gte("created_at", thirtyDaysISO).not("agent_id", "is", null),
    admin.from("sessions")      .select("company_id").gte("created_at", thirtyDaysISO),
    admin.from("sessions")      .select("id, title, company_id, last_message_at, created_at, agent_id").order("last_message_at", { ascending: false }).limit(6),
    admin.from("workflow_runs") .select("workflow_slug, workflow_name").eq("status", "done"),
    admin.from("workflow_runs") .select("id, workflow_name, workflow_slug, error_message, created_at").eq("status", "error").order("created_at", { ascending: false }).limit(5),
    admin.from("tasks")         .select("id, title, company_id, priority, created_at").eq("status", "waiting_approval").eq("archived", false).order("created_at", { ascending: false }).limit(5),
    admin.from("profiles")      .select("name").eq("id", user.id).single(),
  ])

  // ── Build agent map for recent sessions ──────────────────────────────────
  const agentMap: Record<string, { short_name: string; color: string }> = {}
  for (const a of agentRows ?? []) agentMap[a.id] = { short_name: a.short_name, color: a.color }

  // ── Transform ─────────────────────────────────────────────────────────────
  const data: DashboardData = {
    userName:   (profile as { name?: string } | null)?.name ?? user.email?.split("@")[0] ?? "usuário",
    greeting:   greeting(),
    todayLabel: todayLabel(),

    sessionsToday:  sessionsToday  ?? 0,
    messagesToday:  messagesToday  ?? 0,
    workflowsToday: workflowsToday ?? 0,
    workflowErrors: workflowErrors ?? 0,
    tasksToday:     tasksToday     ?? 0,
    tasksDone:      tasksDone      ?? 0,

    weeklyActivity:   buildWeekly(weeklySess ?? [], weeklyWf ?? [], weeklyTasks ?? []),
    agentUsage:       buildAgentUsage(sessAgents ?? [], agentRows ?? []),
    companyUsage:     buildCompanyUsage(sessCompanies ?? []),

    recentSessions: (recentSessRaw ?? []).map(s => ({
      id:         s.id,
      title:      s.title,
      agentName:  s.agent_id ? (agentMap[s.agent_id]?.short_name ?? null) : null,
      agentColor: s.agent_id ? (agentMap[s.agent_id]?.color      ?? null) : null,
      companyName: companyDisplay(s.company_id).name,
      timeAgo:    timeAgo(s.last_message_at ?? s.created_at),
    })),

    workflowActivity: buildWorkflowActivity(wfRunsAll ?? []),

    recentErrors: (errorsRaw ?? []).map(e => ({
      id:           e.id,
      name:         (e as { workflow_name?: string | null }).workflow_name
                    ?? ((e as { workflow_slug?: string | null }).workflow_slug ?? "Workflow")
                       .replace(/[-_]/g, " ")
                       .replace(/\b\w/g, (l: string) => l.toUpperCase()),
      errorMessage: (e as { error_message?: string | null }).error_message ?? "Erro desconhecido",
      timeAgo:      timeAgo(e.created_at),
    })),

    pendingTasks: (pendingRaw ?? []).map(t => ({
      id:          t.id,
      title:       t.title,
      companyId:   t.company_id ?? null,
      companyName: companyDisplay(t.company_id ?? null).name,
      priority:    t.priority,
      timeAgo:     timeAgo(t.created_at),
    })),
  }

  return <DashboardClient data={data} />
}
