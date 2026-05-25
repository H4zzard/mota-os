import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }        from "@/lib/supabase-admin"
import { resolveCompanyFromSale }   from "@/lib/sales-mapping"
import { logActivity }              from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

const WEBHOOK_SECRET = process.env.JARVIS_WEBHOOK_SECRET ?? ""

interface SalesWebhookPayload {
  source?:             string
  external_id?:        string
  sale_date?:          string
  customer_name?:      string
  customer_email?:     string
  product_id?:         string
  product_name?:       string
  offer_name?:         string
  payment_method?:     string
  payment_status?:     string
  transaction_status?: string
  gross_amount?:       number | string
  net_amount?:         number | string
  fee_amount?:         number | string
  refund_amount?:      number | string
  currency?:           string
  installments?:       number
  checkout_url?:       string
  utm_source?:         string
  utm_medium?:         string
  utm_campaign?:       string
  utm_content?:        string
  utm_term?:           string
  company_id?:         string
  [key: string]:       unknown
}

function toNum(v: number | string | undefined | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  // Validar secret
  const secret = req.headers.get("x-jarvis-webhook-secret") ?? ""
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: SalesWebhookPayload
  try {
    payload = await req.json() as SalesWebhookPayload
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const source = payload.source ?? "webhook"

  // Resolver company
  let companyId = payload.company_id ?? null
  if (!companyId) {
    companyId = await resolveCompanyFromSale({
      source,
      product_id:   payload.product_id,
      product_name: payload.product_name,
      offer_name:   payload.offer_name,
      utm_campaign: payload.utm_campaign,
    })
  }

  if (!companyId) {
    return NextResponse.json(
      { error: "Não foi possível identificar a empresa desta venda" },
      { status: 422 },
    )
  }

  const saleDate = payload.sale_date
    ? new Date(payload.sale_date).toISOString()
    : new Date().toISOString()

  // Extrair metadata (tudo que não é campo conhecido)
  const knownKeys = new Set([
    "source","external_id","sale_date","customer_name","customer_email",
    "product_id","product_name","offer_name","payment_method","payment_status",
    "transaction_status","gross_amount","net_amount","fee_amount","refund_amount",
    "currency","installments","checkout_url","utm_source","utm_medium","utm_campaign",
    "utm_content","utm_term","company_id",
  ])
  const metadata: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (!knownKeys.has(k)) metadata[k] = v
  }

  const admin = createAdminClient()

  const record = {
    company_id:         companyId,
    source,
    external_id:        payload.external_id ?? null,
    sale_date:          saleDate,
    customer_name:      payload.customer_name ?? null,
    customer_email:     payload.customer_email ?? null,
    product_id:         payload.product_id ?? null,
    product_name:       payload.product_name ?? null,
    offer_name:         payload.offer_name ?? null,
    payment_method:     payload.payment_method ?? null,
    payment_status:     payload.payment_status ?? null,
    transaction_status: payload.transaction_status ?? null,
    gross_amount:       toNum(payload.gross_amount),
    net_amount:         toNum(payload.net_amount),
    fee_amount:         toNum(payload.fee_amount),
    refund_amount:      toNum(payload.refund_amount),
    currency:           payload.currency ?? "BRL",
    installments:       payload.installments ?? null,
    checkout_url:       payload.checkout_url ?? null,
    utm_source:         payload.utm_source ?? null,
    utm_medium:         payload.utm_medium ?? null,
    utm_campaign:       payload.utm_campaign ?? null,
    utm_content:        payload.utm_content ?? null,
    utm_term:           payload.utm_term ?? null,
    metadata,
    updated_at:         new Date().toISOString(),
  }

  const { data, error } = await admin
    .from("sales_transactions")
    .upsert(record, { onConflict: "source,external_id", ignoreDuplicates: false })
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  void logActivity({
    eventType: "api",
    action:    "Venda recebida via webhook",
    detail:    `${payload.product_name ?? "—"} — ${companyId}`,
    companyId,
    metadata:  { source, external_id: payload.external_id },
  })

  return NextResponse.json({ ok: true, id: data?.id ?? null, company_id: companyId })
}
