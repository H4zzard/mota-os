/**
 * Helpers server-side para escopo por empresa e hierarquia de permissões.
 * SERVER-SIDE ONLY — nunca importar em Client Components.
 *
 * Hierarquia:
 *   - 'grupo' é a empresa-mãe: apenas admin pode acessá-la.
 *   - Admin global (profiles.role = 'admin') vê todas as empresas.
 *   - Não-admin só vê empresas vinculadas em company_members (sem 'grupo').
 */

import { createAdminClient } from "@/lib/supabase-admin"

export type CompanySlug = "grupo" | "cppem" | "unicive" | "colegio" | "everton"

export const ALL_SLUGS: CompanySlug[] = ["grupo", "cppem", "unicive", "colegio", "everton"]

export const CHILD_SLUGS: CompanySlug[] = ["cppem", "unicive", "colegio", "everton"]

// Empresa-mãe/holding — apenas admin pode acessar
export const PARENT_COMPANY: CompanySlug = "grupo"

export function isParentCompany(companyId: string): boolean {
  return companyId === PARENT_COMPANY
}

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

/**
 * Retorna os slugs das empresas onde o usuário tem acesso.
 * - Admin global: todas as empresas (incluindo grupo).
 * - Não-admin: apenas empresas vinculadas em company_members, EXCLUINDO 'grupo'.
 */
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

  // Não-admin nunca recebe 'grupo'
  return (memberships ?? [])
    .map(r => r.company_id as CompanySlug)
    .filter(slug => slug !== PARENT_COMPANY)
}

/**
 * Lança erro se o usuário não pode acessar a empresa informada.
 * Regra extra: 'grupo' apenas para admin.
 */
export async function assertCanAccessCompany(userId: string, companyId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  const isAdmin = profile?.role === "admin"

  if (isParentCompany(companyId) && !isAdmin) {
    throw new Error("Grupo Mota é uma visão administrativa e não está disponível para seu perfil.")
  }

  if (!isAdmin) {
    const allowed = await getAllowedCompanyIds(userId)
    if (!allowed.includes(companyId as CompanySlug)) {
      throw new Error(`Sem acesso à empresa: ${companyId}`)
    }
  }
}

/**
 * Retorna a empresa ativa do usuário:
 * - Admin: default_company_id (pode ser 'grupo')
 * - Não-admin: default_company_id validado; se for 'grupo' ou não permitido,
 *   retorna primeira empresa vinculada; se nenhuma, retorna 'cppem' como fallback.
 */
export async function getCurrentCompany(userId: string): Promise<CompanySlug> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role, default_company_id")
    .eq("id", userId)
    .single()

  const isAdmin = profile?.role === "admin"

  if (isAdmin) {
    return (profile?.default_company_id as CompanySlug) ?? PARENT_COMPANY
  }

  // Não-admin: valida e exclui grupo
  const allowed = await getAllowedCompanyIds(userId)
  if (allowed.length === 0) return "cppem" // fallback sem vínculos

  const preferred = profile?.default_company_id as CompanySlug | undefined
  if (preferred && preferred !== PARENT_COMPANY && allowed.includes(preferred)) {
    return preferred
  }

  return allowed[0]
}

/**
 * Retorna o role global do usuário (profiles.role).
 * Trata 'editor' (legacy) como 'member'.
 */
export async function getUserRole(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  const role = data?.role ?? "viewer"
  // Compatibilidade: 'editor' = 'member'
  return role === "editor" ? "member" : role
}
