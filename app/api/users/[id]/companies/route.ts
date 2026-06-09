import { NextRequest, NextResponse } from "next/server"
import { createClient }            from "@/lib/supabase-server"
import { createAdminClient }       from "@/lib/supabase-admin"
import { isGlobalAdmin, ALL_SLUGS } from "@/lib/company-scope"

export const dynamic = "force-dynamic"

// ─── GET — listar vínculos de empresa do usuário ──────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin && user.id !== id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: members, error } = await admin
    .from("company_members")
    .select("company_id, role, status, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })

  return NextResponse.json({ members: members ?? [] })
}

// ─── POST — adicionar / atualizar vínculo ─────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const body = await req.json() as { company_id?: string; role?: string; status?: string }
  if (!body.company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("company_members")
    .upsert(
      {
        user_id:    id,
        company_id: body.company_id,
        role:       body.role   ?? "member",
        status:     body.status ?? "active",
      },
      { onConflict: "user_id,company_id" },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })

  return NextResponse.json({ member: data })
}

// ─── PUT — vincular a várias empresas de uma vez (ex: todas) ──────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const body = await req.json() as { all?: boolean; company_ids?: string[]; role?: string }
  const role = body.role ?? "member"

  // all=true vincula a TODAS as empresas conhecidas; senão usa a lista fornecida
  const targets = body.all
    ? [...ALL_SLUGS]
    : (body.company_ids ?? []).filter((c) => (ALL_SLUGS as string[]).includes(c))

  if (targets.length === 0) {
    return NextResponse.json({ error: "Nenhuma empresa válida informada." }, { status: 400 })
  }

  const admin = createAdminClient()
  const rows = targets.map((company_id) => ({
    user_id:    id,
    company_id,
    role,
    status:     "active",
  }))

  const { data, error } = await admin
    .from("company_members")
    .upsert(rows, { onConflict: "user_id,company_id" })
    .select("company_id, role, status")

  if (error) return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })

  return NextResponse.json({ members: data ?? [] })
}

// ─── DELETE — remover vínculo ─────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("company_id")
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("company_members")
    .delete()
    .eq("user_id", id)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })

  return NextResponse.json({ ok: true })
}
