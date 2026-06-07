import { NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { logActivity }       from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

// Chamado após o usuário convidado definir sua senha pela primeira vez.
// Registra first_access_at e limpa o flag must_change_password.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Atualiza perfil: registra primeiro acesso e limpa flag de troca obrigatória
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      must_change_password: false,
      first_access_at: now,
      updated_at: now,
    })
    .eq("id", user.id)
    .is("first_access_at", null)   // só atualiza se ainda não registrado

  if (profileErr) {
    console.error("[first-access] profile update error:", profileErr.message)
    // Não bloqueia — o usuário já definiu a senha com sucesso
  }

  // Remove flag do app_metadata para que o middleware não redirecione novamente
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { must_change_password: false },
  })

  void logActivity({
    userId:    user.id,
    eventType: "auth",
    action:    "first_access",
    detail:    "Primeiro acesso registrado após convite",
  })

  return NextResponse.json({ ok: true })
}
