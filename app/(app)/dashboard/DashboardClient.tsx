"use client"

import { motion } from "framer-motion"
import {
  MessageSquare, GitBranch, CheckSquare,
  Bot, Activity, AlertCircle, ClipboardCheck,
  TrendingUp, Zap, ArrowUpRight, Plus, AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { PageHeader }           from "@/components/ui/PageHeader"
import { MetricCard }           from "@/components/dashboard/MetricCard"
import { DashboardCard }        from "@/components/dashboard/DashboardCard"
import { WeeklyActivityChart }  from "@/components/dashboard/WeeklyActivityChart"
import { AgentBarChart }        from "@/components/dashboard/AgentBarChart"
import { CompanyDonutChart }    from "@/components/dashboard/CompanyDonutChart"
import { RecentSessionsList }   from "@/components/dashboard/RecentSessionsList"
import { AlertsList }           from "@/components/dashboard/AlertsList"
import { PendingApprovals }     from "@/components/dashboard/PendingApprovals"
import { WorkflowActivity }     from "@/components/dashboard/WorkflowActivity"
import type { DashboardData }   from "./page"

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const quickActions = [
  { label: "Nova sessão",   icon: MessageSquare, href: "/chat",      color: "#16a34a" },
  { label: "Novo workflow", icon: GitBranch,     href: "/workflows", color: "#8b5cf6" },
  { label: "Ver agentes",  icon: Bot,           href: "/agents",    color: "#06b6d4" },
]

export function DashboardClient({ data }: { data: DashboardData }) {
  const metrics = [
    {
      id: "sessions", icon: MessageSquare,
      label: "Sessões hoje", value: String(data.sessionsToday),
      delta: "hoje", deltaPositive: true, sublabel: "",
      color: "#3b82f6", bg: "rgba(59,130,246,0.1)",
    },
    {
      id: "messages", icon: Activity,
      label: "Mensagens hoje", value: String(data.messagesToday),
      delta: "hoje", deltaPositive: true, sublabel: "",
      color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",
    },
    {
      id: "workflows", icon: GitBranch,
      label: "Workflows executados", value: String(data.workflowsToday),
      delta: "hoje", deltaPositive: true, sublabel: "",
      color: "#06b6d4", bg: "rgba(6,182,212,0.1)",
    },
    {
      id: "wf-errors", icon: AlertTriangle,
      label: "Erros de workflow", value: String(data.workflowErrors),
      delta: data.workflowErrors === 0 ? "tudo ok" : "hoje",
      deltaPositive: data.workflowErrors === 0,
      sublabel: "",
      color: data.workflowErrors === 0 ? "#16a34a" : "#ef4444",
      bg:    data.workflowErrors === 0 ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
    },
    {
      id: "tasks-new", icon: CheckSquare,
      label: "Tarefas criadas", value: String(data.tasksToday),
      delta: "hoje", deltaPositive: true, sublabel: "",
      color: "#f97316", bg: "rgba(249,115,22,0.1)",
    },
    {
      id: "tasks-done", icon: CheckSquare,
      label: "Tarefas concluídas", value: String(data.tasksDone),
      delta: "total", deltaPositive: true, sublabel: "",
      color: "#16a34a", bg: "rgba(22,163,74,0.1)",
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Dashboard"
        subtitle={data.todayLabel}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

          {/* Welcome row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between flex-wrap gap-3"
          >
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {data.greeting}, {data.userName}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Resumo operacional do Grupo Mota Educação — hoje.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {quickActions.map((q) => (
                <Link key={q.label} href={q.href}>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-all hover:border-mota-600/40 cursor-pointer"
                    style={{ borderColor: "var(--border-color)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                  >
                    <q.icon size={13} style={{ color: q.color }} />
                    <span className="hidden md:inline">{q.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {metrics.map((m, i) => (
              <MetricCard
                key={m.id}
                icon={m.icon}
                label={m.label}
                value={m.value}
                delta={m.delta}
                deltaPositive={m.deltaPositive}
                sublabel={m.sublabel}
                color={m.color}
                bg={m.bg}
                index={i}
              />
            ))}
          </div>

          {/* Row 1 — weekly chart + errors */}
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} className="xl:col-span-2">
              <DashboardCard
                title="Atividade semanal"
                subtitle="Sessões, workflows e tarefas — últimos 7 dias"
                icon={Activity}
                iconColor="#16a34a"
                action={
                  <span className="text-[11px] px-2 py-1 rounded-lg border"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                    7 dias
                  </span>
                }
              >
                <WeeklyActivityChart data={data.weeklyActivity} />
              </DashboardCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <DashboardCard
                title="Erros recentes"
                subtitle="Workflows com falha"
                icon={AlertCircle}
                iconColor="#f97316"
                action={
                  data.recentErrors.length > 0
                    ? <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                        {data.recentErrors.length}
                      </span>
                    : null
                }
              >
                <AlertsList errors={data.recentErrors} />
              </DashboardCard>
            </motion.div>
          </motion.div>

          {/* Row 2 — sessions + pending approvals */}
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} className="xl:col-span-2">
              <DashboardCard
                title="Sessões recentes"
                subtitle="Últimas conversas com a IA"
                icon={MessageSquare}
                iconColor="#16a34a"
                noPadding
                action={
                  <Link href="/chat">
                    <button className="flex items-center gap-1 text-xs transition-colors text-mota-500 hover:text-mota-400">
                      Ver todas <ArrowUpRight size={12} />
                    </button>
                  </Link>
                }
              >
                <RecentSessionsList sessions={data.recentSessions} />
              </DashboardCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <DashboardCard
                title="Aguardando aprovação"
                subtitle="Tarefas em waiting_approval"
                icon={ClipboardCheck}
                iconColor="#8b5cf6"
                action={
                  data.pendingTasks.length > 0
                    ? <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
                        {data.pendingTasks.length}
                      </span>
                    : null
                }
              >
                <PendingApprovals tasks={data.pendingTasks} />
              </DashboardCard>
            </motion.div>
          </motion.div>

          {/* Row 3 — bar chart + donut + workflow activity */}
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <motion.div variants={fadeUp}>
              <DashboardCard
                title="Agentes mais usados"
                subtitle="Últimos 30 dias"
                icon={Bot}
                iconColor="#06b6d4"
              >
                <AgentBarChart data={data.agentUsage} />
              </DashboardCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <DashboardCard
                title="Uso por empresa"
                subtitle="Distribuição de sessões (30d)"
                icon={TrendingUp}
                iconColor="#8b5cf6"
              >
                <CompanyDonutChart data={data.companyUsage} />
              </DashboardCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <DashboardCard
                title="Workflows ativos"
                subtitle="Por número de execuções"
                icon={Zap}
                iconColor="#f59e0b"
                action={
                  <Link href="/workflows">
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Plus size={14} />
                    </button>
                  </Link>
                }
              >
                <WorkflowActivity data={data.workflowActivity} />
              </DashboardCard>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
