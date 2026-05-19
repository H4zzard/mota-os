// TODO: substituir por consulta real ao Supabase

export const weeklyActivity = [
  { day: "Seg", sessions: 18, workflows: 8, tasks: 24 },
  { day: "Ter", sessions: 24, workflows: 11, tasks: 31 },
  { day: "Qua", sessions: 31, workflows: 14, tasks: 42 },
  { day: "Qui", sessions: 28, workflows: 14, tasks: 39 },
  { day: "Sex", sessions: 22, workflows: 10, tasks: 28 },
  { day: "Sáb", sessions: 8, workflows: 3, tasks: 12 },
  { day: "Dom", sessions: 4, workflows: 1, tasks: 6 },
]

export const agentUsage = [
  { name: "Marketing", fullName: "Agente de Marketing", uses: 42, color: "#16a34a" },
  { name: "Tráfego Pago", fullName: "Agente de Tráfego Pago", uses: 38, color: "#3b82f6" },
  { name: "Conteúdo", fullName: "Agente de Conteúdo", uses: 31, color: "#8b5cf6" },
  { name: "Comercial", fullName: "Agente Comercial", uses: 24, color: "#f59e0b" },
  { name: "Gestão", fullName: "Agente de Gestão", uses: 19, color: "#06b6d4" },
  { name: "Lançamentos", fullName: "Agente de Lançamentos", uses: 16, color: "#ec4899" },
  { name: "Atendimento", fullName: "Agente de Atendimento", uses: 14, color: "#f97316" },
  { name: "Concorrentes", fullName: "Agente de Concorrentes", uses: 9, color: "#a3e635" },
  { name: "Landing Page", fullName: "Agente de Landing Page", uses: 7, color: "#67e8f9" },
]

export const companyUsage = [
  { name: "CPPEM Concursos", value: 42, color: "#16a34a" },
  { name: "Unicive", value: 28, color: "#3b82f6" },
  { name: "Colégio CPPEM", value: 15, color: "#8b5cf6" },
  { name: "Everton Mota", value: 10, color: "#f59e0b" },
  { name: "Grupo Mota", value: 5, color: "#06b6d4" },
]

export const metrics = [
  {
    id: "sessions",
    label: "Sessões hoje",
    value: 28,
    display: "28",
    delta: "+12%",
    deltaPositive: true,
    sublabel: "vs ontem",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
  },
  {
    id: "workflows",
    label: "Workflows executados",
    value: 14,
    display: "14",
    delta: "+5",
    deltaPositive: true,
    sublabel: "hoje",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
  {
    id: "tasks",
    label: "Tarefas criadas",
    value: 39,
    display: "39",
    delta: "+18",
    deltaPositive: true,
    sublabel: "hoje",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
  },
  {
    id: "campaigns",
    label: "Campanhas analisadas",
    value: 8,
    display: "8",
    delta: "+3",
    deltaPositive: true,
    sublabel: "esta semana",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.1)",
  },
  {
    id: "agents",
    label: "Agentes ativos",
    value: 9,
    display: "9/9",
    delta: "100%",
    deltaPositive: true,
    sublabel: "disponíveis",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
  },
  {
    id: "time",
    label: "Horas economizadas",
    value: 18,
    display: "18h",
    delta: "+4h",
    deltaPositive: true,
    sublabel: "esta semana",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.1)",
  },
]

export const recentSessions = [
  {
    id: "1",
    title: "Criar campanha para Intensivão PMPE",
    agent: "Marketing",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    time: "14min",
    status: "active",
  },
  {
    id: "2",
    title: "Otimizar funil da Unicive EAD",
    agent: "Tráfego Pago",
    company: "Unicive",
    companyShort: "Unicive",
    time: "1h",
    status: "done",
  },
  {
    id: "3",
    title: "Organizar tarefas do time de marketing",
    agent: "Gestão",
    company: "Grupo Mota",
    companyShort: "Grupo",
    time: "2h",
    status: "done",
  },
  {
    id: "4",
    title: "Analisar relatório de tráfego — semana 18",
    agent: "Tráfego Pago",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    time: "3h",
    status: "done",
  },
  {
    id: "5",
    title: "Criar calendário de conteúdo — Colégio CPPEM",
    agent: "Conteúdo",
    company: "Colégio CPPEM",
    companyShort: "Colégio",
    time: "ontem",
    status: "done",
  },
  {
    id: "6",
    title: "Scripts de WhatsApp para Mentoria Policial",
    agent: "Comercial",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    time: "ontem",
    status: "done",
  },
]

export const alerts = [
  {
    id: "1",
    type: "warning" as const,
    title: "CPL acima do esperado",
    text: "Campanha Intensivão PMPE — Meta Ads está com CPL R$ 4,20 (meta: R$ 3,00)",
    time: "há 20min",
  },
  {
    id: "2",
    type: "info" as const,
    title: "Workflow agendado",
    text: "Relatório Diário — Geração automática programada para 13h00",
    time: "há 1h",
  },
  {
    id: "3",
    type: "success" as const,
    title: "Tarefas aprovadas",
    text: "3 tarefas do Comercial foram aprovadas e enviadas para o Rocket.Chat",
    time: "há 2h",
  },
  {
    id: "4",
    type: "warning" as const,
    title: "Fonte desconectada",
    text: "Relatórios Reportei — última sincronização há 3 dias",
    time: "há 3h",
  },
]

export const pendingApprovals = [
  {
    id: "1",
    title: "Briefing: Campanha Google Ads PMPE",
    requestedBy: "Agente de Marketing",
    company: "CPPEM",
    priority: "high" as const,
    time: "há 30min",
  },
  {
    id: "2",
    title: "Script WhatsApp — Unicive Captação 2026",
    requestedBy: "Agente Comercial",
    company: "Unicive",
    priority: "medium" as const,
    time: "há 1h",
  },
  {
    id: "3",
    title: "Calendário de conteúdo — Junho Colégio",
    requestedBy: "Agente de Conteúdo",
    company: "Colégio",
    priority: "low" as const,
    time: "há 2h",
  },
]

export const workflowActivity = [
  { name: "Criar campanha de leads", runs: 8, status: "active" },
  { name: "Gerar relatório diário", runs: 14, status: "active" },
  { name: "Planejar conteúdo semanal", runs: 6, status: "active" },
  { name: "Criar briefing para designer", runs: 4, status: "paused" },
  { name: "Analisar campanha Meta Ads", runs: 11, status: "active" },
]
