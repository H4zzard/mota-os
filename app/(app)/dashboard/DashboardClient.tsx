"use client"

// Arquivo mantido para compatibilidade — lógica migrada para page.tsx (M.1).
// Não é importado por nenhum componente ativo.

export type WeeklyPoint       = { day: string; sessions: number; workflows: number }
export type AgentUsageItem    = { name: string; fullName: string; uses: number; color: string }
export type CompanyUsageItem  = { name: string; value: number; color: string }
export type RecentSessionItem = { id: string; title: string; agentName: string | null; agentColor: string | null; companyName: string; timeAgo: string }
export type WorkflowRunItem   = { name: string; slug: string; runs: number }
export type WorkflowErrorItem = { id: string; name: string; errorMessage: string; timeAgo: string }

export type DashboardData = {
  userName:         string
  greeting:         string
  todayLabel:       string
  sessionsToday:    number
  messagesToday:    number
  workflowsToday:   number
  workflowErrors:   number
  weeklyActivity:   WeeklyPoint[]
  agentUsage:       AgentUsageItem[]
  companyUsage:     CompanyUsageItem[]
  recentSessions:   RecentSessionItem[]
  workflowActivity: WorkflowRunItem[]
  recentErrors:     WorkflowErrorItem[]
}

export function DashboardClient(_props: { data: DashboardData }) {
  return null
}
