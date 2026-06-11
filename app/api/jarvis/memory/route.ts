import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAllowedCompanyIds, isGlobalAdmin } from "@/lib/company-scope"

export const dynamic = "force-dynamic"

// Governança da memória do Jarvis: listar e apagar (por empresa).

async function checkAccess(userId: string, companyId: string): Promise<boolean> {
  const [isAdmin, allowed] = await Promise.all([
    isGlobalAdmin(userId),
    getAllowedCompanyIds(userId),
  ])
  return isAdmin || (allowed as string[]).includes(companyId)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const companyId = new URL(req.url).searchParams.get("company_id")
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
  if (!(await checkAccess(user.id, companyId))) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("jarvis_memories")
    .select("id, content, kind, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: "Erro ao listar" }, { status: 500 })
  return NextResponse.json({ memories: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { id?: string; company_id?: string }
  if (!body.id || !body.company_id) {
    return NextResponse.json({ error: "id e company_id obrigatórios" }, { status: 400 })
  }
  if (!(await checkAccess(user.id, body.company_id))) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("jarvis_memories")
    .delete()
    .eq("id", body.id)
    .eq("company_id", body.company_id) // garante escopo

  if (error) return NextResponse.json({ error: "Erro ao apagar" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
