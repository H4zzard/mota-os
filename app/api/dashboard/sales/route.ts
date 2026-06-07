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
      const y = new Date(todayStart); y.setDate(y.getDate() - 1)
      return { start: y.toISOString(), end: todayStart.toISOString() }
    }
    case "7d": {
      const d = new Date(todayStart); d.setDate(d.getDate() - 6)
      return { start: d.toISOString(), end: null }
    }
    case "30d": {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      return { start: d.toISOString(), end: null }
    }
    case "month": {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: null }
    }
    case "semester": {
      const d = new Date(now); d.setMonth(d.getMonth() - 6)
      return { start: d.toISOString(), end: null }
    }
    case "year": {
      return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: null }
    }
    default: {
      const d = new Date(todayStart); d.setDate(d.getDate() - 29)
      return { start: d.toISOString(), end: null }
    }
  }
}

function prevPeriodBounds(start: string, end: string | null): { prevStart: string; prevEnd: string } {
  const endDate   = end ? new Date(end) : new Date()
  const startDate = new Date(start)
  const duration  = endDate.getTime() - startDate.getTime()
  return {
    prevStart: new Date(startDate.getTime() - duration).toISOString(),
    prevEnd:   start,
  }
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0
  return Math.round(((current - previous) / previous) * 100)
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

  // ── Filtros personalizados ─────────────────────────────────────────────────
  const filterSource   = url.searchParams.get("source")
  const filterProduct  = url.searchParams.get("product_name")
  const filterPaySt    = url.searchParams.get("payment_status")
  const filterTxSt     = url.searchParams.get("transaction_status")
  const filterCustomer = url.searchParams.get("customer_name")

  const admin = createAdminClient()

  // ── Resolve empresa ────────────────────────────────────────────────────────
  let companyId: string
  const reqCompany = url.searchParams.get("company_id")
  if (reqCompany) {
    try { await assertCanAccessCompany(user.id, reqCompany) }
    catch { return NextResponse.json({ error: "Sem acesso à empresa" }, { status: 403 }) }
    companyId = reqCompany
  } else {
    companyId = await getCurrentCompany(user.id)
  }

  const isConsolidated     = isParentCompany(companyId)
  const { start, end }     = periodBoundaries(period, startDate, endDate)
  const { prevStart, prevEnd } = prevPeriodBounds(start, end)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withCompany(q: any): any {
    return isConsolidated ? q.in("company_id", CHILD_SLUGS) : q.eq("company_id", companyId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withPeriod(q: any): any {
    let r = q.gte("sale_date", start)
    if (end) r = r.lt("sale_date", end)
    return r
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withPrevPeriod(q: any): any {
    return q.gte("sale_date", prevStart).lt("sale_date", prevEnd)
  }

  // Aplica filtros opcionais — source/status usam btree; customer/product usam GIN (migration 20260605000001)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withFilters(q: any): any {
    if (filterSource)   q = q.eq("source", filterSource)
    if (filterProduct)  q = q.ilike("product_name", `%${filterProduct}%`)
    if (filterPaySt)    q = q.eq("payment_status", filterPaySt)
    if (filterTxSt)     q = q.eq("transaction_status", filterTxSt)
    if (filterCustomer) q = q.ilike("customer_name", `%${filterCustomer}%`)
    return q
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function base(q: any): any { return withFilters(withPeriod(withCompany(q))) }

  // ── Consultas paralelas ───────────────────────────────────────────────────
  const [
    { data: allTxns },
    { data: byDay },
    { data: byProduct },
    { data: byCompany },
    { data: byStatus },
    { data: bySource },
    { data: byCustomer },
    { data: byPaymentMethod },
    { data: unmappedRaw },
    { data: prevTxns },
    lastSyncRaw,
    { data: recentTxns },
  ] = await Promise.all([
    base(admin.from("sales_transactions")
      .select("company_id, gross_amount, net_amount, refund_amount, transaction_status, payment_status, payment_method")),

    base(admin.from("sales_transactions")
      .select("sale_date, gross_amount, net_amount, transaction_status")
    ).order("sale_date", { ascending: true }),

    base(admin.from("sales_transactions")
      .select("product_name, gross_amount, net_amount, transaction_status")),

    withFilters(withPeriod(
      admin.from("sales_transactions")
        .select("company_id, gross_amount, net_amount, transaction_status")
        .in("company_id", isConsolidated ? CHILD_SLUGS : [companyId])
    )),

    base(admin.from("sales_transactions").select("payment_status, gross_amount")),

    base(admin.from("sales_transactions").select("source, gross_amount, net_amount")),

    base(admin.from("sales_transactions").select("customer_name, customer_email, gross_amount, net_amount")),

    base(admin.from("sales_transactions").select("payment_method, gross_amount, net_amount")),

    // Vendas não mapeadas — global (sem filtro de empresa), só período e source
    withPeriod(
      admin.from("sales_transactions")
        .select("gross_amount, net_amount")
        .eq("company_id", "grupo")
        .filter("metadata->>unmapped_company", "eq", "true")
    ),

    // Período anterior — mesmos filtros e empresa, datas diferentes
    withFilters(withPrevPeriod(withCompany(
      admin.from("sales_transactions")
        .select("gross_amount, net_amount, transaction_status, payment_status")
    ))),

    // Última sincronização — sempre global (company_id pode ser null nos logs)
    admin.from("finance_sync_logs")
      .select("status, processed, inserted, failed, started_at, finished_at, error_message")
      .eq("source", "conta_azul")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    base(admin.from("sales_transactions")
      .select("id, company_id, product_name, customer_name, gross_amount, net_amount, transaction_status, payment_status, sale_date, source")
    ).order("sale_date", { ascending: false }).limit(20),
  ])

  // ── Tipos ─────────────────────────────────────────────────────────────────

  type TxRow = {
    gross_amount?: number | null; net_amount?: number | null; refund_amount?: number | null
    transaction_status?: string | null; payment_status?: string | null
    payment_method?: string | null; company_id?: string
  }

  const isApproved = (t: TxRow) =>
    ["approved","paid","completed","concluida","pago"].includes(
      (t.transaction_status ?? t.payment_status ?? "").toLowerCase()
    )

  // ── KPIs período atual ────────────────────────────────────────────────────

  const approved      = (allTxns ?? []).filter(isApproved)
  const grossRevenue  = approved.reduce((s: number, t: TxRow) => s + (Number(t.gross_amount) || 0), 0)
  const netRevenue    = approved.reduce((s: number, t: TxRow) => s + (Number(t.net_amount)   || 0), 0)
  const totalSales    = approved.length
  const avgTicket     = totalSales > 0 ? grossRevenue / totalSales : 0
  const totalRefunds  = (allTxns ?? []).reduce((s: number, t: TxRow) => s + (Number(t.refund_amount) || 0), 0)
  const paidSales     = (allTxns ?? []).filter((t: TxRow) => ["paid","pago","approved"].includes((t.payment_status ?? "").toLowerCase())).length
  const pendingSales  = (allTxns ?? []).filter((t: TxRow) => ["pending","pendente","waiting"].includes((t.payment_status ?? "").toLowerCase())).length
  const canceledSales = (allTxns ?? []).filter((t: TxRow) =>
    ["canceled","cancelado","refunded","chargeback"].includes((t.transaction_status ?? t.payment_status ?? "").toLowerCase())
  ).length

  // ── KPIs período anterior (comparação) ───────────────────────────────────

  const prevApproved    = (prevTxns ?? []).filter(isApproved)
  const prevGross       = prevApproved.reduce((s: number, t: TxRow) => s + (Number(t.gross_amount) || 0), 0)
  const prevNet         = prevApproved.reduce((s: number, t: TxRow) => s + (Number(t.net_amount)   || 0), 0)
  const prevCount       = prevApproved.length
  const prevAvgTicket   = prevCount > 0 ? prevGross / prevCount : 0

  const comparison = {
    gross_revenue:  { current: grossRevenue, previous: prevGross,     delta_pct: deltaPct(grossRevenue, prevGross) },
    net_revenue:    { current: netRevenue,   previous: prevNet,       delta_pct: deltaPct(netRevenue,   prevNet) },
    total_sales:    { current: totalSales,   previous: prevCount,     delta_pct: deltaPct(totalSales,   prevCount) },
    average_ticket: { current: avgTicket,    previous: prevAvgTicket, delta_pct: deltaPct(avgTicket,    prevAvgTicket) },
    prev_period:    { start: prevStart, end: prevEnd },
  }

  // ── Vendas não mapeadas ───────────────────────────────────────────────────

  const unmappedList   = unmappedRaw ?? []
  const unmappedCount  = unmappedList.length
  const unmappedGross  = unmappedList.reduce((s: number, t: { gross_amount?: number | null }) => s + (Number(t.gross_amount) || 0), 0)
  const unmappedNet    = unmappedList.reduce((s: number, t: { net_amount?:   number | null }) => s + (Number(t.net_amount)   || 0), 0)
  const unmapped_stats = { count: unmappedCount, gross: unmappedGross, net: unmappedNet }

  // ── Última sincronização ──────────────────────────────────────────────────

  const lastSyncData = (lastSyncRaw as { data?: unknown } | null)?.data ?? null
  const last_sync    = lastSyncData as {
    status: string; processed: number | null; inserted: number | null
    failed: number | null; started_at: string; finished_at: string | null; error_message: string | null
  } | null

  // ── Evolução por dia (+ avg_ticket) ──────────────────────────────────────

  type DayRow = { sale_date: string; gross_amount?: number | null; net_amount?: number | null; transaction_status?: string | null }
  const dayMap: Record<string, { gross: number; net: number; count: number; approved_gross: number; approved_count: number }> = {}
  for (const t of byDay ?? []) {
    const day = (t as DayRow).sale_date.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { gross: 0, net: 0, count: 0, approved_gross: 0, approved_count: 0 }
    const g = Number((t as DayRow).gross_amount) || 0
    const n = Number((t as DayRow).net_amount)   || 0
    dayMap[day].gross += g
    dayMap[day].net   += n
    dayMap[day].count++
    const ok = ["approved","paid","completed","concluida","pago"].includes(((t as DayRow).transaction_status ?? "").toLowerCase())
    if (ok) { dayMap[day].approved_gross += g; dayMap[day].approved_count++ }
  }
  const revenueByDay = Object.entries(dayMap)
    .map(([day, v]) => ({
      day,
      gross:      v.gross,
      net:        v.net,
      count:      v.count,
      avg_ticket: v.approved_count > 0 ? v.approved_gross / v.approved_count : 0,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // ── Evolução mensal (derivado do dayMap) ──────────────────────────────────

  const monthMap: Record<string, { gross: number; net: number; count: number; approved_gross: number; approved_count: number }> = {}
  for (const [day, v] of Object.entries(dayMap)) {
    const month = day.slice(0, 7) // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { gross: 0, net: 0, count: 0, approved_gross: 0, approved_count: 0 }
    monthMap[month].gross          += v.gross
    monthMap[month].net            += v.net
    monthMap[month].count          += v.count
    monthMap[month].approved_gross += v.approved_gross
    monthMap[month].approved_count += v.approved_count
  }
  const revenueByMonth = Object.entries(monthMap)
    .map(([month, v]) => ({
      month,
      gross:      v.gross,
      net:        v.net,
      count:      v.count,
      avg_ticket: v.approved_count > 0 ? v.approved_gross / v.approved_count : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // ── Por produto (top 10) ──────────────────────────────────────────────────

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
    .sort((a, b) => b.gross - a.gross).slice(0, 10)

  // ── Por empresa ───────────────────────────────────────────────────────────

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

  // ── Por status de pagamento ───────────────────────────────────────────────

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

  // ── Por origem ────────────────────────────────────────────────────────────

  type SrcRow = { source?: string | null; gross_amount?: number | null; net_amount?: number | null }
  const srcMap: Record<string, { count: number; gross: number; net: number }> = {}
  for (const t of bySource ?? []) {
    const key = (t as SrcRow).source ?? "unknown"
    if (!srcMap[key]) srcMap[key] = { count: 0, gross: 0, net: 0 }
    srcMap[key].count++
    srcMap[key].gross += Number((t as SrcRow).gross_amount) || 0
    srcMap[key].net   += Number((t as SrcRow).net_amount)   || 0
  }
  const revenueBySource = Object.entries(srcMap)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.gross - a.gross)

  // ── Por cliente (top 20) ──────────────────────────────────────────────────

  type CustRow = { customer_name?: string | null; customer_email?: string | null; gross_amount?: number | null; net_amount?: number | null }
  const custMap: Record<string, { count: number; gross: number; net: number; email: string | null }> = {}
  for (const t of byCustomer ?? []) {
    const key = (t as CustRow).customer_name ?? (t as CustRow).customer_email ?? "Anônimo"
    if (!custMap[key]) custMap[key] = { count: 0, gross: 0, net: 0, email: (t as CustRow).customer_email ?? null }
    custMap[key].count++
    custMap[key].gross += Number((t as CustRow).gross_amount) || 0
    custMap[key].net   += Number((t as CustRow).net_amount)   || 0
  }
  const revenueByCustomer = Object.entries(custMap)
    .map(([customer_name, v]) => ({ customer_name, ...v }))
    .sort((a, b) => b.gross - a.gross).slice(0, 20)

  // ── Por método de pagamento ───────────────────────────────────────────────

  type MethodRow = { payment_method?: string | null; gross_amount?: number | null; net_amount?: number | null }
  const methodMap: Record<string, { count: number; gross: number; net: number }> = {}
  for (const t of byPaymentMethod ?? []) {
    const key = (t as MethodRow).payment_method ?? "unknown"
    if (!methodMap[key]) methodMap[key] = { count: 0, gross: 0, net: 0 }
    methodMap[key].count++
    methodMap[key].gross += Number((t as MethodRow).gross_amount) || 0
    methodMap[key].net   += Number((t as MethodRow).net_amount)   || 0
  }
  const revenueByPaymentMethod = Object.entries(methodMap)
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.gross - a.gross)

  return NextResponse.json({
    period,
    company_id:      companyId,
    is_consolidated: isConsolidated,

    active_filters: {
      source:             filterSource   ?? null,
      product_name:       filterProduct  ?? null,
      payment_status:     filterPaySt    ?? null,
      transaction_status: filterTxSt     ?? null,
      customer_name:      filterCustomer ?? null,
    },

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

    comparison,
    unmapped_stats,
    last_sync,

    revenue_by_day:            revenueByDay,
    revenue_by_month:          revenueByMonth,
    revenue_by_product:        revenueByProduct,
    revenue_by_company:        revenueByCompany,
    revenue_by_payment_status: revenueByPaymentStatus,
    revenue_by_source:         revenueBySource,
    revenue_by_customer:       revenueByCustomer,
    revenue_by_payment_method: revenueByPaymentMethod,
    recent_transactions:       recentTxns ?? [],
  })
}
