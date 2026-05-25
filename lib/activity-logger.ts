/**
 * Helper server-side para gravar logs em activity_logs.
 * Nunca lança exceção — erros são apenas logados no console do servidor.
 * Nunca salvar API keys, tokens, senhas ou conteúdo de mensagens.
 * SERVER-SIDE ONLY — nunca importar em Client Components.
 */

import { createAdminClient } from "@/lib/supabase-admin"

export type LogEventType =
  | "chat"
  | "workflow"
  | "auto"
  | "source"
  | "watcher"
  | "auth"
  | "settings"
  | "api"

export interface LogActivityParams {
  userId?:    string | null
  eventType:  LogEventType
  action:     string
  detail?:    string
  metadata?:  Record<string, unknown>
  companyId?: string
  sessionId?: string
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("activity_logs").insert({
      user_id:    params.userId ?? null,
      event_type: params.eventType,
      action:     params.action,
      detail:     params.detail ?? "",
      metadata:   params.metadata ?? {},
      company_id: params.companyId ?? null,
      session_id: params.sessionId ?? null,
    })
  } catch (err) {
    console.error("[activity-logger] Falha ao gravar log:", err)
  }
}
