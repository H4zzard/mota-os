import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { isGlobalAdmin } from "@/lib/company-scope"

export const dynamic = "force-dynamic"

/**
 * Diagnóstico de variáveis de ambiente no runtime.
 *
 * SEGURANÇA:
 *   - Apenas admin global pode acessar.
 *   - Retorna SOMENTE presença (true/false), NUNCA o valor.
 *   - Nenhum token, secret ou chave é exposto ou logado.
 *
 * Use em produção (Vercel) para confirmar quais variáveis chegaram ao runtime.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }
  if (!(await isGlobalAdmin(user.id))) {
    return NextResponse.json({ error: "Apenas admin." }, { status: 403 })
  }

  const has = (k: string) => !!process.env[k] && process.env[k]!.trim().length > 0

  return NextResponse.json({
    runtime: {
      vercel:        !!process.env.VERCEL,
      vercel_env:    process.env.VERCEL_ENV ?? null,   // "production" | "preview" | "development"
      node_env:      process.env.NODE_ENV ?? null,
    },
    anthropic: {
      // Funciona se houver API key OU as três variáveis Auth0 WIF
      api_key:           has("ANTHROPIC_API_KEY"),
      auth0_domain:      has("AUTH0_DOMAIN"),
      auth0_client_id:   has("AUTH0_CLIENT_ID"),
      auth0_secret:      has("AUTH0_CLIENT_SECRET"),
      configured:        has("ANTHROPIC_API_KEY") ||
                         (has("AUTH0_DOMAIN") && has("AUTH0_CLIENT_ID") && has("AUTH0_CLIENT_SECRET")),
    },
    gemini: {
      api_key:           has("GEMINI_API_KEY"),
      service_account:   has("GOOGLE_SERVICE_ACCOUNT_KEY"),
      google_client_id:  has("GOOGLE_CLIENT_ID"),
      configured:        has("GEMINI_API_KEY") || has("GOOGLE_SERVICE_ACCOUNT_KEY") || has("GOOGLE_CLIENT_ID"),
    },
    openai: {
      api_key:           has("OPENAI_API_KEY"),
      oauth_client_id:   has("OPENAI_OAUTH_CLIENT_ID"),
      configured:        has("OPENAI_API_KEY") || has("OPENAI_OAUTH_CLIENT_ID"),
    },
    deepseek: {
      api_key:           has("DEEPSEEK_API_KEY"),
      configured:        has("DEEPSEEK_API_KEY"),
    },
    supabase: {
      url:               has("NEXT_PUBLIC_SUPABASE_URL"),
      anon_key:          has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      service_role:      has("SUPABASE_SERVICE_ROLE_KEY"),
    },
  })
}
