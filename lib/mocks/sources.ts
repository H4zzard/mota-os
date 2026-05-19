// TODO: substituir por consulta Supabase — tabelas: files, knowledge_chunks, api_connections

export type SourceType = "documents" | "api" | "folder" | "drive" | "reports" | "knowledge" | "links"

export interface Source {
  id: string
  name: string
  description: string
  type: SourceType
  company: string
  companyColor: string
  connected: boolean
  lastSync: string
  fileCount: number
  sizeLabel: string
  tags: string[]
  icon: string
}

export const sources: Source[] = [
  {
    id: "src1",
    name: "Base CPPEM Concursos",
    description: "Documentos internos, PDFs de cursos, materiais de aula e base de FAQs do CPPEM.",
    type: "knowledge",
    company: "CPPEM Concursos",
    companyColor: "#16a34a",
    connected: true,
    lastSync: "há 2h",
    fileCount: 847,
    sizeLabel: "1,2 GB",
    tags: ["PDFs", "FAQs", "Cursos", "Editais"],
    icon: "BookOpen",
  },
  {
    id: "src2",
    name: "Base Unicive EAD",
    description: "Materiais, ementas, regulamentos e documentos institucionais da Unicive.",
    type: "knowledge",
    company: "Unicive",
    companyColor: "#3b82f6",
    connected: true,
    lastSync: "há 4h",
    fileCount: 412,
    sizeLabel: "680 MB",
    tags: ["Ementas", "Regulamentos", "Cursos"],
    icon: "GraduationCap",
  },
  {
    id: "src3",
    name: "Base Colégio CPPEM",
    description: "Comunicados, calendários, regulamentos e documentos do colégio.",
    type: "knowledge",
    company: "Colégio CPPEM",
    companyColor: "#f59e0b",
    connected: true,
    lastSync: "ontem",
    fileCount: 183,
    sizeLabel: "95 MB",
    tags: ["Comunicados", "Calendário", "Regimentos"],
    icon: "School",
  },
  {
    id: "src4",
    name: "Base Everton Mota",
    description: "Materiais, roteiros de aula, conteúdos e documentos da marca pessoal.",
    type: "knowledge",
    company: "Everton Mota",
    companyColor: "#ec4899",
    connected: false,
    lastSync: "há 5 dias",
    fileCount: 64,
    sizeLabel: "42 MB",
    tags: ["Aulas", "Roteiros", "Conteúdo"],
    icon: "User",
  },
  {
    id: "src5",
    name: "Relatórios Reportei",
    description: "Integração com Reportei para relatórios automatizados de tráfego pago.",
    type: "api",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: false,
    lastSync: "há 3 dias",
    fileCount: 0,
    sizeLabel: "—",
    tags: ["Meta Ads", "Google Ads", "CPL", "ROAS"],
    icon: "BarChart3",
  },
  {
    id: "src6",
    name: "Criativos Drive",
    description: "Google Drive com todos os criativos, artes finais e materiais de design do grupo.",
    type: "drive",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: true,
    lastSync: "há 30min",
    fileCount: 1284,
    sizeLabel: "8,7 GB",
    tags: ["Imagens", "Vídeos", "Artes", "Templates"],
    icon: "Image",
  },
  {
    id: "src7",
    name: "Scripts Comerciais",
    description: "Pasta com scripts de vendas, WhatsApp, objeções e follow-up para toda a equipe comercial.",
    type: "documents",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: true,
    lastSync: "há 1 dia",
    fileCount: 38,
    sizeLabel: "12 MB",
    tags: ["Scripts", "WhatsApp", "Follow-up", "Objeções"],
    icon: "FileText",
  },
  {
    id: "src8",
    name: "FAQ Atendimento",
    description: "Base de perguntas e respostas frequentes para a equipe de atendimento de todas as marcas.",
    type: "knowledge",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: true,
    lastSync: "há 6h",
    fileCount: 216,
    sizeLabel: "4 MB",
    tags: ["FAQ", "Atendimento", "Respostas"],
    icon: "HelpCircle",
  },
  {
    id: "src9",
    name: "Meta Ads API",
    description: "Conexão direta com a API do Meta Ads para leitura de métricas e campanhas.",
    type: "api",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: false,
    lastSync: "nunca",
    fileCount: 0,
    sizeLabel: "—",
    tags: ["Campanhas", "Métricas", "Anúncios"],
    icon: "Globe",
  },
  {
    id: "src10",
    name: "Google Analytics 4",
    description: "Dados de sessões, conversões e comportamento do usuário via GA4.",
    type: "api",
    company: "Grupo Mota",
    companyColor: "#06b6d4",
    connected: true,
    lastSync: "há 1h",
    fileCount: 0,
    sizeLabel: "—",
    tags: ["Sessões", "Conversões", "Tráfego"],
    icon: "TrendingUp",
  },
]

export const sourceTypeLabels: Record<SourceType, string> = {
  knowledge:  "Base de conhecimento",
  documents:  "Documentos",
  api:        "APIs",
  folder:     "Pastas locais",
  drive:      "Google Drive",
  reports:    "Relatórios",
  links:      "Links",
}
