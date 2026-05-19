import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'
import { createAdminClient } from "@/lib/supabase-admin"
import { getAllowedCompanyIds, getCurrentCompany, ALL_SLUGS } from "@/lib/company-scope"
import { logActivity } from "@/lib/activity-logger"

// ─── GET — empresa ativa e lista permitida ────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const admin = createAdminClient()

  const [currentSlug, allowedSlugs] = await Promise.all([
    getCurrentCompany(user.id),
    getAllowedCompanyIds(user.id),
  ])

  const { data: companies } = await admin
    .from("companies")
    .select("slug, name, color, initials, description, active")
    .in("slug", allowedSlugs.length > 0 ? allowedSlugs : ALL_SLUGS)
    .eq("active", true)

  const companyMap = new Map((companies ?? []).map(c => [c.slug, c]))

  const allowed = allowedSlugs
    .map(s => companyMap.get(s))
    .filter(Boolean) as typeof companies

  const current = companyMap.get(currentSlug) ?? null

  return NextResponse.json({ company: current, allowed: allowed ?? [] })
}

// ─── PATCH — atualizar empresa ativa ─────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { company_id } = await req.json() as { company_id?: string }

  if (!company_id || !(ALL_SLUGS as string[]).includes(company_id)) {
    return NextResponse.json({ error: "company_id inválido" }, { status: 400 })
  }

  const allowed = await getAllowedCompanyIds(user.id)
  if (!allowed.includes(company_id as typeof ALL_SLUGS[number])) {
    return NextResponse.json({ error: "Sem acesso a esta empresa" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ default_company_id: company_id })
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void logActivity({
    userId:    user.id,
    eventType: "settings",
    action:    "Empresa ativa alterada",
    detail:    company_id,
    companyId: company_id,
  })

  return NextResponse.json({ ok: true, company_id })
}
