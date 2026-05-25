/**
 * Conta Azul OAuth 2.0 helper — SERVER-SIDE ONLY.
 * Nunca importar em Client Components.
 * Nunca logar access_token, refresh_token ou client_secret.
 */

import { createAdminClient }     from "@/lib/supabase-admin"
import { resolveCompanyFromSale } from "@/lib/sales-mapping"
import type { CompanySlug }       from "@/lib/company-scope"
import crypto                     from "crypto"

// ─── Config (lida do env em runtime, não em module-level, para hot-reload) ────

function cfg() {
  return {
    clientId:     process.env.CONTA_AZUL_CLIENT_ID     ?? "",
    clientSecret: process.env.CONTA_AZUL_CLIENT_SECRET ?? "",
    redirectUri:  process.env.CONTA_AZUL_REDIRECT_URI  ?? "",
    tokenUrl:     process.env.CONTA_AZUL_TOKEN_URL     || "https://auth.contaazul.com/oauth2/token",
    apiBase:      process.env.CONTA_AZUL_API_BASE_URL  || "https://api-v2.contaazul.com",
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ContaAzulConnectionInfo {
  id:           string
  status:       string
  tokenStatus:  "valid" | "expired" | "missing"
  expiresAt:    string | null
  lastTestedAt: string | null
  updatedAt:    string | null
  errorMessage: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CaItem = Record<string, any>

export interface FetchAllResult {
  items:   CaItem[]
  total:   number
  error?:  string
  status?: number
}

export interface NormalizedSale {
  company_id:         CompanySlug | null
  source:             "conta_azul"
  external_id:        string | null
  sale_date:          string
  customer_name:      string | null
  customer_email:     string | null
  product_id:         string | null
  product_name:       string | null
  offer_name:         string | null
  payment_method:     string | null
  payment_status:     string | null
  transaction_status: string | null
  gross_amount:       number | null
  net_amount:         number | null
  fee_amount:         null
  refund_amount:      null
  currency:           "BRL"
  installments:       number | null
  metadata:           CaItem
  updated_at:         string
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string; refresh_token: string; expires_in: number
}> {
  const c   = cfg()
  const res = await fetch(c.tokenUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  process.env.CONTA_AZUL_REDIRECT_URI ?? "",
      client_id:     c.clientId,
      client_secret: c.clientSecret,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Conta Azul token exchange ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

async function doRefreshToken(refreshTokenValue: string): Promise<{
  access_token: string; refresh_token: string; expires_in: number
}> {
  const c   = cfg()
  const res = await fetch(c.tokenUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshTokenValue,
      client_id:     c.clientId,
      client_secret: c.clientSecret,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Conta Azul token refresh ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

// ─── Conexão ──────────────────────────────────────────────────────────────────

export async function getContaAzulConnection(): Promise<{
  info: ContaAzulConnectionInfo | null; accessToken: string | null
}> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("api_connections")
    .select("id, status, config, last_tested_at, updated_at, error_message")
    .eq("provider", "conta_azul")
    .maybeSingle()

  if (!data) return { info: null, accessToken: null }

  const c = (data.config ?? {}) as Record<string, string>
  let tokenStatus: "valid" | "expired" | "missing" = "missing"
  let expiresAt: string | null = null

  if (c.access_token) {
    expiresAt   = c.expires_at ?? null
    tokenStatus = expiresAt
      ? (new Date(expiresAt) > new Date() ? "valid" : "expired")
      : "valid"
  }

  return {
    info: {
      id:           data.id,
      status:       data.status,
      tokenStatus,
      expiresAt,
      lastTestedAt: data.last_tested_at ?? null,
      updatedAt:    data.updated_at     ?? null,
      errorMessage: data.error_message  ?? null,
    },
    accessToken: c.access_token ?? null,
  }
}

export async function saveContaAzulTokens(tokens: {
  access_token: string; refresh_token: string; expires_in: number
}): Promise<void> {
  const admin     = createAdminClient()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const config    = {
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    expiresAt,
  }

  const { data: existing } = await admin
    .from("api_connections")
    .select("id")
    .eq("provider", "conta_azul")
    .maybeSingle()

  if (existing) {
    await admin
      .from("api_connections")
      .update({ config, status: "connected", updated_at: new Date().toISOString(), error_message: null })
      .eq("provider", "conta_azul")
  } else {
    await admin
      .from("api_connections")
      .insert({ provider: "conta_azul", name: "Conta Azul", config, status: "connected" })
  }
}

export async function refreshContaAzulTokenIfNeeded(): Promise<string | null> {
  const admin      = createAdminClient()
  const { data }   = await admin
    .from("api_connections")
    .select("config")
    .eq("provider", "conta_azul")
    .maybeSingle()

  if (!data?.config) return null
  const c = data.config as Record<string, string>
  if (!c.access_token) return null

  // Token ainda válido com margem de 5 min
  if (c.expires_at) {
    const expiresAt = new Date(c.expires_at)
    const nowPlus5m = new Date(Date.now() + 5 * 60 * 1000)
    if (expiresAt > nowPlus5m) return c.access_token
  }

  if (!c.refresh_token) return null

  try {
    const newTokens = await doRefreshToken(c.refresh_token)
    await saveContaAzulTokens(newTokens)
    return newTokens.access_token
  } catch {
    // Marca erro de renovação mas NÃO derruba conexão OAuth
    await admin
      .from("api_connections")
      .update({ status: "error", error_message: "Falha ao renovar token OAuth. Reconecte a Conta Azul." })
      .eq("provider", "conta_azul")
    return null
  }
}

export function isContaAzulConfigured(): boolean {
  const c = cfg()
  return !!(c.clientId && c.clientSecret && c.redirectUri)
}

// ─── Fetch autenticado (com retry 401) ───────────────────────────────────────

export async function contaAzulFetch(
  path:    string,
  options: RequestInit = {},
  token?:  string,
): Promise<Response> {
  const accessToken = token ?? await refreshContaAzulTokenIfNeeded()
  if (!accessToken) throw new Error("Token Conta Azul ausente ou expirado. Reconecte nas Configurações.")

  const { apiBase } = cfg()
  const url         = path.startsWith("http") ? path : `${apiBase}${path}`

  let res = await fetch(url, {
    ...options,
    headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json", ...options.headers },
  })

  // Retry uma vez se 401 (token expirou durante a request)
  if (res.status === 401 && !token) {
    const newToken = await refreshContaAzulTokenIfNeeded()
    if (newToken && newToken !== accessToken) {
      res = await fetch(url, {
        ...options,
        headers: { "Authorization": `Bearer ${newToken}`, "Accept": "application/json", ...options.headers },
      })
    }
  }

  return res
}

// ─── Fetch paginado: retorna todos os itens de um endpoint ───────────────────

async function fetchAllPages(
  endpointPath: string,
  queryParams:  Record<string, string>,
  token:        string,
): Promise<FetchAllResult> {
  const { apiBase } = cfg()
  const allItems: CaItem[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const params = new URLSearchParams({
      ...queryParams,
      page:           String(page),
      pagina:         String(page),        // Conta Azul BR
      page_size:      String(pageSize),
      tamanho_pagina: String(pageSize),    // Conta Azul BR
      per_page:       String(pageSize),
      limit:          String(pageSize),
    })
    const url = `${apiBase}${endpointPath}?${params.toString()}`
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { items: allItems, total: allItems.length, error: `${res.status}: ${text.slice(0, 300)}`, status: res.status }
    }

    const body = await res.json() as unknown
    // Conta Azul pode retornar array direto ou { data: [], total: N, items: [] }
    let pageItems: CaItem[]
    if (Array.isArray(body)) {
      pageItems = body as CaItem[]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = body as Record<string, any>
      pageItems = b.data ?? b.items ?? b.content ?? b.results ?? []
    }

    allItems.push(...pageItems)

    // Para se veio menos de pageSize (última página) ou array direto
    if (pageItems.length < pageSize || Array.isArray(body)) break
    page++
  }

  return { items: allItems, total: allItems.length }
}

// ─── fetchContaAzulSales ──────────────────────────────────────────────────────

export interface FetchSalesParams { startDate: string; endDate: string }

export async function fetchContaAzulSales(
  { startDate, endDate }: FetchSalesParams,
  token: string,
  endpointOverride?: string | null,
): Promise<FetchAllResult> {
  const endpoint = endpointOverride?.trim() || process.env.CONTA_AZUL_SALES_ENDPOINT?.trim()
  if (!endpoint) {
    return { items: [], total: 0, error: "CONTA_AZUL_SALES_ENDPOINT não configurado" }
  }

  return fetchAllPages(endpoint, {
    // Conta Azul BR (prioritários)
    data_inicio:   startDate,
    data_fim:      endDate,
    // Variantes internacionais
    start_date:    startDate,
    end_date:      endDate,
    startDate,
    endDate,
    date_from:     startDate,
    date_to:       endDate,
    initial_date:  startDate,
    final_date:    endDate,
    from:          startDate,
    to:            endDate,
  }, token)
}

// ─── fetchContaAzulReceivables ────────────────────────────────────────────────

export async function fetchContaAzulReceivables(
  { startDate, endDate }: FetchSalesParams,
  token: string,
  endpointOverride?: string | null,
): Promise<FetchAllResult> {
  const endpoint = endpointOverride?.trim() || process.env.CONTA_AZUL_RECEIVABLES_ENDPOINT?.trim()
  if (!endpoint) {
    return { items: [], total: 0, error: "CONTA_AZUL_RECEIVABLES_ENDPOINT não configurado" }
  }

  return fetchAllPages(endpoint, {
    start_date:       startDate,
    end_date:         endDate,
    competence_from:  startDate,
    competence_to:    endDate,
    due_date_from:    startDate,
    due_date_to:      endDate,
    from:             startDate,
    to:               endDate,
    data_inicio:      startDate,
    data_fim:         endDate,
  }, token)
}

// ─── Lê endpoint salvo no banco ───────────────────────────────────────────────

export async function getSavedEndpoint(): Promise<{ salesEndpoint: string | null; variant: string | null }> {
  const admin  = createAdminClient()
  const { data } = await admin
    .from("api_connections")
    .select("config")
    .eq("provider", "conta_azul")
    .maybeSingle()
  if (!data?.config) return { salesEndpoint: null, variant: null }
  const c = data.config as Record<string, string>
  return {
    salesEndpoint: c.conta_azul_sales_endpoint ?? null,
    variant:       c.conta_azul_endpoint_variant ?? null,
  }
}

// ─── Salva endpoint descoberto no banco ───────────────────────────────────────

export async function persistEndpoint(path: string, variant: string): Promise<void> {
  const admin    = createAdminClient()
  const { data } = await admin
    .from("api_connections")
    .select("config")
    .eq("provider", "conta_azul")
    .maybeSingle()
  const existing = (data?.config ?? {}) as Record<string, unknown>
  await admin
    .from("api_connections")
    .update({
      config: { ...existing, conta_azul_sales_endpoint: path, conta_azul_endpoint_variant: variant },
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "conta_azul")
}

// ─── resolveCompanyFromContaAzulItem ─────────────────────────────────────────

export async function resolveCompanyFromContaAzulItem(
  item: CaItem,
  explicitCompanyId?: string | null,
): Promise<{ companyId: CompanySlug; unmapped: boolean }> {
  // 1. Empresa explícita (vinda do body da request)
  if (explicitCompanyId && explicitCompanyId !== "grupo") {
    return { companyId: explicitCompanyId as CompanySlug, unmapped: false }
  }

  // 2. Campo metadata/company_id direto no item
  const metaCompany = item.company_id ?? item.company ?? item.subsidiary
  if (metaCompany && typeof metaCompany === "string" && metaCompany !== "grupo") {
    const valid: CompanySlug[] = ["cppem", "unicive", "colegio", "everton"]
    if (valid.includes(metaCompany as CompanySlug)) {
      return { companyId: metaCompany as CompanySlug, unmapped: false }
    }
  }

  // 3. Via sales_company_mapping (tabela configurável no banco)
  const productName = extractProductName(item)
  const mappedId = await resolveCompanyFromSale({
    source:       "conta_azul",
    product_name: productName,
    offer_name:   item.category ?? item.offer_name ?? null,
  })
  if (mappedId) return { companyId: mappedId, unmapped: false }

  // 4. Heurística por palavras-chave no nome do produto/descrição
  const text = [
    productName,
    item.description,
    item.title,
    item.note,
    item.observation,
  ].filter(Boolean).join(" ").toLowerCase()

  if (text.includes("cppem") || text.includes("pmpe") || text.includes("pmal") || text.includes("concurso")) {
    return { companyId: "cppem", unmapped: false }
  }
  if (text.includes("unicive") || text.includes("tecnólogo") || text.includes("tecnologo") || text.includes("superior")) {
    return { companyId: "unicive", unmapped: false }
  }
  if (text.includes("colégio") || text.includes("colegio") || text.includes("escola") || text.includes("ensino médio")) {
    return { companyId: "colegio", unmapped: false }
  }

  // 5. Fallback administrativo — não derruba o sync
  return { companyId: "grupo", unmapped: true }
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function extractProductName(item: CaItem): string | null {
  return (
    item.product?.name
    ?? item.items?.[0]?.product?.name
    ?? item.items?.[0]?.description
    ?? item.description
    ?? item.title
    ?? item.name
    ?? item.product_name
    ?? null
  )
}

function extractExternalId(item: CaItem): string {
  const raw = (
    item.id
    ?? item.uuid
    ?? item.sale_id
    ?? item.event_id
    ?? item.code
    ?? item.number
  )
  if (raw !== null && raw !== undefined) return String(raw).trim()

  // Hash de fallback quando não há ID — evita duplicatas mas nunca falha
  const fingerprint = JSON.stringify({
    date:   item.date ?? item.sale_date ?? item.due_date ?? item.created_at,
    amount: item.total ?? item.amount ?? item.value,
    name:   extractProductName(item),
  })
  return "hash_" + crypto.createHash("sha1").update(fingerprint).digest("hex").slice(0, 16)
}

function extractDate(item: CaItem): { date: string; usedFallback: boolean } {
  const raw = (
    item.date
    ?? item.sale_date
    ?? item.emission_date
    ?? item.competence_date
    ?? item.competence
    ?? item.created_at
    ?? item.due_date
    ?? item.event_date
  )
  if (raw) {
    try { return { date: new Date(raw).toISOString(), usedFallback: false } }
    catch { /* fall through */ }
  }
  return { date: new Date().toISOString(), usedFallback: true }
}

function extractGrossAmount(item: CaItem): number | null {
  const v = (
    item.total
    ?? item.total_value
    ?? item.amount
    ?? item.value
    ?? item.gross_amount
    ?? item.sale_amount
  )
  const n = Number(v)
  return isNaN(n) || n === 0 ? null : n
}

function extractNetAmount(item: CaItem, gross: number | null): number | null {
  const v = (
    item.net_amount
    ?? item.net_value
    ?? item.received_amount
    ?? item.net
  )
  const n = Number(v)
  if (!isNaN(n) && n > 0) return n
  return gross  // fallback: líquido = bruto se não disponível
}

export async function normalizeContaAzulSale(
  item: CaItem,
  explicitCompanyId?: string | null,
): Promise<NormalizedSale> {
  const { companyId, unmapped } = await resolveCompanyFromContaAzulItem(item, explicitCompanyId)
  const { date, usedFallback }  = extractDate(item)
  const productName              = extractProductName(item)
  const gross                    = extractGrossAmount(item)

  return {
    company_id:         companyId,
    source:             "conta_azul",
    external_id:        extractExternalId(item),
    sale_date:          date,
    customer_name:      item.customer?.name ?? item.client?.name ?? item.person?.name ?? item.customer_name ?? null,
    customer_email:     item.customer?.email ?? item.client?.email ?? item.person?.email ?? item.customer_email ?? null,
    product_id:         String(item.product?.id ?? item.product_id ?? item.service_id ?? "").trim() || null,
    product_name:       productName,
    offer_name:         item.category ?? item.offer_name ?? null,
    payment_method:     item.payment_method ?? item.payment_type ?? item.method ?? null,
    payment_status:     item.payment_status ?? item.status ?? item.situation ?? null,
    transaction_status: item.status ?? item.situation ?? item.transaction_status ?? null,
    gross_amount:       gross,
    net_amount:         extractNetAmount(item, gross),
    fee_amount:         null,
    refund_amount:      null,
    currency:           "BRL",
    installments:       Number(item.installments ?? item.parcelas ?? 0) || null,
    metadata: {
      raw:               item,
      unmapped_company:  unmapped || undefined,
      used_fallback_date: usedFallback || undefined,
    },
    updated_at: new Date().toISOString(),
  }
}

// normalizeContaAzulReceivable — mesmo schema, campos diferentes no raw
export async function normalizeContaAzulReceivable(
  item: CaItem,
  explicitCompanyId?: string | null,
): Promise<NormalizedSale> {
  // Receivables têm campos levemente diferentes
  const remapped: CaItem = {
    ...item,
    total:         item.amount ?? item.value ?? item.total,
    date:          item.competence_date ?? item.due_date ?? item.date,
    description:   item.description ?? item.observation ?? item.note,
    status:        item.status ?? item.situation,
  }
  return normalizeContaAzulSale(remapped, explicitCompanyId)
}

// ─── Deprecated — mantido para compatibilidade com código existente ───────────
/** @deprecated Use normalizeContaAzulSale */
export async function mapContaAzulSaleToSalesTransaction(
  item: CaItem,
  defaultCompanyId?: string | null,
): Promise<NormalizedSale> {
  return normalizeContaAzulSale(item, defaultCompanyId)
}
