// TODO: substituir por consulta real ao Supabase — tabelas: sessions, messages, agents

export type SessionStatus = "active" | "done" | "archived"

export interface Session {
  id: string
  title: string
  agentName: string
  agentColor: string
  company: string
  companyShort: string
  lastMessage: string
  time: string
  date: "today" | "yesterday" | string
  status: SessionStatus
  starred: boolean
  tags: string[]
  messageCount: number
}

export const sessions: Session[] = [
  // Hoje
  {
    id: "s1",
    title: "Criar campanha para Intensivão PMPE",
    agentName: "Marketing",
    agentColor: "#16a34a",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    lastMessage: "A campanha foi estruturada com 3 conjuntos de anúncios...",
    time: "14min",
    date: "today",
    status: "active",
    starred: true,
    tags: ["campanha", "pmpe"],
    messageCount: 12,
  },
  {
    id: "s2",
    title: "Otimizar funil da Unicive EAD",
    agentName: "Tráfego Pago",
    agentColor: "#3b82f6",
    company: "Unicive",
    companyShort: "Unicive",
    lastMessage: "O CPL atual de R$ 28 pode ser reduzido com...",
    time: "1h",
    date: "today",
    status: "done",
    starred: false,
    tags: ["unicive", "funil"],
    messageCount: 8,
  },
  {
    id: "s3",
    title: "Organizar tarefas do time de marketing",
    agentName: "Gestão",
    agentColor: "#06b6d4",
    company: "Grupo Mota",
    companyShort: "Grupo",
    lastMessage: "Criei uma lista priorizada com 7 tarefas para...",
    time: "2h",
    date: "today",
    status: "done",
    starred: false,
    tags: ["tarefas", "marketing"],
    messageCount: 5,
  },
  {
    id: "s4",
    title: "Analisar relatório de tráfego semana 18",
    agentName: "Tráfego Pago",
    agentColor: "#3b82f6",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    lastMessage: "Análise completa: CPL médio R$ 3,80, 420 leads...",
    time: "3h",
    date: "today",
    status: "done",
    starred: true,
    tags: ["relatório", "tráfego"],
    messageCount: 15,
  },
  // Ontem
  {
    id: "s5",
    title: "Report D-1 Lançamento IA Concursos",
    agentName: "Tráfego Pago",
    agentColor: "#3b82f6",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    lastMessage: "Resultado do dia: 138 leads, ROAS 3.2x, CPA...",
    time: "ontem",
    date: "yesterday",
    status: "done",
    starred: false,
    tags: ["lançamento", "report"],
    messageCount: 9,
  },
  {
    id: "s6",
    title: "Criar calendário Colégio CPPEM — Junho",
    agentName: "Conteúdo",
    agentColor: "#8b5cf6",
    company: "Colégio CPPEM",
    companyShort: "Colégio",
    lastMessage: "Calendário de junho com 22 posts planejados...",
    time: "ontem",
    date: "yesterday",
    status: "done",
    starred: false,
    tags: ["calendário", "conteúdo"],
    messageCount: 11,
  },
  {
    id: "s7",
    title: "Scripts WhatsApp Mentoria Policial",
    agentName: "Comercial",
    agentColor: "#f59e0b",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    lastMessage: "5 scripts criados: abordagem fria, follow-up...",
    time: "ontem",
    date: "yesterday",
    status: "done",
    starred: true,
    tags: ["whatsapp", "scripts"],
    messageCount: 7,
  },
  {
    id: "s8",
    title: "Otimizar landing page Unicive Tecnologia",
    agentName: "Landing Page",
    agentColor: "#67e8f9",
    company: "Unicive",
    companyShort: "Unicive",
    lastMessage: "Identifiquei 6 pontos de melhoria na hero section...",
    time: "ontem",
    date: "yesterday",
    status: "done",
    starred: false,
    tags: ["landing", "unicive"],
    messageCount: 13,
  },
  // Esta semana
  {
    id: "s9",
    title: "Plano de lançamento Everton Mota — Julho",
    agentName: "Lançamentos",
    agentColor: "#ec4899",
    company: "Everton Mota",
    companyShort: "Everton",
    lastMessage: "Cronograma completo de 30 dias para o lançamento...",
    time: "2 dias",
    date: "2026-05-05",
    status: "done",
    starred: true,
    tags: ["lançamento", "everton"],
    messageCount: 22,
  },
  {
    id: "s10",
    title: "Análise de concorrentes — Preparatórios Policiais",
    agentName: "Concorrentes",
    agentColor: "#a3e635",
    company: "CPPEM Concursos",
    companyShort: "CPPEM",
    lastMessage: "Mapeei 8 concorrentes diretos com análise de...",
    time: "3 dias",
    date: "2026-05-04",
    status: "done",
    starred: false,
    tags: ["concorrentes", "pesquisa"],
    messageCount: 18,
  },
]
