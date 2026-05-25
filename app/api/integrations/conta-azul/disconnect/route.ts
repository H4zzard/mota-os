import { NextResponse }    from "next/server"
import { createClient }    from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin }   from "@/lib/company-scope"
import { logActivity }     from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const admin = createAdminClient()

  // Zera tokens sem apagar a conexão (mantém histórico de sync_logs e vendas importadas)
  const { data: existing } = await admin
    .from("api_connections")
    .select("id")
    .eq("provider", "conta_azul")
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ ok: true, message: "Nenhuma conexão encontrada." })
  }

  await admin
    .from("api_connections")
    .update({
      config:        {},
      status:        "inactive",
      error_message: null,
      updated_at:    new Date().toISOString(),
    })
    .eq("provider", "conta_azul")

  void logActivity({
    userId:    user.id,
    eventType: "api",
    action:    "Conta Azul desconectada",
    detail:    "Tokens removidos. Vendas anteriores preservadas.",
    metadata:  { provider: "conta_azul" },
  })

  return NextResponse.json({ ok: true })
}
