import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin, getCurrentCompany, assertCanAccessCompany } from "@/lib/company-scope"
import { streamChat } from "@/lib/ai-service"

export const dynamic = "force-dynamic"

function fmtBrl(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${v.toFixed(2)}`
}

function deltaTxt(pct: number | null): string {
  if (pct === null) return "(sem dado anterior)"
  return pct >= 0 ? `+${pct}% vs período anterior` : `${pct}% vs período anterior`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Somente administradores podem gerar análises" }, { status: 403 })

  const body = await req.json() as { company_id?: string; period?: string; sales_period?: string }
  const period      = body.period       ?? "7d"
  const salesPeriod = body.sales_period ?? period   // período financeiro pode diferir do operacional

  let companyId: string
  if (body.company_id) {
    try { await assertCanAccessCompany(user.id, body.company_id) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = body.company_id
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  // ── Busca dados em paralelo ───────────────────────────────────────────────
  const [overviewRes, salesRes] = await Promise.all([
    fetch(
      new URL(`/api/dashboard/overview?company_id=${companyId}&period=${period}`, req.url),
      { headers: { cookie: req.headers.get("cookie") ?? "" } }
    ),
    fetch(
      new URL(`/api/dashboard/sales?company_id=${companyId}&period=${salesPeriod}`, req.url),
      { headers: { cookie: req.headers.get("cookie") ?? "" } }
    ),
  ])

  if (!overviewRes.ok) {
    return NextResponse.json({ error: "Falha ao buscar dados de overview" }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overview  = await overviewRes.json() as Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesData = salesRes.ok ? await salesRes.json() as Record<string, any> : null

  const kpis    = overview.kpis    ?? {}
  const company = overview.company ?? { name: companyId }
  const sales   = salesData?.kpis  ?? {}
  const comp    = salesData?.comparison ?? {}
  const unmapped = salesData?.unmapped_stats ?? { count: 0, gross: 0 }

  // ── Prompt com dados operacionais + financeiros ───────────────────────────
  const prompt = `Você é Jarvis, o assistente executivo do Grupo Mota Educação.
Analise os dados abaixo e produza um relatório executivo em português, claro e objetivo.

EMPRESA: ${company.name} (${companyId})
PERÍODO: ${period}
DATA: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

═══ KPIs OPERACIONAIS ═══
• Sessões de IA: ${kpis.sessions_period ?? 0}
• Workflows executados: ${kpis.workflows_run ?? 0} | Erros: ${kpis.workflows_error ?? 0}
• Vigias ativos: ${kpis.watchers_active ?? 0} | Alertas no período: ${kpis.alerts_recent ?? 0}
• Fontes de conhecimento indexadas: ${kpis.sources_indexed ?? 0}
• Agentes ativos: ${kpis.agents_active ?? 0}
• Chunks RAG: ${kpis.rag_chunks ?? 0}
• Projetos ativos: ${kpis.projects_active ?? 0} | Em risco: ${kpis.projects_at_risk ?? 0}

${(kpis.projects_at_risk ?? 0) > 0 ? `⚠️  ${kpis.projects_at_risk} projeto(s) com prazo vencido.` : ""}

═══ KPIs FINANCEIROS (${salesPeriod}) ═══
• Receita bruta:   ${fmtBrl(sales.gross_revenue ?? 0)} ${deltaTxt(comp.gross_revenue?.delta_pct ?? null)}
• Receita líquida: ${fmtBrl(sales.net_revenue   ?? 0)} ${deltaTxt(comp.net_revenue?.delta_pct   ?? null)}
• Total de vendas: ${sales.total_sales ?? 0} ${deltaTxt(comp.total_sales?.delta_pct ?? null)}
• Ticket médio:    ${fmtBrl(sales.average_ticket ?? 0)} ${deltaTxt(comp.average_ticket?.delta_pct ?? null)}
• Pagas: ${sales.paid_sales ?? 0} | Pendentes: ${sales.pending_sales ?? 0} | Canceladas: ${sales.canceled_sales ?? 0}
• Reembolsos: ${fmtBrl(sales.total_refunds ?? 0)}
${unmapped.count > 0 ? `⚠️  ${unmapped.count} venda(s) não mapeada(s) (${fmtBrl(unmapped.gross)}) — precisam de classificação.` : ""}

═══ MARKETING ═══
${overview.marketing?.has_data
  ? JSON.stringify(overview.marketing.totals, null, 2)
  : "Sem dados de marketing conectados para o período."}

═══ AGENTES MAIS USADOS ═══
${(overview.agents ?? []).slice(0, 5).map((a: { name: string; sessions: number }) => `• ${a.name}: ${a.sessions} sessões`).join("\n") || "Nenhum agente utilizado no período."}

Produza uma análise em 4-5 parágrafos curtos cobrindo:
1. Resumo executivo financeiro (receita, ticket, tendência)
2. Performance operacional (IA, workflows, projetos)
3. Pontos de atenção (vendas não mapeadas, erros, atrasos)
4. Destaques positivos
5. Recomendações concretas (máximo 3)

Seja direto, sem excessos. Use negrito (**texto**) para destacar números importantes.`

  // ── Gera análise com Claude Haiku ─────────────────────────────────────────
  let analysis = ""
  try {
    for await (const chunk of streamChat({
      messages: [{ role: "user", content: prompt }],
      model: "claude-haiku-4-5-20251001",
    })) {
      if (!chunk.done) analysis += chunk.text
    }
  } catch (err) {
    console.error("[dashboard/analyze] AI error:", err)
    return NextResponse.json({ error: "Falha na geração de análise" }, { status: 500 })
  }

  if (!analysis.trim()) {
    return NextResponse.json({ error: "Análise retornou vazia" }, { status: 500 })
  }

  // ── Salva snapshot com KPIs financeiros e operacionais ────────────────────
  const admin = createAdminClient()
  const { data: snapshot, error: snapErr } = await admin
    .from("dashboard_snapshots")
    .insert({
      company_id:    companyId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      period,
      summary: {
        operational:  kpis,
        financial:    { ...sales, comparison: comp, unmapped_stats: unmapped },
        triggered_by: "analyze",
        snapshot_ts:  new Date().toISOString(),
      },
      ai_analysis:   analysis,
      created_by:    user.id,
    })
    .select("id, snapshot_date, created_at")
    .single()

  if (snapErr) {
    console.error("[dashboard/analyze] snapshot save error:", snapErr.message)
    // Retorna análise mesmo se o save falhar
  }

  return NextResponse.json({ ok: true, analysis, snapshot: snapshot ?? null })
}
