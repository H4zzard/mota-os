import { NextResponse }     from "next/server"
import { createClient }     from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin }    from "@/lib/company-scope"
import { isContaAzulConfigured } from "@/lib/integrations/conta-azul"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const admin = createAdminClient()

  const { data } = await admin
    .from("api_connections")
    .select("id, status, config, last_tested_at, updated_at, error_message")
    .eq("provider", "conta_azul")
    .maybeSingle()

  // Determina token_status a partir do config — nunca expõe o token
  let tokenStatus: "valid" | "expired" | "missing" = "missing"
  let expiresAt: string | null = null

  if (data?.config) {
    const cfg = data.config as Record<string, string>
    if (cfg.access_token) {
      expiresAt = cfg.expires_at ?? null
      tokenStatus = expiresAt
        ? (new Date(expiresAt) > new Date() ? "valid" : "expired")
        : "valid"
    }
  }

  const isConnected = data?.status === "connected" && tokenStatus !== "missing"

  // Lê endpoint salvo no config (sem expor tokens)
  const cfg = (data?.config ?? {}) as Record<string, string>
  const savedEndpoint = cfg.conta_azul_sales_endpoint ?? null
  const savedVariant  = cfg.conta_azul_endpoint_variant ?? null

  const [{ data: syncLogs }] = await Promise.all([
    admin
      .from("finance_sync_logs")
      .select("id, status, processed, inserted, updated, failed, started_at, finished_at, error_message")
      .eq("source", "conta_azul")
      .order("started_at", { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    env_configured:  isContaAzulConfigured(),
    connected:       isConnected,
    status:          data?.status ?? "disconnected",
    token_status:    tokenStatus,
    expires_at:      expiresAt,
    connected_at:    isConnected ? (data?.updated_at ?? null) : null,
    updated_at:      data?.updated_at ?? null,
    saved_endpoint:  savedEndpoint,
    saved_variant:   savedVariant,
    connection:      data
      ? {
          id:             data.id,
          status:         data.status,
          last_tested_at: data.last_tested_at ?? null,
          updated_at:     data.updated_at     ?? null,
          error_message:  data.error_message  ?? null,
        }
      : null,
    recent_syncs: syncLogs ?? [],
  })
}
