import { NextRequest, NextResponse }       from "next/server"
import { createClient as createBaseClient } from "@supabase/supabase-js"
import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
  isAuthRateLimitEnabled,
  RATE_LIMITS,
} from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Cliente com anon key — sem sessão/cookies.
// resetPasswordForEmail neste cliente faz POST /auth/v1/recover com a anon key,
// que é o mesmo endpoint que o browser SDK usa e que DEFINITIVAMENTE envia o email.
// (admin.generateLink é para gerar link para envio manual — não envia email)
function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurado")
  }
  return createBaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Deriva o origin da URL da própria request — sempre correto em qualquer ambiente.
function getOrigin(req: NextRequest): string {
  const header = req.headers.get("origin")
  if (header) return header
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  console.log(`[send-recovery] POST ip=${ip}`)

  if (isAuthRateLimitEnabled()) {
    const rl = rateLimit(`auth_recovery:${ip}`, RATE_LIMITS.auth_recovery)
    if (!rl.ok) {
      console.warn(`[send-recovery] rate-limited ip=${ip}`)
      return rateLimitResponse(rl.resetAt)
    }
  }

  let body: { email?: string }
  try {
    body = await req.json() as { email?: string }
  } catch {
    console.error("[send-recovery] body parse error")
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email || !email.includes("@")) {
    console.warn(`[send-recovery] invalid email: "${email}"`)
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
  }

  const origin = getOrigin(req)
  // redirectTo aponta para /reset-password, não /auth/callback —
  // assim o link no email abre a tela de redefinição, não faz login silencioso.
  const redirectTo = `${origin}/reset-password`
  console.log(`[send-recovery] email=${email} origin=${origin} redirectTo=${redirectTo}`)

  try {
    const supabase = getAnonClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error(`[send-recovery] supabase error: ${error.message} (status=${error.status})`)
      const msg = error.message.includes("rate limit") || error.message.includes("too many")
        ? "Muitas solicitações de recuperação para este e-mail. Aguarde alguns minutos."
        : "Não foi possível enviar o link. Tente novamente em alguns instantes."
      return NextResponse.json({ error: msg }, { status: 429 })
    }

    console.log(`[send-recovery] OK email=${email}`)
    // Resposta genérica — não revelar se o e-mail existe ou não
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[send-recovery] unexpected error: ${msg}`)
    return NextResponse.json(
      { error: "Erro interno ao enviar e-mail. Verifique as variáveis de ambiente." },
      { status: 500 },
    )
  }
}
