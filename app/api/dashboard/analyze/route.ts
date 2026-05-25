import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin, getCurrentCompany, assertCanAccessCompany } from "@/lib/company-scope"
import { streamChat } from "@/lib/ai-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Somente administradores podem gerar análises" }, { status: 403 })

  const body = await req.json() as { company_id?: string; period?: string }
  const period = body.period ?? "7d"

  let companyId: string
  if (body.company_id) {
    try { await assertCanAccessCompany(user.id, body.company_id) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = body.company_id
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  // Fetch overview data to build the prompt
  const overviewRes = await fetch(
    new URL(`/api/dashboard/overview?company_id=${companyId}&period=${period}`, req.url),
    { headers: { cookie: req.headers.get("cookie") ?? "" } }
  )

  if (!overviewRes.ok) {
    return NextResponse.json({ error: "Falha ao buscar dados de overview" }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overview = await overviewRes.json() as Record<string, any>
  const kpis     = overview.kpis ?? {}
  const company  = overview.company ?? { name: companyId }

  const prompt = `Você é Jarvis, o assistente executivo do Grupo Mota Educação.
Analise os dados operacionais abaixo e produza um relatório executivo em português, claro e objetivo.

EMPRESA: ${company.name} (${companyId})
PERÍODO: ${period}
DATA: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

═══ KPIs OPERACIONAIS ═══
• Sessões de IA: ${kpis.sessions_period}
• Workflows executados: ${kpis.workflows_run} | Erros: ${kpis.workflows_error}
• Vigias ativos: ${kpis.watchers_active} | Alertas no período: ${kpis.alerts_recent}
• Fontes de conhecimento indexadas: ${kpis.sources_indexed}
• Agentes ativos: ${kpis.agents_active}
• Chunks RAG: ${kpis.rag_chunks}
• Projetos ativos: ${kpis.projects_active} | Em risco: ${kpis.projects_at_risk}

${kpis.projects_at_risk > 0 ? `⚠️  ${kpis.projects_at_risk} projeto(s) com prazo vencido.` : ""}

═══ MARKETING ═══
${overview.marketing?.has_data
  ? JSON.stringify(overview.marketing.totals, null, 2)
  : "Sem dados de marketing conectados para o período."}

═══ AGENTES MAIS USADOS ═══
${(overview.agents ?? []).slice(0, 5).map((a: { name: string; sessions: number }) => `• ${a.name}: ${a.sessions} sessões`).join("\n") || "Nenhum agente utilizado no período."}

Produza uma análise em 3-5 parágrafos curtos cobrindo:
1. Resumo executivo (o que aconteceu no período)
2. Pontos de atenção (erros, atrasos, alertas)
3. Destaques positivos
4. Recomendações concretas (máximo 3)

Seja direto, sem excessos. Use negrito (**texto**) para destacar números importantes.`

  // Collect streamed response
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

  // Save snapshot
  const admin = createAdminClient()
  const { data: snapshot, error: snapErr } = await admin
    .from("dashboard_snapshots")
    .insert({
      company_id:    companyId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      period,
      summary: kpis,
      ai_analysis:   analysis,
      created_by:    user.id,
    })
    .select("id, snapshot_date, created_at")
    .single()

  if (snapErr) {
    console.error("[dashboard/analyze] snapshot save error:", snapErr.message)
    // Return analysis even if save fails
  }

  return NextResponse.json({ ok: true, analysis, snapshot: snapshot ?? null })
}
