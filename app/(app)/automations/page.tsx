import { createAdminClient } from "@/lib/supabase-admin"
import { createClient }      from "@/lib/supabase-server"
import { AutomationsClient } from "./AutomationsClient"
import { workflows }         from "@/lib/mocks/workflows"

export type AutomationRow = {
  id:          string
  name:        string
  description: string
  workflow_id: string
  company_id:  string
  frequency:   "manual" | "daily" | "weekly" | "monthly"
  status:      "active" | "paused"
  config:      { values?: Record<string, string | string[]>; context?: string }
  last_run_at: string | null
  next_run_at: string | null
  created_at:  string
}

export type WatcherRow = {
  id:                   string
  name:                 string
  description:          string
  company_id:           string
  watcher_type:         string
  condition:            Record<string, unknown>
  condition_config:     Record<string, unknown>
  frequency:            "manual" | "hourly" | "daily" | "weekly" | "monthly"
  schedule_time:        string | null
  timezone:             string
  days_of_week:         string[] | null
  enabled:              boolean
  status:               "active" | "paused"
  last_check_at:        string | null
  next_check_at:        string | null
  last_result:          { status: "ok" | "alert" | "warning" | "error"; message: string; triggered: boolean } | null
  notification_channel: string
  notification_config:  Record<string, unknown>
  triggers_count:       number
  created_at:           string
}

export { workflows as workflowOptions }

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let automations: AutomationRow[] = []

  if (user) {
    const admin = createAdminClient()
    const { data: aData } = await admin
      .from("automations")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
    automations = (aData ?? []) as AutomationRow[]
  }

  return <AutomationsClient automations={automations} watchers={[]} />
}
