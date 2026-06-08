import { createClient } from "@/lib/supabase-server"
import { NextResponse }  from "next/server"

/**
 * Callback do Supabase Auth (Magic Link e invite).
 *
 * type=recovery → NÃO troca o código aqui. Redireciona para /reset-password
 * com o code intacto — a própria página faz exchangeCodeForSession.
 * Isso evita que um recovery link que acabe aqui (redirect_to mal configurado
 * no Supabase Dashboard) autentique o usuário silenciosamente e o mande
 * ao dashboard sem que ele redefina a senha.
 *
 * type=magiclink / invite → troca normalmente e vai ao dashboard (ou ?next).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")   // 'recovery' | 'magiclink' | 'invite' | null
  const next = searchParams.get("next") ?? "/dashboard"

  // ── Recovery: passa o code para /reset-password sem trocar ───────────────────
  // A página /reset-password chama exchangeCodeForSession ela mesma.
  if (type === "recovery" && code) {
    const url = new URL("/reset-password", origin)
    url.searchParams.set("code", code)
    return NextResponse.redirect(url.toString())
  }

  // ── Magic link / invite: troca o código e vai ao destino ─────────────────────
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const url = new URL("/login", origin)
      url.searchParams.set("error", "link_inválido")
      return NextResponse.redirect(url.toString())
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
