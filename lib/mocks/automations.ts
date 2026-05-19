// TODO: substituir por consulta Supabase — tabelas: skills, schedules, watchers

export interface Skill {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  usageCount: number
  lastUsed: string
  status: "active" | "paused"
}

export interface Schedule {
  id: string
  name: string
  description: string
  frequency: string
  nextRun: string
  lastRun: string
  status: "active" | "paused"
  agent: string
  agentColor: string
  icon: string
}

export interface Watcher {
  id: string
  name: string
  description: string
  trigger: string
  action: string
  status: "active" | "paused"
  triggersCount: number
  lastTrigger: string
  icon: string
  color: string
}

export const skills: Skill[] = [
  {
    id: "sk1",
    name: "Criar copy de anúncio",
    description: "Gera variações de copies persuasivos para Meta Ads e Google Ads a partir de briefing.",
    icon: "Megaphone",
    color: "#16a34a",
    category: "Marketing",
    usageCount: 34,
    lastUsed: "hoje",
    status: "active",
  },
  {
    id: "sk2",
    name: "Resumir relatório de tráfego",
    description: "Analisa dados brutos de campanhas e gera um resumo executivo com insights.",
    icon: "BarChart3",
    color: "#3b82f6",
    category: "Tráfego",
    usageCount: 28,
    lastUsed: "ontem",
    status: "active",
  },
  {
    id: "sk3",
    name: "Gerar pauta de reunião",
    description: "Cria pauta estruturada e objetiva a partir de tópicos e metas informados.",
    icon: "ListChecks",
    color: "#06b6d4",
    category: "Gestão",
    usageCount: 19,
    lastUsed: "há 2 dias",
    status: "active",
  },
  {
    id: "sk4",
    name: "Criar legenda para post",
    description: "Gera legendas para feed e Reels com hashtags relevantes e CTA otimizado.",
    icon: "MessageCircle",
    color: "#8b5cf6",
    category: "Conteúdo",
    usageCount: 41,
    lastUsed: "hoje",
    status: "active",
  },
  {
    id: "sk5",
    name: "Análise de concorrente",
    description: "Estrutura a análise de posicionamento, anúncios e diferenciais de um concorrente.",
    icon: "Search",
    color: "#a3e635",
    category: "Pesquisa",
    usageCount: 11,
    lastUsed: "há 4 dias",
    status: "active",
  },
  {
    id: "sk6",
    name: "Quebra de objeção",
    description: "Gera respostas para as principais objeções de venda no comercial e WhatsApp.",
    icon: "MessageCircle",
    color: "#f59e0b",
    category: "Comercial",
    usageCount: 22,
    lastUsed: "há 1 dia",
    status: "active",
  },
  {
    id: "sk7",
    name: "Auditar landing page",
    description: "Analisa a LP e sugere melhorias em copy, CTA, estrutura e elementos de conversão.",
    icon: "Globe",
    color: "#67e8f9",
    category: "Conversão",
    usageCount: 8,
    lastUsed: "há 3 dias",
    status: "paused",
  },
  {
    id: "sk8",
    name: "Planejar lançamento",
    description: "Cria o esquema inicial de lançamento com cronograma, mecânica e canais de distribuição.",
    icon: "Rocket",
    color: "#ec4899",
    category: "Lançamentos",
    usageCount: 5,
    lastUsed: "há 1 semana",
    status: "active",
  },
]

export const schedules: Schedule[] = [
  {
    id: "sc1",
    name: "Relatório diário de tráfego",
    description: "Gera automaticamente o relatório consolidado das campanhas ativas todos os dias às 8h.",
    frequency: "Diário — 08:00",
    nextRun: "amanhã 08:00",
    lastRun: "hoje 08:00",
    status: "active",
    agent: "Agente de Tráfego",
    agentColor: "#3b82f6",
    icon: "BarChart3",
  },
  {
    id: "sc2",
    name: "Calendário editorial semanal",
    description: "Gera o calendário da próxima semana toda segunda-feira às 9h para revisão.",
    frequency: "Semanal — Segunda 09:00",
    nextRun: "11/05 09:00",
    lastRun: "04/05 09:00",
    status: "active",
    agent: "Agente de Conteúdo",
    agentColor: "#8b5cf6",
    icon: "Calendar",
  },
  {
    id: "sc3",
    name: "Consolidado mensal",
    description: "Relatório consolidado do mês anterior com todas as métricas, no 1º dia de cada mês.",
    frequency: "Mensal — Dia 1 às 07:00",
    nextRun: "01/06 07:00",
    lastRun: "01/05 07:00",
    status: "active",
    agent: "Agente de Tráfego",
    agentColor: "#3b82f6",
    icon: "BarChart3",
  },
  {
    id: "sc4",
    name: "Pauta semanal de gestão",
    description: "Gera a pauta da reunião de alinhamento de marketing toda sexta-feira às 17h.",
    frequency: "Semanal — Sexta 17:00",
    nextRun: "09/05 17:00",
    lastRun: "02/05 17:00",
    status: "paused",
    agent: "Agente de Gestão",
    agentColor: "#06b6d4",
    icon: "ListChecks",
  },
]

export const watchers: Watcher[] = [
  {
    id: "wt1",
    name: "CPL acima do limite",
    description: "Alerta quando o CPL de qualquer campanha ativa ultrapassar R$6,00 por lead.",
    trigger: "CPL > R$ 6,00",
    action: "Notificar gestor + gerar análise de otimização",
    status: "active",
    triggersCount: 3,
    lastTrigger: "há 2 dias",
    icon: "AlertTriangle",
    color: "#f97316",
  },
  {
    id: "wt2",
    name: "Nova mensagem sem resposta",
    description: "Monitora o RocketChat e alerta quando uma conversa ficou mais de 30 min sem resposta.",
    trigger: "Mensagem sem resposta > 30 min",
    action: "Enviar lembrete para o responsável",
    status: "active",
    triggersCount: 12,
    lastTrigger: "há 4h",
    icon: "MessageCircle",
    color: "#3b82f6",
  },
  {
    id: "wt3",
    name: "Orçamento diário esgotado",
    description: "Detecta campanhas que consumiram 100% do orçamento diário antes das 18h.",
    trigger: "Orçamento = 100% antes das 18h",
    action: "Alertar gestor de tráfego + pausar campanha",
    status: "active",
    triggersCount: 1,
    lastTrigger: "há 3 dias",
    icon: "Zap",
    color: "#f59e0b",
  },
  {
    id: "wt4",
    name: "Engajamento abaixo da média",
    description: "Monitora posts publicados e alerta quando engajamento está 40% abaixo da média.",
    trigger: "Engajamento < 60% da média histórica",
    action: "Notificar social media + sugerir boost",
    status: "paused",
    triggersCount: 0,
    lastTrigger: "nunca",
    icon: "TrendingDown",
    color: "#8b5cf6",
  },
]
