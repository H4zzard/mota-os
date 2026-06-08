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
 * Server-side proxy para envio de magic link.
 * Usa o admin client (service_role) para gerar o link, que tem limites de
 * rate-limit separados dos clientes (anon key) do Supabase.
 * Controlado por AUTH_RATE_LIMIT_ENABLED=false em desenvolvimento.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit por IP (apenas se habilitado)
  if (isAuthRateLimitEnabled()) {
    const rl = rateLimit(`auth_magic_link:${ip}`, RATE_LIMITS.auth_magic_link)
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

  // generateLink via admin API tem rate limits distintos do client-side signInWithOtp.
  // O Supabase envia o e-mail automaticamente via SMTP configurado.
  const { error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    console.error("[send-magic-link] error:", error.message)
    // Retornar mensagem genérica — não vazar informação sobre existência de conta
    return NextResponse.json(
      { error: "Não foi possível enviar o link. Tente novamente em alguns instantes." },
      { status: 500 },
    )
  }

  void logActivity({
    eventType: "auth",
    action:    "magic_link_sent",
    detail:    email,
    metadata:  { ip },
  })

  return NextResponse.json({ ok: true })
}
