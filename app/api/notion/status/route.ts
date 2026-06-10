import { NextRequest, NextResponse } from "next/server"
import { createClient }         from "@/lib/supabase-server"
import { getAllowedCompanyIds, isGlobalAdmin } from "@/lib/company-scope"
import { getNotionIntegration } from "@/lib/notion"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("company_id")
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const [isAdmin, allowed] = await Promise.all([
    isGlobalAdmin(user.id),
    getAllowedCompanyIds(user.id),
  ])

  if (!isAdmin && !(allowed as string[]).includes(companyId)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const integration = await getNotionIntegration(companyId)

  if (!integration) {
    return NextResponse.json({ connected: false, workspace_name: null, workspace_icon: null, connected_at: null })
  }

  // Nunca expõe o access_token
  return NextResponse.json({
    connected:      true,
    workspace_name: integration.workspace_name,
    workspace_icon: integration.workspace_icon,
    connected_at:   integration.connected_at,
  })
}
