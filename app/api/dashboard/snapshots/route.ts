import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin, getCurrentCompany, assertCanAccessCompany } from "@/lib/company-scope"
import { logActivity } from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

// ─── GET — lista snapshots de uma empresa ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!await isGlobalAdmin(user.id)) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const url       = new URL(req.url)
  const limit     = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100)

  let companyId: string
  const reqCompany = url.searchParams.get("company_id")
  if (reqCompany) {
    try { await assertCanAccessCompany(user.id, reqCompany) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = reqCompany
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  const admin = createAdminClient()
  const { data: snapshots, error } = await admin
    .from("dashboard_snapshots")
    .select("id, snapshot_date, period, summary, ai_analysis, created_at, created_by")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 })

  return NextResponse.json({ snapshots: snapshots ?? [], company_id: companyId })
}

// ─── POST — cria snapshot manual com KPIs financeiros ────────────────────────
// Para snapshot automático futuro, chamar este endpoint via cron com
// { company_id, period, triggered_by: "auto" } — sem alterações necessárias.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!await isGlobalAdmin(user.id)) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const body = await req.json() as {
    company_id?:   string
    period?:       "daily" | "weekly" | "monthly"
    ai_analysis?:  string
    triggered_by?: "manual" | "auto"
    // KPIs financeiros explícitos (opcionais — se ausentes, buscamos do banco)
    financial_kpis?: Record<string, unknown>
    operational_kpis?: Record<string, unknown>
  }

  const period = (["daily","weekly","monthly"].includes(body.period ?? "") ? body.period : "daily") as "daily" | "weekly" | "monthly"

  let companyId: string
  if (body.company_id) {
    try { await assertCanAccessCompany(user.id, body.company_id) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = body.company_id
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  const admin = createAdminClient()

  // ── Busca KPIs financeiros do período se não fornecidos ───────────────────
  let financialKpis: Record<string, unknown> = body.financial_kpis ?? {}

  if (!body.financial_kpis) {
    // Mapeia period snapshot → period query
    const salesPeriod = period === "monthly" ? "month" : period === "weekly" ? "7d" : "today"

    const salesRes = await fetch(
      new URL(`/api/dashboard/sales?company_id=${companyId}&period=${salesPeriod}`, req.url),
      { headers: { cookie: req.headers.get("cookie") ?? "" } }
    )
    if (salesRes.ok) {
      const salesData = await salesRes.json() as {
        kpis?: Record<string, unknown>
        unmapped_stats?: Record<string, unknown>
        last_sync?: Record<string, unknown>
        comparison?: Record<string, unknown>
      }
      financialKpis = {
        ...salesData.kpis,
        unmapped_stats: salesData.unmapped_stats,
        last_sync_status: (salesData.last_sync as { status?: string } | null)?.status ?? null,
        comparison:       salesData.comparison,
      }
    }
  }

  // ── Busca KPIs operacionais se não fornecidos ─────────────────────────────
  let operationalKpis: Record<string, unknown> = body.operational_kpis ?? {}

  if (!body.operational_kpis) {
    const overviewRes = await fetch(
      new URL(`/api/dashboard/overview?company_id=${companyId}&period=7d`, req.url),
      { headers: { cookie: req.headers.get("cookie") ?? "" } }
    )
    if (overviewRes.ok) {
      const overviewData = await overviewRes.json() as { kpis?: Record<string, unknown> }
      operationalKpis = overviewData.kpis ?? {}
    }
  }

  const summary = {
    financial:    financialKpis,
    operational:  operationalKpis,
    triggered_by: body.triggered_by ?? "manual",
    snapshot_ts:  new Date().toISOString(),
  }

  const { data: snapshot, error } = await admin
    .from("dashboard_snapshots")
    .insert({
      company_id:    companyId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      period,
      summary,
      ai_analysis:   body.ai_analysis ?? null,
      created_by:    user.id,
    })
    .select("id, snapshot_date, period, created_at")
    .single()

  if (error) {
    console.error("[snapshots/POST] insert error:", error.message)
    return NextResponse.json({ error: "Erro ao salvar snapshot" }, { status: 500 })
  }

  void logActivity({
    userId:    user.id,
    eventType: "settings",
    action:    "snapshot_created",
    detail:    `${period} — ${companyId}`,
    companyId,
    metadata:  { snapshot_id: snapshot.id, period, triggered_by: body.triggered_by ?? "manual" },
  })

  return NextResponse.json({ ok: true, snapshot })
}
