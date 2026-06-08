import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }          from "@/lib/supabase-admin"
import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
  isAuthRateLimitEnabled,
  RATE_LIMITS,
} from "@/lib/rate-limit"
import { logActivity } from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

/**
 * Server-side proxy para envio de e-mail de recuperação de senha.
 * Usa admin client para gerar o link de recovery.
 * O redirectTo aponta para /reset-password, não para /auth/callback —
 * isso garante que o link abre a tela de redefinição, não faz login silencioso.
 * Controlado por AUTH_RATE_LIMIT_ENABLED=false em desenvolvimento.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  if (isAuthRateLimitEnabled()) {
    const rl = rateLimit(`auth_recovery:${ip}`, RATE_LIMITS.auth_recovery)
    if (!rl.ok) return rateLimitResponse(rl.resetAt)
  }

  const body = await req.json() as { email?: string }
  const email = body.email?.toLowerCase().trim()

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
  }

  const origin = req.headers.get("origin")
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXT_PUBLIC_BASE_URL
    ?? ""

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reset-password` },
  })

  if (error) {
    console.error("[send-recovery] error:", error.message)
    return NextResponse.json(
      { error: "Não foi possível enviar o link. Tente novamente em alguns instantes." },
      { status: 500 },
    )
  }

  void logActivity({
    eventType: "auth",
    action:    "recovery_link_sent",
    detail:    email,
    metadata:  { ip },
  })

  // Resposta genérica — não revelar se o e-mail existe ou não
  return NextResponse.json({ ok: true })
}
