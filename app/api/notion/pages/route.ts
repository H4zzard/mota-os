import { NextRequest, NextResponse } from "next/server"
import { createClient }         from "@/lib/supabase-server"
import { getAllowedCompanyIds, isGlobalAdmin } from "@/lib/company-scope"
import { getNotionClientForCompany, searchPages } from "@/lib/notion"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("company_id")
  const query     = searchParams.get("q") ?? ""

  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const [isAdmin, allowed] = await Promise.all([
    isGlobalAdmin(user.id),
    getAllowedCompanyIds(user.id),
  ])

  if (!isAdmin && !(allowed as string[]).includes(companyId)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const notion = await getNotionClientForCompany(companyId)
  if (!notion) {
    return NextResponse.json({ error: "Notion não conectado para esta empresa", not_connected: true }, { status: 404 })
  }

  try {
    const pages = await searchPages(notion, query || undefined)
    return NextResponse.json({ pages })
  } catch (err) {
    console.error("[notion/pages]", err)
    return NextResponse.json({ error: "Erro ao buscar páginas do Notion" }, { status: 500 })
  }
}
