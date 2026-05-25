import { NextResponse }    from "next/server"
import { createClient }    from "@/lib/supabase-server"
import { isGlobalAdmin }   from "@/lib/company-scope"
import { refreshContaAzulTokenIfNeeded, contaAzulFetch } from "@/lib/integrations/conta-azul"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  // Valida token OAuth sem expor o valor
  const accessToken = await refreshContaAzulTokenIfNeeded()
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, connected: false, message: "Token OAuth ausente ou expirado. Reconecte a Conta Azul." },
      { status: 400 },
    )
  }

  const testEndpoint = process.env.CONTA_AZUL_TEST_ENDPOINT?.trim() || null

  // Sem endpoint de teste configurado: apenas confirma que OAuth funciona
  if (!testEndpoint) {
    return NextResponse.json({
      ok:        true,
      connected: true,
      message:   "OAuth conectado. Endpoint de teste não configurado. Defina CONTA_AZUL_TEST_ENDPOINT no .env.local para testar a API.",
    })
  }

  // Com endpoint configurado: tenta chamar e retorna resultado sem inventar dados
  try {
    const res = await contaAzulFetch(testEndpoint, {}, accessToken)
    const body = await res.json().catch(() => null)

    return NextResponse.json({
      ok:        res.ok,
      connected: true,
      http_status: res.status,
      endpoint:  testEndpoint,
      message: res.ok
        ? `Endpoint respondeu ${res.status}. API acessível.`
        : `Endpoint retornou ${res.status}. Verifique CONTA_AZUL_TEST_ENDPOINT.`,
      response_preview: body !== null
        // Retorna apenas os primeiros campos para diagnóstico — nunca tokens
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (Array.isArray(body) ? `Array com ${body.length} itens` : Object.keys(body as Record<string, any>).slice(0, 8).join(", "))
        : null,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok:        false,
        connected: true,
        message:   `Erro ao chamar endpoint: ${e instanceof Error ? e.message : "Erro desconhecido"}`,
      },
      { status: 500 },
    )
  }
}
