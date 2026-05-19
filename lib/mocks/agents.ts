// TODO: substituir por consulta ao Supabase — tabela: agents, agent_prompts

import {
  Megaphone, TrendingUp, Video, MessageCircle,
  Rocket, HeadphonesIcon, LayoutList, Search, Globe,
} from "lucide-react"

export interface Agent {
  id: string
  name: string
  shortName: string
  description: string
  longDescription: string
  icon: React.ElementType
  color: string
  bg: string
  companies: string[]
  capabilities: string[]
  status: "active" | "paused"
  lastRun: string
  runs: number
}

export const agents: Agent[] = [
  {
    id: "marketing",
    name: "Agente de Marketing",
    shortName: "Marketing",
    description: "Cria campanhas, calendários, copies e estratégias.",
    longDescription: "Especialista em marketing digital, criação de campanhas, calendário editorial, copywriting e briefings para todas as marcas do Grupo Mota.",
    icon: Megaphone,
    color: "#16a34a",
    bg: "rgba(22,163,74,0.12)",
    companies: ["all"],
    capabilities: ["Campanhas", "Calendário", "Copy", "Briefing"],
    status: "active",
    lastRun: "14min",
    runs: 42,
  },
  {
    id: "traffic",
    name: "Agente de Tráfego Pago",
    shortName: "Tráfego Pago",
    description: "Analisa Meta Ads, Google Ads, GA4 e Reportei.",
    longDescription: "Analisa métricas de tráfego pago, CPL, CPC, CAC, ROAS e sugere otimizações para campanhas nas plataformas Meta Ads, Google Ads e GA4.",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    companies: ["all"],
    capabilities: ["Meta Ads", "Google Ads", "GA4", "Reportei", "CPL/ROI"],
    status: "active",
    lastRun: "1h",
    runs: 38,
  },
  {
    id: "content",
    name: "Agente de Conteúdo",
    shortName: "Conteúdo",
    description: "Cria Reels, Stories, carrosséis e roteiros.",
    longDescription: "Gera ideias e roteiros para Reels, Stories, carrosséis, legendas e vídeos. Adapta tom e linguagem para cada marca do grupo.",
    icon: Video,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    companies: ["all"],
    capabilities: ["Reels", "Stories", "Carrossel", "Legendas", "Roteiros"],
    status: "active",
    lastRun: "2h",
    runs: 31,
  },
  {
    id: "commercial",
    name: "Agente Comercial",
    shortName: "Comercial",
    description: "Scripts de WhatsApp, follow-up e quebra de objeções.",
    longDescription: "Cria scripts de abordagem, follow-up e quebra de objeções para WhatsApp. Classifica leads e sugere abordagens por perfil.",
    icon: MessageCircle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    companies: ["cppem", "unicive", "colegio"],
    capabilities: ["Scripts WA", "Follow-up", "Objeções", "Leads"],
    status: "active",
    lastRun: "3h",
    runs: 24,
  },
  {
    id: "launches",
    name: "Agente de Lançamentos",
    shortName: "Lançamentos",
    description: "Plano completo: oferta, cronograma, tráfego e WA.",
    longDescription: "Cria o plano completo de lançamento: oferta, cronograma, página de vendas, tráfego pago e sequências de WhatsApp.",
    icon: Rocket,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    companies: ["cppem", "unicive", "everton"],
    capabilities: ["Plano", "Cronograma", "Landing", "Tráfego", "WA"],
    status: "active",
    lastRun: "2 dias",
    runs: 16,
  },
  {
    id: "support",
    name: "Agente de Atendimento",
    shortName: "Atendimento",
    description: "FAQ, produtos, preços e respostas oficiais.",
    longDescription: "Consulta a base de conhecimento para responder dúvidas sobre produtos, preços, matrículas e atendimento ao aluno.",
    icon: HeadphonesIcon,
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    companies: ["all"],
    capabilities: ["FAQ", "Preços", "Matrículas", "Suporte"],
    status: "active",
    lastRun: "5h",
    runs: 14,
  },
  {
    id: "management",
    name: "Agente de Gestão",
    shortName: "Gestão",
    description: "Tarefas, reuniões, prioridades e planos semanais.",
    longDescription: "Organiza tarefas, pautas de reunião, prioridades e gera planos semanais para o time de marketing e gestão.",
    icon: LayoutList,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    companies: ["all"],
    capabilities: ["Tarefas", "Reuniões", "Prioridades", "OKRs"],
    status: "active",
    lastRun: "1h",
    runs: 19,
  },
  {
    id: "competitors",
    name: "Agente de Concorrentes",
    shortName: "Concorrentes",
    description: "Analisa concorrentes, anúncios e oportunidades.",
    longDescription: "Pesquisa e analisa concorrentes, posicionamento, anúncios ativos nas bibliotecas de anúncios e identifica oportunidades.",
    icon: Search,
    color: "#a3e635",
    bg: "rgba(163,230,53,0.12)",
    companies: ["cppem", "unicive"],
    capabilities: ["Análise", "Anúncios", "Posicionamento", "Tendências"],
    status: "active",
    lastRun: "3 dias",
    runs: 9,
  },
  {
    id: "landing",
    name: "Agente de Landing Page",
    shortName: "Landing Page",
    description: "Analisa páginas, copy, estrutura e conversão.",
    longDescription: "Audita landing pages, sugere melhorias em copy, CTA, estrutura de seções e otimizações de conversão.",
    icon: Globe,
    color: "#67e8f9",
    bg: "rgba(103,232,249,0.12)",
    companies: ["all"],
    capabilities: ["Auditoria", "Copy", "CTA", "Conversão"],
    status: "active",
    lastRun: "ontem",
    runs: 7,
  },
]

export const defaultAgent = agents[0]
