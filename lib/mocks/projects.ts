// TODO: substituir por consulta Supabase — tabelas: projects, project_sessions, tasks

export type ProjectStatus = "active" | "paused" | "completed" | "planning"

export interface Project {
  id: string
  title: string
  description: string
  company: string
  companyColor: string
  responsible: string
  responsibleAvatar: string
  status: ProjectStatus
  sessionsCount: number
  tasksOpen: number
  tasksTotal: number
  lastUpdated: string
  tags: string[]
  startDate: string
  endDate?: string
  progress: number
  objective: string
  budget?: string
  highlights: string[]
}

export const projects: Project[] = [
  {
    id: "p1",
    title: "Lançamento Intensivão PMPE 2026",
    description: "Campanha completa de captação para o Intensivão PMPE com foco em leads para WhatsApp via Meta Ads e Google Ads.",
    company: "CPPEM Concursos",
    companyColor: "#16a34a",
    responsible: "Alexandre",
    responsibleAvatar: "A",
    status: "active",
    sessionsCount: 18,
    tasksOpen: 7,
    tasksTotal: 24,
    lastUpdated: "há 14min",
    tags: ["Meta Ads", "Leads", "PMPE", "Urgente"],
    startDate: "01/05/2026",
    endDate: "30/06/2026",
    progress: 42,
    objective: "Captar 800 leads qualificados para o Intensivão PMPE 2026 com CPL ≤ R$ 4,00.",
    budget: "R$ 12.000",
    highlights: [
      "Campanha Meta Ads ativa — 320 leads até agora",
      "3 criativos em aprovação com o designer",
      "Landing page com 4,2% de conversão",
      "CPL atual: R$ 3,80 (dentro da meta)",
    ],
  },
  {
    id: "p2",
    title: "Captação Unicive EAD 2026",
    description: "Estratégia integrada de captação para novos alunos EAD com foco em tecnólogos e público concurseiro.",
    company: "Unicive",
    companyColor: "#3b82f6",
    responsible: "Itallo Mota",
    responsibleAvatar: "I",
    status: "active",
    sessionsCount: 12,
    tasksOpen: 5,
    tasksTotal: 18,
    lastUpdated: "há 1h",
    tags: ["EAD", "Google Ads", "Captação"],
    startDate: "15/04/2026",
    endDate: "31/07/2026",
    progress: 35,
    objective: "Captação de 200 novos alunos no semestre 2026.2 com CAC ≤ R$ 180.",
    budget: "R$ 18.000",
    highlights: [
      "CPL em R$ 28 — meta é R$ 18 (em otimização)",
      "Público EAD Tech com melhor performance",
      "Landing page sendo atualizada com depoimentos",
      "Campanha YouTube sendo testada esta semana",
    ],
  },
  {
    id: "p3",
    title: "Matrículas Colégio CPPEM 2026",
    description: "Comunicação institucional e captação de matrículas para o ano letivo 2026.",
    company: "Colégio CPPEM",
    companyColor: "#f59e0b",
    responsible: "Social Media 1",
    responsibleAvatar: "S",
    status: "active",
    sessionsCount: 8,
    tasksOpen: 3,
    tasksTotal: 12,
    lastUpdated: "ontem",
    tags: ["Matrículas", "Institucional", "Pais"],
    startDate: "01/03/2026",
    endDate: "30/06/2026",
    progress: 68,
    objective: "Comunicação institucional para pais e captação de 80 novas matrículas para 2026.",
    budget: "R$ 6.000",
    highlights: [
      "42 matrículas confirmadas (meta: 80)",
      "Calendário de conteúdo maio em andamento",
      "Evento open house planejado para junho",
      "WhatsApp Business configurado e ativo",
    ],
  },
  {
    id: "p4",
    title: "Posicionamento Everton Mota",
    description: "Fortalecimento da marca pessoal do professor Everton Mota como referência em carreiras policiais.",
    company: "Everton Mota",
    companyColor: "#ec4899",
    responsible: "Alexandre",
    responsibleAvatar: "A",
    status: "planning",
    sessionsCount: 9,
    tasksOpen: 11,
    tasksTotal: 15,
    lastUpdated: "2 dias",
    tags: ["Marca Pessoal", "Conteúdo", "Autoridade"],
    startDate: "01/06/2026",
    progress: 15,
    objective: "Posicionar Everton Mota como maior referência em preparação para PMPE no Nordeste.",
    highlights: [
      "Estratégia de conteúdo em elaboração",
      "Identidade visual sendo revisada",
      "Planejamento de lançamento em julho",
      "Parceria com canal YouTube em negociação",
    ],
  },
  {
    id: "p5",
    title: "Campanhas Polícia Penal PE",
    description: "Campanha de leads para o concurso da Polícia Penal de Pernambuco com foco em aprovação rápida.",
    company: "CPPEM Concursos",
    companyColor: "#16a34a",
    responsible: "Gestor Tráfego",
    responsibleAvatar: "G",
    status: "paused",
    sessionsCount: 6,
    tasksOpen: 2,
    tasksTotal: 9,
    lastUpdated: "3 dias",
    tags: ["Polícia Penal", "Concurso", "Meta Ads"],
    startDate: "10/04/2026",
    progress: 55,
    objective: "Captação de leads para o curso preparatório de Polícia Penal PE com CPL ≤ R$ 3,50.",
    budget: "R$ 5.000",
    highlights: [
      "Campanha pausada aguardando edital oficial",
      "Base de leads: 218 contatos qualificados",
      "Criativos aprovados e prontos para subir",
      "Retomada estimada para quando edital sair",
    ],
  },
  {
    id: "p6",
    title: "Relatórios Semanais Grupo Mota",
    description: "Estrutura de relatórios automatizados com dados de todas as empresas do grupo.",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    responsible: "Itallo Mota",
    responsibleAvatar: "I",
    status: "completed",
    sessionsCount: 14,
    tasksOpen: 0,
    tasksTotal: 8,
    lastUpdated: "1 semana",
    tags: ["Automação", "Relatórios", "BI"],
    startDate: "01/02/2026",
    endDate: "30/04/2026",
    progress: 100,
    objective: "Criar estrutura de relatórios semanais automáticos para toda a holding.",
    highlights: [
      "Dashboard semanal ativo para todas as marcas",
      "Integração Reportei + GA4 concluída",
      "Envio automático toda sexta às 12h via Rocket.Chat",
      "Documentação do processo entregue",
    ],
  },
]
