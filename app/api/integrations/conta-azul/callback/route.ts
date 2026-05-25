import { NextRequest, NextResponse } from "next/server"
import { cookies }                   from "next/headers"
import { createClient }              from "@/lib/supabase-server"
import { isGlobalAdmin }             from "@/lib/company-scope"
import { saveContaAzulTokens }       from "@/lib/integrations/conta-azul"
import { logActivity }               from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

// Monta URL de redirect usando APP_URL — nunca localhost
function buildRedirect(req: NextRequest, path: string): URL {
  const appUrl = process.env.APP_URL || req.nextUrl.origin
  return new URL(path, appUrl)
}

export async function GET(req: NextRequest) {
  const url   = req.nextUrl
  const code  = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  const cookieStore    = await cookies()
  const savedState     = cookieStore.get("conta_azul_oauth_state")?.value
  const redirectAfter  = cookieStore.get("conta_azul_oauth_redirect")?.value
                         || "/settings?tab=apis&provider=conta_azul"

  function errorRedirect(msg: string): NextResponse {
    const dest = buildRedirect(req, redirectAfter)
    dest.searchParams.set("conta_azul_error", msg)
    return NextResponse.redirect(dest)
  }

  // Erros retornados pela Conta Azul
  if (error) {
    const desc = url.searchParams.get("error_description") ?? error
    return errorRedirect(desc)
  }

  if (!code || !state) {
    return errorRedirect("parametros_invalidos")
  }

  // Verifica autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(buildRedirect(req, "/login"))
  }

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) {
    return errorRedirect("sem_permissao")
  }

  // Valida state CSRF
  if (!savedState || savedState !== state) {
    return errorRedirect("state_invalido")
  }

  // Limpa cookies de estado imediatamente
  cookieStore.delete("conta_azul_oauth_state")
  cookieStore.delete("conta_azul_oauth_redirect")

  // Lê redirect_uri do env — idêntico ao usado no connect
  const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI
  if (!redirectUri) {
    return errorRedirect("CONTA_AZUL_REDIRECT_URI não configurado")
  }

  const clientId     = process.env.CONTA_AZUL_CLIENT_ID     ?? ""
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET ?? ""
  const tokenUrl     = process.env.CONTA_AZUL_TOKEN_URL || "https://auth.contaazul.com/oauth2/token"

  // Troca code por tokens
  try {
    const res = await fetch(tokenUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Token exchange ${res.status}: ${text}`)
    }

    const tokens = await res.json() as {
      access_token:  string
      refresh_token: string
      expires_in:    number
    }
    await saveContaAzulTokens(tokens)

    void logActivity({
      userId:    user.id,
      eventType: "api",
      action:    "Conta Azul conectada via OAuth",
      detail:    "Tokens salvos com sucesso",
      metadata:  { provider: "conta_azul" },
    })

    const dest = buildRedirect(req, redirectAfter)
    dest.searchParams.set("conta_azul_success", "conectado")
    return NextResponse.redirect(dest)

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido"

    void logActivity({
      userId:    user.id,
      eventType: "api",
      action:    "Conta Azul falha ao conectar",
      detail:    "Erro na troca de tokens",
      metadata:  { provider: "conta_azul" },
    })

    return errorRedirect(msg)
  }
}
