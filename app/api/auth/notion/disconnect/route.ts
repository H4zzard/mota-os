import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { isGlobalAdmin, getCurrentCompany } from "@/lib/company-scope"
import { logActivity } from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const body      = await req.json() as { company_id?: string }
  const companyId = body.company_id ?? await getCurrentCompany(user.id)

  const admin = createAdminClient()
  const { error } = await admin
    .from("notion_integrations")
    .delete()
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 })

  void logActivity({
    userId:    user.id,
    eventType: "settings",
    action:    "notion_disconnected",
    detail:    companyId,
    companyId,
  })

  return NextResponse.json({ ok: true })
}
