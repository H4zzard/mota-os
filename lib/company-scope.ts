/**
 * Helpers server-side para escopo por empresa.
 * SERVER-SIDE ONLY — nunca importar em Client Components.
 */

import { createAdminClient } from "@/lib/supabase-admin"

export type CompanySlug = "grupo" | "cppem" | "unicive" | "colegio" | "everton"

export const ALL_SLUGS: CompanySlug[] = ["grupo", "cppem", "unicive", "colegio", "everton"]

// ─── Funções base ─────────────────────────────────────────────────────────────

export async function isGlobalAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()
  return data?.role === "admin"
}

/** Retorna os slugs das empresas onde o usuário é membro ativo.
 *  Admin global recebe todos os slugs. */
export async function getAllowedCompanyIds(userId: string): Promise<CompanySlug[]> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (profile?.role === "admin") return ALL_SLUGS

  const { data: memberships } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")

  return (memberships ?? []).map(r => r.company_id as CompanySlug)
}

/** Lança erro se o usuário não pode acessar a empresa informada. */
export async function assertCanAccessCompany(userId: string, companyId: string): Promise<void> {
  const allowed = await getAllowedCompanyIds(userId)
  if (!allowed.includes(companyId as CompanySlug)) {
    throw new Error(`Sem acesso à empresa: ${companyId}`)
  }
}

/** Retorna a empresa ativa do usuário (default_company_id validado contra memberships). */
export async function getCurrentCompany(userId: string): Promise<CompanySlug> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role, default_company_id")
    .eq("id", userId)
    .single()

  if (profile?.role === "admin") {
    return (profile.default_company_id as CompanySlug) ?? "grupo"
  }

  const allowed = await getAllowedCompanyIds(userId)
  if (allowed.length === 0) return "grupo"

  const preferred = profile?.default_company_id as CompanySlug | undefined
  return preferred && allowed.includes(preferred) ? preferred : allowed[0]
}
