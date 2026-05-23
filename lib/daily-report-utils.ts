// Padrões de linhas que a IA pode gerar indevidamente e precisam ser removidos
// antes de salvar/enviar o report_text (cabeçalho, metadados, assinatura).
const BAD_LINE_PATTERNS = [
  /^#{1,3}\s/,                            // markdown headers: # ## ###
  /^-{3,}\s*$/,                           // separadores ---
  /^={3,}\s*$/,                           // separadores ===
  /^Relatório\s+Diári/i,
  /^Relatório\s+de\s+Atividades/i,
  /^Colaborador\s*:/i,
  /^Cargo\s*:/i,
  /^Função\s*:/i,
  /^Setor\s*:/i,
  /^Departamento\s*:/i,
  /^Empresa\s*:/i,
  /^Data\s*:/i,
  /^_?Gerado\s+(pelo|automaticamente)/i,
  /^_?Relatório\s+gerado/i,
  /^_?(Mota\s+OS|Jarvis)\s*_?$/i,  // assinatura do sistema (legado + novo)
]

/**
 * Remove qualquer cabeçalho, metadado ou assinatura que a IA tenha gerado
 * indevidamente no report_text. Preserva o corpo do relatório.
 */
export function sanitizeReportText(text: string): string {
  if (!text) return ""

  const lines    = text.split("\n")
  const filtered = lines.filter((line) => {
    const t = line.trim()
    if (!t) return true  // preserva linhas em branco internas
    return !BAD_LINE_PATTERNS.some((p) => p.test(t))
  })

  // Remove linhas em branco iniciais e finais
  while (filtered.length > 0 && !filtered[0].trim())               filtered.shift()
  while (filtered.length > 0 && !filtered[filtered.length - 1].trim()) filtered.pop()

  return filtered.join("\n")
}

/**
 * Retorna o nome legível de uma empresa pelo slug.
 */
const COMPANY_LABELS: Record<string, string> = {
  grupo:   "Grupo Mota Educação",
  cppem:   "CPPEM Concursos",
  unicive: "Unicive",
  colegio: "Colégio CPPEM",
  everton: "Everton Mota",
}

export function companyLabel(id: string): string {
  return COMPANY_LABELS[id.toLowerCase()] ?? id
}
