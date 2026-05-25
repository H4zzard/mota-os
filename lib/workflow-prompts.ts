import type { WorkflowStep } from "@/lib/workflow-types"

// ─── Instruções específicas por workflow ──────────────────────────────────────

const INSTRUCTIONS: Record<string, string> = {
  "Criar campanha de leads": `
Gere um plano completo de campanha de geração de leads. Estruture com:
## Estrutura da Campanha
- Objetivo, público, orçamento e período

## Configuração por Canal
- Distribuição de budget, segmentações, formatos

## Criativos Sugeridos
- Briefing resumido de cada peça (copy de headline, CTA, formato)

## Configurações Técnicas
- Objetivo de campanha na plataforma, pixel, eventos de conversão

## KPIs e Metas
- CPL meta, volume de leads esperado, taxa de conversão

## Próximos Passos
- Lista de ações prioritárias numeradas`,

  "Gerar relatório diário": `
Gere um relatório executivo de tráfego pago. Estruture com:
## Resumo Executivo
- 3–5 pontos principais do período

## Performance por Canal
- Métricas principais: investimento, alcance, cliques, CPL, leads

## Pontos de Atenção
- O que está performando abaixo do esperado e por quê

## Oportunidades
- Otimizações de alto impacto a implementar

## Recomendações
- Ações prioritárias para as próximas 24–48h`,

  "Planejar conteúdo semanal": `
Gere um calendário editorial semanal completo. Estruture com:
## Calendário Dia a Dia
- Para cada dia: formato (feed/reels/stories), tema, copy sugerido, horário ideal

## Ideias de Pauta
- 5 ideias extras que podem ser aproveitadas

## Hashtags por Tema
- Grupos de hashtags segmentados por tipo de conteúdo

## Dicas de Distribuição
- Horários de pico, frequência ideal por canal`,

  "Criar briefing para designer": `
Crie um briefing completo para o time de design. Estruture com:
## Briefing Criativo
- Produto, empresa, objetivo, público

## Especificações Técnicas
- Formato, dimensões, resolução, paleta de cores

## Copy Sugerido
- Headline principal, subtítulo, CTA, textos de apoio

## Elementos Obrigatórios
- Logos, selos, assinaturas, elementos visuais da marca

## Referências e Estilo
- Tom visual, referências de inspiração

## Prazo e Entregas
- Data de entrega, versões necessárias, formato de arquivo`,

  "Criar script de WhatsApp": `
Crie 3 variações de script de WhatsApp prontos para usar. Para cada variação, inclua:
## Script 1 — [Nome do estilo]
- Abertura (primeira mensagem)
- Desenvolvimento / argumento principal
- Quebra de objeção
- CTA final

## Script 2 — [Nome do estilo]
(mesma estrutura)

## Script 3 — [Nome do estilo]
(mesma estrutura)

## Dicas de Uso
- Melhor momento para enviar cada tipo
- Como personalizar para cada lead`,

  "Analisar campanha Meta Ads": `
Analise os dados e gere um relatório de otimização. Estruture com:
## Diagnóstico de Performance
- Situação atual vs. benchmarks (CPL médio do setor, CTR esperado)

## Pontos Críticos
- Problemas identificados com impacto estimado

## Análise por Conjunto de Anúncios
- Quais estão entregando melhor e por quê

## Recomendações Priorizadas
- Top 5 ações ordenadas por impacto/esforço

## Próximos Passos
- O que fazer hoje, esta semana e este mês`,

  "Organizar tarefas da equipe": `
Organize as tarefas da semana em um plano de ação. Estruture com:
## Prioridades da Semana
- Top 3 entregas mais críticas com justificativa

## Lista de Tarefas por Responsável
- Para cada membro: tarefas, estimativa de horas, prazo

## Quadro de Prioridades
- Alta / Média / Baixa com critérios claros

## Alertas e Dependências
- O que pode travar o que, dependências entre tarefas

## Daily Sugerido
- Pauta de 15 minutos para alinhamento diário`,

  "Criar plano de lançamento": `
Crie um plano completo de lançamento. Estruture com:
## Visão Geral do Lançamento
- Produto, oferta, mecânica e datas principais

## Cronograma Semanal
- Semana a semana: o que fazer em tráfego, conteúdo, WhatsApp e vendas

## Estratégia de Tráfego Pago
- Budget, segmentação, criativos e landing page

## Sequência de WhatsApp
- Mensagens pré-abertura, abertura do carrinho e fechamento

## Copy da Oferta
- Headline, bullets de benefício, CTA e escassez

## Métricas de Acompanhamento
- KPIs por fase: leads, vendas, CAC, ROI`,

  "Analisar concorrentes": `
Analise os concorrentes informados. Estruture com:
## Perfil de Cada Concorrente
- Posicionamento, proposta de valor, canais

## Análise de Anúncios
- O que estão comunicando, formatos usados, promoções ativas

## Pontos Fortes e Fracos
- Comparativo direto com nossa empresa

## Oportunidades de Diferenciação
- Onde podemos nos destacar com base nas lacunas identificadas

## Recomendações Estratégicas
- 5 ações para aproveitar as oportunidades mapeadas`,

  "Otimizar landing page": `
Audite a landing page e gere recomendações. Estruture com:
## Avaliação Geral
- Nota por critério: headline, proposta de valor, CTA, prova social, urgência

## Problemas Identificados
- Lista ordenada por impacto potencial

## Recomendações com Exemplos de Copy
- Para cada problema: o que mudar e como ficaria o novo texto

## Elementos que Estão Funcionando
- O que manter e por quê

## Priorização
- Quick wins (implementar em 1h) vs. Mudanças estruturais`,
}

const DEFAULT_INSTRUCTION = `
Gere um resultado completo e profissional para este workflow.
Estruture a resposta com seções claras usando ## para títulos.
Seja específico, acionável e use os dados informados como contexto.`

// ─── Mapeamento empresa → slug ────────────────────────────────────────────────

const COMPANY_SLUG: Record<string, string> = {
  "CPPEM Concursos": "cppem",
  "Unicive":         "unicive",
  "Colégio CPPEM":  "colegio",
  "Everton Mota":    "everton",
  "Grupo Mota":      "grupo",
  "Todas":           "grupo",
}

export function companyToSlug(empresa: string): string {
  return COMPANY_SLUG[empresa] ?? "grupo"
}

// ─── Builder principal ────────────────────────────────────────────────────────

export function buildWorkflowPrompt(
  workflowName: string,
  steps: WorkflowStep[],
  values: Record<string, string | string[]>,
): { system: string; user: string } {
  // Coleta todos os campos com seus rótulos
  const labeled: { label: string; value: string }[] = []
  for (const step of steps) {
    for (const field of step.fields) {
      const val = values[field.id]
      if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) continue
      labeled.push({
        label: field.label,
        value: Array.isArray(val) ? val.join(", ") : val,
      })
    }
  }

  const inputBlock =
    labeled.length > 0
      ? labeled.map(({ label, value }) => `• ${label}: ${value}`).join("\n")
      : "Nenhum campo preenchido — use seu conhecimento como especialista."

  const instruction = INSTRUCTIONS[workflowName] ?? DEFAULT_INSTRUCTION

  const system = `Você é um especialista em marketing digital e gestão para o Grupo Mota Educação.
Produza resultados profissionais, diretos e prontos para uso. Responda sempre em português.
Use formatação clara com títulos (##) e bullets. Seja específico, acionável e completo.`

  const user = `Workflow: **${workflowName}**

Dados preenchidos:
${inputBlock}

${instruction.trim()}

Gere o resultado completo agora.`

  return { system, user }
}
