"use client"

import { useCompany } from "@/components/providers/CompanyProvider"
import { useAgents } from "@/hooks/useAgents"
import { AgentsClient } from "./AgentsClient"

export default function AgentsPage() {
  const { currentCompany, loading: companyLoading } = useCompany()
  const companyId = currentCompany?.slug
  const { agents, loading, error, reload } = useAgents(companyId)

  return (
    <AgentsClient
      agents={agents}
      loading={companyLoading || loading}
      error={error}
      onReload={reload}
    />
  )
}
