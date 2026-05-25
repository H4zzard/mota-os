/**
 * Resolve company_id a partir de dados de uma venda usando sales_company_mapping.
 * SERVER-SIDE ONLY.
 */

import { createAdminClient } from "@/lib/supabase-admin"
import type { CompanySlug }  from "@/lib/company-scope"

export interface SaleFields {
  source:       string
  product_id?:  string | null
  product_name?: string | null
  offer_name?:  string | null
  utm_campaign?: string | null
}

export async function resolveCompanyFromSale(
  fields: SaleFields,
): Promise<CompanySlug | null> {
  const admin = createAdminClient()
  const { data: mappings } = await admin
    .from("sales_company_mapping")
    .select("match_type, match_value, company_id")
    .eq("source", fields.source)
    .eq("active", true)
    .order("created_at", { ascending: true })

  if (!mappings || mappings.length === 0) return null

  const lower = (s?: string | null) => (s ?? "").toLowerCase()

  for (const m of mappings) {
    const val = lower(m.match_value)
    switch (m.match_type) {
      case "explicit_company":
        return m.company_id as CompanySlug

      case "product_id":
        if (fields.product_id && lower(fields.product_id) === val)
          return m.company_id as CompanySlug
        break

      case "product_name_contains":
        if (fields.product_name && lower(fields.product_name).includes(val))
          return m.company_id as CompanySlug
        break

      case "offer_name_contains":
        if (fields.offer_name && lower(fields.offer_name).includes(val))
          return m.company_id as CompanySlug
        break

      case "utm_campaign_contains":
        if (fields.utm_campaign && lower(fields.utm_campaign).includes(val))
          return m.company_id as CompanySlug
        break
    }
  }

  return null
}
