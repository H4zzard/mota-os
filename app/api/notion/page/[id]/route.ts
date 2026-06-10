import { NextRequest, NextResponse } from "next/server"
import { createClient }         from "@/lib/supabase-server"
import { createAdminClient }    from "@/lib/supabase-admin"
import { getAllowedCompanyIds, isGlobalAdmin } from "@/lib/company-scope"
import { getNotionClientForCompany, fetchPageContent } from "@/lib/notion"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
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

  const notion = await getNotionClientForCompany(companyId)
  if (!notion) return NextResponse.json({ error: "Notion não conectado" }, { status: 404 })

  try {
    const { title, content } = await fetchPageContent(notion, id)
    return NextResponse.json({ id, title, content })
  } catch (err) {
    console.error("[notion/page]", err)
    return NextResponse.json({ error: "Erro ao buscar conteúdo da página" }, { status: 500 })
  }
}

// ─── POST: salvar página do Notion como Knowledge Source ──────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body      = await req.json() as { company_id?: string }
  const companyId = body.company_id
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const [isAdmin, allowed] = await Promise.all([
    isGlobalAdmin(user.id),
    getAllowedCompanyIds(user.id),
  ])

  if (!isAdmin && !(allowed as string[]).includes(companyId)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const notion = await getNotionClientForCompany(companyId)
  if (!notion) return NextResponse.json({ error: "Notion não conectado" }, { status: 404 })

  try {
    const { title, content } = await fetchPageContent(notion, id)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("knowledge_sources")
      .insert({
        company_id:       companyId,
        name:             title,
        type:             "notion",
        description:      `Importado do Notion — ID: ${id}`,
        content,
        status:           "active",
        embedding_status: "pending",
        created_by:       user.id,
      })
      .select("id, name")
      .single()

    if (error) return NextResponse.json({ error: "Erro ao salvar fonte" }, { status: 500 })

    return NextResponse.json({ source: data })
  } catch (err) {
    console.error("[notion/page POST]", err)
    return NextResponse.json({ error: "Erro ao importar página" }, { status: 500 })
  }
}
