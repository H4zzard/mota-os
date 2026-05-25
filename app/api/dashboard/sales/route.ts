import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  getCurrentCompany,
  assertCanAccessCompany,
  isGlobalAdmin,
  isParentCompany,
  CHILD_SLUGS,
} from "@/lib/company-scope"

export const dynamic = "force-dynamic"

type SalesPeriod = "today" | "yesterday" | "7d" | "30d" | "month" | "semester" | "year" | "custom"

function periodBoundaries(
  period: SalesPeriod,
  startDate?: string | null,
  endDate?:   string | null,
): { start: string; end: string | null } {
  const now        = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  if (period === "custom" && startDate) {
    return {
      start: new Date(startDate).toISOString(),
      end:   endDate ? new Date(endDate).toISOString() : null,
    }
  }

  switch (period) {
    case "today":
      return { start: todayStart.toISOString(), end: null }

    case "yesterday": {
      const y = new Date(todayStart)
      y.setDate(y.getDate() - 1)
      return { start: y.toISOString(), end: todayStart.toISOString() }
    }

    case "7d": {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - 6)
      return { start: d.toISOString(), end: null }
    }

    case "30d": {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { start: d.toISOString(), end: null }
    }

    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: d.toISOString(), end: null }
    }

    case "semester": {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      return { start: d.toISOString(), end: null }
    }

    case "year": {
      const d = new Date(now.getFullYear(), 0, 1)
      return { start: d.toISOString(), end: null }
    }

    default: {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - 29)
      return { start: d.toISOString(), end: null }
    }
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const url       = new URL(req.url)
  const period    = (url.searchParams.get("period") ?? "30d") as SalesPeriod
  const startDate = url.searchParams.get("start_date")
  const endDate   = url.searchParams.get("end_date")
  const admin     = createAdminClient()

  // Resolve company
  let companyId: string
  const reqCompany = url.searchParams.get("company_id")
  if (reqCompany) {
    try { await assertCanAccessCompany(user.id, reqCompany) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = reqCompany
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  const isConsolidated = isParentCompany(companyId)
  const { start, end } = periodBoundaries(period, startDate, endDate)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withCompany(q: any): any {
    return isConsolidated
      ? q.in("company_id", CHILD_SLUGS)
      : q.eq("company_id", companyId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withPeriod(q: any): any {
    let r = q.gte("sale_date", start)
    if (end) r = r.lt("sale_date", end)
    return r
  }

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [
    { data: allTxns },
    { data: byDay },
    { data: byProduct },
    { data: byCompany },
    { data: byStatus },
    { data: recentTxns },
  ] = await Promise.all([
    // Todas as transações do período para agregações
    withPeriod(withCompany(
      admin.from("sales_transactions")
        .select("company_id, gross_amount, net_amount, refund_amount, transaction_status, payment_status, payment_method")
    )),

    // Por dia (sale_date truncado ao dia)
    withPeriod(withCompany(
      admin.from("sales_transactions")
        .select("sale_date, gross_amount, net_amount, transaction_status")
    )).order("sale_date", { ascending: true }),

    // Por produto
    withPeriod(withCompany(
      admin.from("sales_transactions")
        .select("product_name, gross_amount, net_amount, transaction_status")
    )),

    // Por empresa (consolidado)
    withPeriod(
      admin.from("sales_transactions")
        .select("company_id, gross_amount, net_amount, transaction_status")
        .in("company_id", isConsolidated ? CHILD_SLUGS : [companyId])
    ),

    // Por status de pagamento
    withPeriod(withCompany(
      admin.from("sales_transactions")
        .select("payment_status, gross_amount")
    )),

    // Últimas 20 transações
    withPeriod(withCompany(
      admin.from("sales_transactions")
        .select("id, company_id, product_name, customer_name, gross_amount, net_amount, transaction_status, payment_status, sale_date, source")
    )).order("sale_date", { ascending: false }).limit(20),
  ])

  // ── Agregações ────────────────────────────────────────────────────────────

  // Totais gerais (somente approved/paid)
  type TxRow = { gross_amount?: number | null; net_amount?: number | null; refund_amount?: number | null; transaction_status?: string | null; payment_status?: string | null; payment_method?: string | null; company_id?: string }

  const approved = (allTxns ?? []).filter(
    (t: TxRow) => ["approved","paid","completed","concluida","pago"].includes(
      (t.transaction_status ?? t.payment_status ?? "").toLowerCase()
    )
  )

  const grossRevenue  = approved.reduce((s: number, t: TxRow) => s + (Number(t.gross_amount) || 0), 0)
  const netRevenue    = approved.reduce((s: number, t: TxRow) => s + (Number(t.net_amount)   || 0), 0)
  const totalSales    = approved.length
  const avgTicket     = totalSales > 0 ? grossRevenue / totalSales : 0
  const totalRefunds  = (allTxns ?? []).reduce(
    (s: number, t: TxRow) => s + (Number(t.refund_amount) || 0), 0
  )

  const paidSales     = (allTxns ?? []).filter((t: TxRow) =>
    ["paid","pago","approved"].includes((t.payment_status ?? "").toLowerCase())
  ).length
  const pendingSales  = (allTxns ?? []).filter((t: TxRow) =>
    ["pending","pendente","waiting"].includes((t.payment_status ?? "").toLowerCase())
  ).length
  const canceledSales = (allTxns ?? []).filter((t: TxRow) =>
    ["canceled","cancelado","refunded","chargeback"].includes(
      (t.transaction_status ?? t.payment_status ?? "").toLowerCase()
    )
  ).length

  // Por dia
  type DayRow = { sale_date: string; gross_amount?: number | null; net_amount?: number | null; transaction_status?: string | null }
  const revenueByDay: Record<string, { gross: number; net: number; count: number }> = {}
  for (const t of byDay ?? []) {
    const day = (t as DayRow).sale_date.slice(0, 10)
    if (!revenueByDay[day]) revenueByDay[day] = { gross: 0, net: 0, count: 0 }
    revenueByDay[day].gross += Number((t as DayRow).gross_amount) || 0
    revenueByDay[day].net   += Number((t as DayRow).net_amount)   || 0
    revenueByDay[day].count++
  }
  const revenueByDayArr = Object.entries(revenueByDay)
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Por produto (top 10)
  type ProdRow = { product_name?: string | null; gross_amount?: number | null; net_amount?: number | null }
  const prodMap: Record<string, { gross: number; net: number; count: number }> = {}
  for (const t of byProduct ?? []) {
    const key = (t as ProdRow).product_name ?? "Sem produto"
    if (!prodMap[key]) prodMap[key] = { gross: 0, net: 0, count: 0 }
    prodMap[key].gross += Number((t as ProdRow).gross_amount) || 0
    prodMap[key].net   += Number((t as ProdRow).net_amount)   || 0
    prodMap[key].count++
  }
  const revenueByProduct = Object.entries(prodMap)
    .map(([product, v]) => ({ product, ...v }))
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 10)

  // Por empresa
  type CompRow = { company_id?: string; gross_amount?: number | null; net_amount?: number | null }
  const compMap: Record<string, { gross: number; net: number; count: number }> = {}
  for (const t of byCompany ?? []) {
    const key = (t as CompRow).company_id ?? "—"
    if (!compMap[key]) compMap[key] = { gross: 0, net: 0, count: 0 }
    compMap[key].gross += Number((t as CompRow).gross_amount) || 0
    compMap[key].net   += Number((t as CompRow).net_amount)   || 0
    compMap[key].count++
  }
  const revenueByCompany = Object.entries(compMap)
    .map(([company_id, v]) => ({ company_id, ...v }))
    .sort((a, b) => b.gross - a.gross)

  // Por status de pagamento
  type StatusRow = { payment_status?: string | null; gross_amount?: number | null }
  const statusMap: Record<string, { count: number; gross: number }> = {}
  for (const t of byStatus ?? []) {
    const key = (t as StatusRow).payment_status ?? "unknown"
    if (!statusMap[key]) statusMap[key] = { count: 0, gross: 0 }
    statusMap[key].count++
    statusMap[key].gross += Number((t as StatusRow).gross_amount) || 0
  }
  const revenueByPaymentStatus = Object.entries(statusMap)
    .map(([status, v]) => ({ status, ...v }))
    .sort((a, b) => b.gross - a.gross)

  return NextResponse.json({
    period,
    company_id: companyId,
    is_consolidated: isConsolidated,
    kpis: {
      gross_revenue:  grossRevenue,
      net_revenue:    netRevenue,
      total_sales:    totalSales,
      average_ticket: avgTicket,
      total_refunds:  totalRefunds,
      paid_sales:     paidSales,
      pending_sales:  pendingSales,
      canceled_sales: canceledSales,
    },
    revenue_by_day:            revenueByDayArr,
    revenue_by_product:        revenueByProduct,
    revenue_by_company:        revenueByCompany,
    revenue_by_payment_status: revenueByPaymentStatus,
    recent_transactions:       recentTxns ?? [],
  })
}
