import { NextRequest, NextResponse } from "next/server"
import { createClient }             from "@/lib/supabase-server"
import { isGlobalAdmin }            from "@/lib/company-scope"
import { persistEndpoint }          from "@/lib/integrations/conta-azul"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const adminUser = await isGlobalAdmin(user.id)
  if (!adminUser) return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { path?: string; variant?: string }

  if (!body.path || typeof body.path !== "string") {
    return NextResponse.json({ error: "path é obrigatório" }, { status: 400 })
  }

  await persistEndpoint(body.path, body.variant ?? "start_date/end_date")

  return NextResponse.json({ ok: true, saved_endpoint: body.path, saved_variant: body.variant })
}
