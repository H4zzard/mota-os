/**
 * lib/api-guard.ts — Padrão de rejeição de acesso a APIs.
 * SERVER-SIDE ONLY. Nunca importar em Client Components.
 *
 * Uso:
 *   return denyAccess({ req, userId: user.id, reason: "not_admin" })
 */

import { type NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger"

export interface DenyAccessOpts {
  /** ID do usuário autenticado que tentou o acesso (null se não autenticado). */
  userId?:  string | null
  /** Request original — usado para extrair rota, método e IP. */
  req?:     NextRequest
  /** Rota manual quando req não está disponível (ex: "GET /api/api-connections"). */
  route?:   string
  /** Razão interna do bloqueio, gravada no log mas não exposta ao cliente. */
  reason?:  "not_admin" | "not_company_member" | "forbidden" | string
}

/**
 * Rejeita a requisição com 403, exibe mensagem padronizada ao cliente
 * e registra a tentativa em activity_logs com rota, método e IP.
 * O log é disparado de forma assíncrona — nunca bloqueia a resposta.
 */
export function denyAccess(opts: DenyAccessOpts): NextResponse {
  const { userId, req, reason = "forbidden" } = opts

  const route     = opts.route ?? (req ? new URL(req.url).pathname : "rota desconhecida")
  const method    = req?.method ?? "UNKNOWN"
  const ip        = req
    ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim()
       ?? req.headers.get("x-real-ip")
       ?? null)
    : null
  const userAgent = req?.headers.get("user-agent") ?? null

  void logActivity({
    userId:    userId ?? null,
    eventType: "auth",
    action:    "access_denied",
    detail:    `${method} ${route}`,
    metadata:  {
      reason,
      route,
      method,
      ip,
      user_agent: userAgent,
    },
  })

  return NextResponse.json(
    { error: "Acesso negado. Você não tem permissão para realizar esta ação." },
    { status: 403 },
  )
}
