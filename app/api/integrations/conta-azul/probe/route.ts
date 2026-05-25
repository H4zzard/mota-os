import { NextRequest, NextResponse }      from "next/server"
import { createClient }                  from "@/lib/supabase-server"
import { isGlobalAdmin }                 from "@/lib/company-scope"
import { refreshContaAzulTokenIfNeeded } from "@/lib/integrations/conta-azul"

export const dynamic = "force-dynamic"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeFields(item: Record<string, any>): string[] {
  const BLOCKED = /token|secret|password|senha|auth/i
  return Object.keys(item).filter(k => !BLOCKED.test(k)).slice(0, 20)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeSample(item: Record<string, any>): Record<string, string> {
  const BLOCKED = /token|secret|password|senha|auth/i
  const out: Record<string, string> = {}
  let count = 0
  for (const [k, v] of Object.entries(item)) {
    if (BLOCKED.test(k)) continue
    if (count++ >= 10) break
    out[k] = Array.isArray(v)
      ? `array[${(v as unknown[]).length}]`
      : v !== null && typeof v === "object"
      ? "object"
      : typeof v
  }
  return out
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const body = await req.json().catch(() => ({})) as {
    path?:       string
    start_date?: string
    end_date?:   string
  }

  if (!body.path || typeof body.path !== "string") {
    return NextResponse.json({ error: "path é obrigatório" }, { status: 400 })
  }

  const accessToken = await refreshContaAzulTokenIfNeeded()
  if (!accessToken) {
    return NextResponse.json(
      { error: "Conta Azul não conectada. Faça a autenticação OAuth primeiro." },
      { status: 400 },
    )
  }

  const apiBase   = process.env.CONTA_AZUL_API_BASE_URL || "https://api-v2.contaazul.com"
  const now        = new Date()
  const startDate  = body.start_date ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const endDate    = body.end_date   ?? now.toISOString().slice(0, 10)

  // Uma única chamada com os params mais comuns
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const url    = `${apiBase}${body.path}?${params.toString()}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      signal:  AbortSignal.timeout(10_000),
    })
  } catch (e) {
    return NextResponse.json({
      path:         body.path,
      status:       0,
      ok:           false,
      count:        null,
      fields:       null,
      sample:       null,
      rate_limited: false,
      error:        e instanceof Error ? e.message : "Erro de rede ao chamar endpoint",
    })
  }

  // ── 429 Rate limit ─────────────────────────────────────────────────────────
  if (res.status === 429) {
    return NextResponse.json({
      path:         body.path,
      status:       429,
      ok:           false,
      count:        null,
      fields:       null,
      sample:       null,
      rate_limited: true,
      error:        "Limite temporário da Conta Azul atingido. Aguarde alguns minutos e tente novamente.",
    })
  }

  // ── 404 Endpoint não encontrado ────────────────────────────────────────────
  if (res.status === 404) {
    return NextResponse.json({
      path:         body.path,
      status:       404,
      ok:           false,
      count:        null,
      fields:       null,
      sample:       null,
      rate_limited: false,
      error:        "Endpoint não encontrado. Verifique se esse recurso está habilitado na sua aplicação Conta Azul.",
    })
  }

  // ── 401 / 403 ──────────────────────────────────────────────────────────────
  if (res.status === 401 || res.status === 403) {
    const text = await res.text().catch(() => "")
    return NextResponse.json({
      path:         body.path,
      status:       res.status,
      ok:           false,
      count:        null,
      fields:       null,
      sample:       null,
      rate_limited: false,
      error:        res.status === 401
        ? "Token inválido ou expirado. Reconecte a Conta Azul."
        : `Sem permissão para este endpoint. Detalhe: ${text.slice(0, 120)}`,
    })
  }

  // ── Outro erro ─────────────────────────────────────────────────────────────
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    return NextResponse.json({
      path:         body.path,
      status:       res.status,
      ok:           false,
      count:        null,
      fields:       null,
      sample:       null,
      rate_limited: false,
      error:        `Erro ${res.status}: ${text.slice(0, 200)}`,
    })
  }

  // ── Sucesso ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseBody = await res.json().catch(() => null) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(responseBody)
    ? responseBody
    : (responseBody?.data ?? responseBody?.items ?? responseBody?.content ?? responseBody?.results ?? [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first  = items[0] as Record<string, any> | undefined

  return NextResponse.json({
    path:         body.path,
    status:       res.status,
    ok:           true,
    count:        items.length,
    fields:       first ? sanitizeFields(first) : null,
    sample:       first ? sanitizeSample(first) : null,
    rate_limited: false,
    error:        null,
  })
}
