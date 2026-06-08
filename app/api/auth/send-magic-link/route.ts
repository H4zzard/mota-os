import { NextRequest, NextResponse }   from "next/server"
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
// signInWithOtp neste cliente faz POST /auth/v1/otp com a anon key,
// que é o mesmo endpoint que o browser SDK usa e que DEFINITIVAMENTE envia o email.
// (admin.generateLink é para gerar o link para você enviar manualmente — não envia email)
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
  console.log(`[send-magic-link] POST ip=${ip}`)

  if (isAuthRateLimitEnabled()) {
    const rl = rateLimit(`auth_magic_link:${ip}`, RATE_LIMITS.auth_magic_link)
    if (!rl.ok) {
      console.warn(`[send-magic-link] rate-limited ip=${ip}`)
      return rateLimitResponse(rl.resetAt)
    }
  }

  let body: { email?: string }
  try {
    body = await req.json() as { email?: string }
  } catch {
    console.error("[send-magic-link] body parse error")
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email || !email.includes("@")) {
    console.warn(`[send-magic-link] invalid email: "${email}"`)
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
  }

  const origin = getOrigin(req)
  const redirectTo = `${origin}/auth/callback`
  console.log(`[send-magic-link] email=${email} origin=${origin} redirectTo=${redirectTo}`)

  try {
    const supabase = getAnonClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      console.error(`[send-magic-link] supabase error: ${error.message} (status=${error.status})`)
      const msg = error.message.includes("rate limit") || error.message.includes("too many")
        ? "Muitas solicitações de link mágico para este e-mail. Aguarde alguns minutos."
        : "Não foi possível enviar o link. Tente novamente em alguns instantes."
      return NextResponse.json({ error: msg }, { status: 429 })
    }

    console.log(`[send-magic-link] OK email=${email}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[send-magic-link] unexpected error: ${msg}`)
    return NextResponse.json(
      { error: "Erro interno ao enviar link. Verifique as variáveis de ambiente." },
      { status: 500 },
    )
  }
}
