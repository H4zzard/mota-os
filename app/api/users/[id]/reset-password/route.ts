import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin }     from "@/lib/company-scope"
import { logActivity }       from "@/lib/activity-logger"
import { denyAccess }        from "@/lib/api-guard"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!await isGlobalAdmin(user.id)) {
    return denyAccess({ req, userId: user.id, reason: "not_admin" })
  }

  const { id: targetId } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", targetId)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  const origin = req.headers.get("origin")
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? ""

  // generateLink envia o e-mail automaticamente via SMTP configurado no Supabase.
  // Nunca expor action_link ao frontend.
  const { error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo: `${origin}/reset-password` },
  })

  if (linkError) {
    console.error("[users/reset-password] generateLink error:", linkError.message)
    return NextResponse.json(
      { error: "Erro ao gerar link de reset. Verifique as configurações de SMTP no Supabase." },
      { status: 500 },
    )
  }

  void logActivity({
    userId:    user.id,
    eventType: "settings",
    action:    "user_password_reset_sent",
    detail:    `Reset de senha enviado para ${profile.email}`,
    metadata:  { target_user_id: targetId },
  })

  return NextResponse.json({
    ok: true,
    message: `E-mail de reset enviado para ${profile.email}. O usuário receberá instruções para definir uma nova senha.`,
  })
}
