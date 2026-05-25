import { NextRequest, NextResponse }      from "next/server"
import { createClient }                  from "@/lib/supabase-server"
import { createAdminClient }             from "@/lib/supabase-admin"
import { isGlobalAdmin }                 from "@/lib/company-scope"
import {
  refreshContaAzulTokenIfNeeded,
  fetchContaAzulSales,
  normalizeContaAzulSale,
  getSavedEndpoint,
  type CaItem,
  type NormalizedSale,
} from "@/lib/integrations/conta-azul"
import { logActivity }                   from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const body = await req.json().catch(() => ({})) as {
    company_id?: string
    start_date?: string
    end_date?:   string
  }

  const admin  = createAdminClient()
  const userId = user.id

  // ── 1. Valida token OAuth ─────────────────────────────────────────────────────
  const accessToken = await refreshContaAzulTokenIfNeeded()
  if (!accessToken) {
    return NextResponse.json(
      { error: "Conta Azul não conectada. Acesse Configurações → APIs e faça a autenticação OAuth." },
      { status: 400 },
    )
  }

  // ── 2. Resolve endpoint: DB salvo > env var (sem fallback automático) ─────────
  const { salesEndpoint: dbEndpoint } = await getSavedEndpoint()
  const endpoint = dbEndpoint || process.env.CONTA_AZUL_SALES_ENDPOINT?.trim() || null

  if (!endpoint) {
    return NextResponse.json(
      {
        error: "Nenhum endpoint de vendas Conta Azul configurado. "
             + "No card da Conta Azul, informe o caminho do endpoint, clique em \"Testar\" e depois em \"Usar este endpoint\".",
        connected:        true,
        endpoint_missing: true,
      },
      { status: 422 },
    )
  }

  // ── 3. Período: primeiro dia do mês atual até hoje ────────────────────────────
  const now       = new Date()
  const startDate = body.start_date
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const endDate   = body.end_date ?? now.toISOString().slice(0, 10)

  // ── 4. Cria log de sync ───────────────────────────────────────────────────────
  const { data: syncLog } = await admin
    .from("finance_sync_logs")
    .insert({
      source:     "conta_azul",
      company_id: body.company_id ?? null,
      status:     "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  const syncId = syncLog?.id

  void logActivity({
    userId,
    eventType: "api",
    action:    "Sincronização Conta Azul iniciada",
    detail:    `${startDate} → ${endDate} via ${endpoint}`,
    companyId: body.company_id,
    metadata:  { sync_id: syncId, endpoint, start_date: startDate, end_date: endDate },
  })

  let processed = 0
  let inserted  = 0
  let updated   = 0
  let failed    = 0

  async function failSync(msg: string, httpStatus = 500) {
    await admin
      .from("finance_sync_logs")
      .update({
        status:        "error",
        finished_at:   new Date().toISOString(),
        processed,
        inserted,
        updated,
        failed,
        error_message: msg,
      })
      .eq("id", syncId ?? "")

    void logActivity({
      userId,
      eventType: "api",
      action:    "Sincronização Conta Azul falhou",
      detail:    msg,
      companyId: body.company_id,
      metadata:  { sync_id: syncId },
    })

    // OAuth permanece conectado — só o sync falhou
    return NextResponse.json({ error: msg, connected: true, processed, inserted, failed }, { status: httpStatus })
  }

  // ── 5. Busca dados via endpoint configurado ───────────────────────────────────
  let items: CaItem[] = []
  try {
    const result = await fetchContaAzulSales({ startDate, endDate }, accessToken, endpoint)

    if (result.status === 429) {
      return await failSync(
        "Limite temporário da Conta Azul atingido (429). Aguarde alguns minutos e tente novamente.",
        429,
      )
    }

    if (result.status === 404) {
      return await failSync(
        `Endpoint não encontrado: ${endpoint}. Verifique se este recurso está habilitado na sua aplicação Conta Azul.`,
        422,
      )
    }

    if (result.error && !result.items.length) {
      return await failSync(`Erro ao buscar dados em ${endpoint}: ${result.error}`)
    }

    items = result.items
  } catch (e) {
    return await failSync(e instanceof Error ? e.message : "Erro desconhecido ao chamar API Conta Azul")
  }

  // Período sem itens — não é erro
  if (!items.length) {
    await admin
      .from("finance_sync_logs")
      .update({ status: "success", finished_at: new Date().toISOString(), processed: 0, inserted: 0, updated: 0, failed: 0 })
      .eq("id", syncId ?? "")

    return NextResponse.json({ ok: true, sync_id: syncId, processed: 0, inserted: 0, updated: 0, failed: 0, endpoint })
  }

  // ── 6. Normaliza e faz upsert ─────────────────────────────────────────────────
  const normalize: (item: CaItem, cid?: string | null) => Promise<NormalizedSale> = normalizeContaAzulSale

  for (const item of items) {
    processed++
    try {
      const record = await normalize(item, body.company_id)

      const { error: upsertErr } = await admin
        .from("sales_transactions")
        .upsert(record, { onConflict: "source,external_id", ignoreDuplicates: false })

      if (upsertErr) { failed++; continue }
      inserted++
    } catch {
      failed++
    }
  }

  // ── 7. Finaliza com sucesso ───────────────────────────────────────────────────
  await admin
    .from("finance_sync_logs")
    .update({
      status:      "success",
      finished_at: new Date().toISOString(),
      processed,
      inserted,
      updated,
      failed,
    })
    .eq("id", syncId ?? "")

  void logActivity({
    userId,
    eventType: "api",
    action:    "Sincronização Conta Azul concluída",
    detail:    `${inserted} inseridas, ${failed} falhas de ${processed} processadas via ${endpoint}`,
    companyId: body.company_id,
    metadata:  { sync_id: syncId, processed, inserted, failed, endpoint },
  })

  return NextResponse.json({ ok: true, sync_id: syncId, processed, inserted, updated, failed, endpoint })
}
