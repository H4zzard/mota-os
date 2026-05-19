// TODO: substituir por consulta Supabase — tabelas: workflows, workflow_runs

export interface WorkflowField {
  id: string
  label: string
  type: "text" | "select" | "textarea" | "number" | "multiselect"
  placeholder?: string
  options?: string[]
  required?: boolean
}

export interface WorkflowStep {
  title: string
  description: string
  fields: WorkflowField[]
}

export interface Workflow {
  id: string
  name: string
  description: string
  area: string
  areaColor: string
  estimatedMinutes: number
  stepsCount: number
  status: "active" | "paused"
  lastRun: string
  runs: number
  icon: string
  steps: WorkflowStep[]
}

export const workflows: Workflow[] = [
  {
    id: "wf1",
    name: "Criar campanha de leads",
    description: "Estrutura completa de campanha: objetivo, público, criativos, landing page e configurações de anúncio.",
    area: "Marketing",
    areaColor: "#16a34a",
    estimatedMinutes: 8,
    stepsCount: 4,
    status: "active",
    lastRun: "há 2h",
    runs: 14,
    icon: "Megaphone",
    steps: [
      {
        title: "Produto e objetivo",
        description: "Defina a empresa, produto e o objetivo principal da campanha.",
        fields: [
          { id: "empresa",  label: "Empresa",   type: "select",  required: true,
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM", "Everton Mota"] },
          { id: "produto",  label: "Produto / Oferta", type: "text", required: true,
            placeholder: "Ex: Intensivão PMPE 2026" },
          { id: "objetivo", label: "Objetivo principal", type: "select", required: true,
            options: ["Geração de leads (WhatsApp)", "Vendas diretas", "Reconhecimento de marca", "Tráfego para site"] },
          { id: "periodo",  label: "Período da campanha", type: "text",
            placeholder: "Ex: 4 semanas" },
        ],
      },
      {
        title: "Público e orçamento",
        description: "Configure o público-alvo, a oferta principal e o orçamento disponível.",
        fields: [
          { id: "publico",    label: "Público-alvo",      type: "textarea", required: true,
            placeholder: "Ex: Homens 20-35 anos, Pernambuco, interesse em concurso público..." },
          { id: "oferta",     label: "Oferta / CTA",      type: "text", required: true,
            placeholder: "Ex: Garanta sua vaga no Intensivão PMPE" },
          { id: "orcamento",  label: "Orçamento semanal (R$)", type: "number", required: true,
            placeholder: "3000" },
          { id: "canal",      label: "Canal principal",   type: "select", required: true,
            options: ["Meta Ads", "Google Ads", "Meta + Google", "YouTube Ads", "TikTok Ads"] },
        ],
      },
      {
        title: "Criativos e destino",
        description: "Informe os criativos disponíveis e a página de destino.",
        fields: [
          { id: "criativos",  label: "Criativos disponíveis", type: "multiselect",
            options: ["Vídeo 30s", "Vídeo 15s", "Imagem feed 1:1", "Imagem story 9:16", "Carrossel", "GIF"] },
          { id: "landing",    label: "Página de destino",     type: "select",
            options: ["Landing page própria", "Lead Form nativo (Meta)", "WhatsApp direto", "Página de vendas"] },
          { id: "cpl_meta",   label: "CPL máximo aceitável (R$)", type: "number",
            placeholder: "4.00" },
          { id: "obs",        label: "Observações adicionais", type: "textarea",
            placeholder: "Contexto extra, restrições, aprovações necessárias..." },
        ],
      },
      {
        title: "Revisão e aprovação",
        description: "Revise a estrutura gerada pela IA antes de aprovar.",
        fields: [],
      },
    ],
  },
  {
    id: "wf2",
    name: "Gerar relatório diário",
    description: "Relatório consolidado de tráfego pago com métricas de todas as campanhas ativas.",
    area: "Tráfego Pago",
    areaColor: "#3b82f6",
    estimatedMinutes: 3,
    stepsCount: 2,
    status: "active",
    lastRun: "hoje 13h",
    runs: 28,
    icon: "BarChart3",
    steps: [
      {
        title: "Configurar relatório",
        description: "Escolha as empresas e período.",
        fields: [
          { id: "empresas", label: "Empresas", type: "multiselect",
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM", "Everton Mota", "Todas"],
            required: true },
          { id: "periodo",  label: "Período", type: "select", required: true,
            options: ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Personalizado"] },
          { id: "canais",   label: "Canais", type: "multiselect",
            options: ["Meta Ads", "Google Ads", "GA4", "Orgânico", "Todos"] },
        ],
      },
      { title: "Revisão e envio", description: "Revise e escolha onde enviar.", fields: [] },
    ],
  },
  {
    id: "wf3",
    name: "Planejar conteúdo semanal",
    description: "Calendário editorial semanal com ideias de posts, Reels e Stories por empresa.",
    area: "Conteúdo",
    areaColor: "#8b5cf6",
    estimatedMinutes: 6,
    stepsCount: 3,
    status: "active",
    lastRun: "ontem",
    runs: 11,
    icon: "Calendar",
    steps: [
      {
        title: "Empresa e canais",
        description: "Selecione a empresa e os canais de distribuição.",
        fields: [
          { id: "empresa", label: "Empresa",   type: "select", required: true,
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM", "Everton Mota"] },
          { id: "canais",  label: "Canais",    type: "multiselect",
            options: ["Instagram Feed", "Instagram Stories", "Instagram Reels", "Facebook", "TikTok", "YouTube Shorts"] },
          { id: "posts",   label: "Nº de posts", type: "number", placeholder: "15" },
        ],
      },
      {
        title: "Tema e datas",
        description: "Defina o tema central e datas importantes da semana.",
        fields: [
          { id: "tema",     label: "Tema / Foco da semana", type: "text",
            placeholder: "Ex: Aprovação no concurso PMPE" },
          { id: "datas",    label: "Datas/eventos relevantes", type: "textarea",
            placeholder: "Ex: 15/05 — Divulgação de resultado..." },
          { id: "tom",      label: "Tom de comunicação", type: "select",
            options: ["Educativo", "Motivacional", "Institucional", "Comercial", "Entretenimento"] },
        ],
      },
      { title: "Revisão do calendário", description: "Aprove ou ajuste o calendário gerado.", fields: [] },
    ],
  },
  {
    id: "wf4",
    name: "Criar briefing para designer",
    description: "Briefing detalhado de criativo para o time de design executar.",
    area: "Design",
    areaColor: "#f97316",
    estimatedMinutes: 4,
    stepsCount: 2,
    status: "active",
    lastRun: "há 3h",
    runs: 9,
    icon: "Palette",
    steps: [
      {
        title: "Dados do criativo",
        description: "Informe os dados para o briefing.",
        fields: [
          { id: "empresa",  label: "Empresa",    type: "select", required: true,
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM", "Everton Mota"] },
          { id: "formato",  label: "Formato",    type: "multiselect",
            options: ["Feed 1:1", "Story 9:16", "Banner 1200×628", "Carrossel", "Reels Cover"] },
          { id: "objetivo", label: "Objetivo",   type: "text",   placeholder: "Ex: Gerar leads para o Intensivão PMPE" },
          { id: "cta",      label: "CTA",        type: "text",   placeholder: "Ex: Garantir minha vaga" },
          { id: "prazo",    label: "Prazo",       type: "text",   placeholder: "Ex: 48 horas" },
          { id: "obs",      label: "Referências / Observações", type: "textarea" },
        ],
      },
      { title: "Revisão do briefing", description: "Revise antes de enviar ao designer.", fields: [] },
    ],
  },
  {
    id: "wf5",
    name: "Criar script de WhatsApp",
    description: "Scripts de abordagem, follow-up e quebra de objeções para o comercial.",
    area: "Comercial",
    areaColor: "#f59e0b",
    estimatedMinutes: 5,
    stepsCount: 2,
    status: "active",
    lastRun: "há 1 dia",
    runs: 7,
    icon: "MessageCircle",
    steps: [
      {
        title: "Contexto do script",
        description: "Informe o produto e contexto do lead.",
        fields: [
          { id: "empresa",  label: "Empresa",       type: "select", required: true,
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM"] },
          { id: "produto",  label: "Produto",        type: "text",  placeholder: "Ex: Intensivão PMPE 2026" },
          { id: "tipo",     label: "Tipo de script", type: "select",
            options: ["Abordagem fria (1º contato)", "Follow-up D+1", "Follow-up D+3", "Quebra de objeção: preço", "Quebra de objeção: tempo", "Reengajamento"] },
          { id: "perfil",   label: "Perfil do lead", type: "textarea",
            placeholder: "Ex: Concurseiro que se inscreveu mas não comprou..." },
        ],
      },
      { title: "Revisão dos scripts", description: "Revise e ajuste os scripts.", fields: [] },
    ],
  },
  {
    id: "wf6",
    name: "Analisar campanha Meta Ads",
    description: "Análise profunda de uma campanha ativa com recomendações de otimização.",
    area: "Tráfego Pago",
    areaColor: "#3b82f6",
    estimatedMinutes: 5,
    stepsCount: 2,
    status: "active",
    lastRun: "há 2 dias",
    runs: 19,
    icon: "TrendingUp",
    steps: [
      {
        title: "Dados da campanha",
        description: "Cole os principais dados da campanha.",
        fields: [
          { id: "nome",      label: "Nome da campanha", type: "text",   required: true },
          { id: "empresa",   label: "Empresa",          type: "select",
            options: ["CPPEM Concursos", "Unicive", "Colégio CPPEM", "Everton Mota"] },
          { id: "periodo",   label: "Período",          type: "select",
            options: ["Últimos 7 dias", "Últimos 14 dias", "Últimos 30 dias"] },
          { id: "metricas",  label: "Métricas principais (copie do Ads Manager)", type: "textarea",
            placeholder: "Investimento, alcance, cliques, CPL, leads..." },
        ],
      },
      { title: "Resultados e recomendações", description: "Revise a análise e recomendações.", fields: [] },
    ],
  },
  {
    id: "wf7",
    name: "Organizar tarefas da equipe",
    description: "Lista priorizada de tarefas para o time com responsáveis e prazos.",
    area: "Gestão",
    areaColor: "#06b6d4",
    estimatedMinutes: 4,
    stepsCount: 2,
    status: "active",
    lastRun: "hoje 08h",
    runs: 12,
    icon: "ListChecks",
    steps: [
      {
        title: "Contexto da semana",
        description: "Descreva as demandas e prioridades.",
        fields: [
          { id: "demandas",   label: "Principais demandas desta semana", type: "textarea", required: true,
            placeholder: "Liste as entregas, campanhas e eventos da semana..." },
          { id: "equipe",     label: "Membros da equipe", type: "multiselect",
            options: ["Alexandre", "Itallo Mota", "Social Media 1", "Social Media 2", "Gestor Tráfego", "Comercial"] },
          { id: "prioridade", label: "Foco da semana",   type: "text",
            placeholder: "Ex: Lançamento Intensivão PMPE" },
        ],
      },
      { title: "Revisão das tarefas", description: "Aprove a lista de tarefas gerada.", fields: [] },
    ],
  },
  {
    id: "wf8",
    name: "Criar plano de lançamento",
    description: "Plano completo de lançamento com cronograma, tráfego, copy e WhatsApp.",
    area: "Lançamentos",
    areaColor: "#ec4899",
    estimatedMinutes: 12,
    stepsCount: 3,
    status: "active",
    lastRun: "há 1 semana",
    runs: 4,
    icon: "Rocket",
    steps: [
      {
        title: "Produto e oferta",
        description: "Defina o produto e os detalhes da oferta.",
        fields: [
          { id: "produto",  label: "Produto",       type: "text", required: true },
          { id: "preco",    label: "Preço / Condições", type: "text" },
          { id: "bonus",    label: "Bônus e diferenciais", type: "textarea" },
          { id: "data",     label: "Data de abertura do carrinho", type: "text" },
        ],
      },
      {
        title: "Estratégia",
        description: "Canal, público e mecânica do lançamento.",
        fields: [
          { id: "mecanica", label: "Mecânica", type: "select",
            options: ["Lançamento semente", "PLF (Product Launch Formula)", "Perpétuo", "Webinário ao vivo", "Semana de aulas gratuitas"] },
          { id: "canal",    label: "Canal principal", type: "select",
            options: ["WhatsApp + Meta Ads", "Instagram + Meta Ads", "YouTube + Google Ads", "Todos os canais"] },
          { id: "publico",  label: "Público-alvo", type: "textarea" },
        ],
      },
      { title: "Revisão do plano", description: "Revise o plano completo.", fields: [] },
    ],
  },
  {
    id: "wf9",
    name: "Analisar concorrentes",
    description: "Mapeamento de concorrentes diretos com análise de posicionamento e anúncios.",
    area: "Pesquisa",
    areaColor: "#a3e635",
    estimatedMinutes: 7,
    stepsCount: 2,
    status: "active",
    lastRun: "há 4 dias",
    runs: 5,
    icon: "Search",
    steps: [
      {
        title: "Definir escopo",
        description: "Informe o nicho e os concorrentes a analisar.",
        fields: [
          { id: "nicho",        label: "Nicho / mercado",    type: "text", required: true,
            placeholder: "Ex: Preparatório para PMPE no Nordeste" },
          { id: "concorrentes", label: "Concorrentes (um por linha)", type: "textarea",
            placeholder: "Nome ou URL dos concorrentes..." },
          { id: "foco",         label: "Foco da análise", type: "multiselect",
            options: ["Posicionamento", "Anúncios ativos", "Redes sociais", "Preços", "Diferenciais"] },
        ],
      },
      { title: "Revisão da análise", description: "Revise o mapeamento gerado.", fields: [] },
    ],
  },
  {
    id: "wf10",
    name: "Otimizar landing page",
    description: "Auditoria completa de landing page com recomendações de copy, CTA e estrutura.",
    area: "Conversão",
    areaColor: "#67e8f9",
    estimatedMinutes: 6,
    stepsCount: 2,
    status: "active",
    lastRun: "há 3 dias",
    runs: 8,
    icon: "Globe",
    steps: [
      {
        title: "Dados da página",
        description: "Informe a URL e o objetivo da landing page.",
        fields: [
          { id: "url",       label: "URL da landing page", type: "text", required: true },
          { id: "objetivo",  label: "Objetivo da página",  type: "select",
            options: ["Capturar lead", "Venda direta", "Inscrição em evento", "Download de material"] },
          { id: "taxa",      label: "Taxa de conversão atual (%)", type: "number" },
          { id: "problema",  label: "Principal problema identificado", type: "textarea" },
        ],
      },
      { title: "Revisão das recomendações", description: "Revise as sugestões de otimização.", fields: [] },
    ],
  },
]
