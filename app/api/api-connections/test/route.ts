import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { logActivity }       from "@/lib/activity-logger"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI    from "openai"

const PROVIDER_NAMES: Record<string, string> = {
  anthropic:    "Anthropic (Claude)",
  openai:       "OpenAI",
  gemini:       "Google Gemini",
  supabase:     "Supabase",
  rocketchat:   "Rocket.Chat",
  meta_ads:     "Meta Ads",
  google_ads:   "Google Ads",
  ga4:          "Google Analytics 4",
  reportei:     "Reportei",
  whatsapp:     "WhatsApp Business",
  google_drive: "Google Drive",
}

const PENDING_PROVIDERS = new Set([
  "meta_ads", "google_ads", "ga4", "reportei", "whatsapp", "google_drive",
])

// ─── POST — testa conexão real com o provedor ─────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { provider } = await req.json() as { provider: string }

  if (!provider) {
    return NextResponse.json({ error: "provider obrigatório" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch config from DB
  const { data: row } = await admin
    .from("api_connections")
    .select("config")
    .eq("provider", provider)
    .maybeSingle()

  const config = (row?.config ?? {}) as Record<string, string>

  let testOk   = false
  let errMsg   = ""
  let pending  = false

  if (PENDING_PROVIDERS.has(provider)) {
    pending = true
    errMsg  = "Teste real ainda não implementado para este provedor. Salve as credenciais para marcar como configurado."
  } else {
    try {
      switch (provider) {
        case "anthropic": {
          const apiKey = config.api_key
          if (!apiKey) throw new Error("api_key não configurada")
          const client = new Anthropic({ apiKey })
          await client.messages.create({
            model:    "claude-3-5-haiku-latest",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          })
          testOk = true
          break
        }

        case "openai": {
          const apiKey = config.api_key
          if (!apiKey) throw new Error("api_key não configurada")
          const client = new OpenAI({ apiKey })
          await client.models.list()
          testOk = true
          break
        }

        case "gemini": {
          const apiKey = config.api_key
          if (!apiKey) throw new Error("api_key não configurada")
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          testOk = true
          break
        }

        case "supabase": {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!url || !key) {
            throw new Error(
              "Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configuradas"
            )
          }
          const res = await fetch(`${url}/rest/v1/`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          testOk = true
          break
        }

        case "rocketchat": {
          const mode = config.mode ?? "rest"
          if (mode === "webhook") {
            const { webhook_url, default_channel, alias } = config
            if (!webhook_url) throw new Error("webhook_url é obrigatório")
            const res = await fetch(webhook_url, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                alias:   alias || "Mota OS",
                channel: default_channel || "",
                text:    "✅ Teste de conexão do Mota OS com Rocket.Chat realizado com sucesso.",
              }),
            })
            if (!res.ok) {
              let errBody = ""
              try { errBody = await res.text() } catch { /* noop */ }
              throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ""}`)
            }
          } else {
            const { url, user_id, auth_token } = config
            if (!url || !user_id || !auth_token) {
              throw new Error("url, user_id e auth_token são obrigatórios")
            }
            const res = await fetch(`${url.replace(/\/$/, "")}/api/v1/me`, {
              headers: { "X-Auth-Token": auth_token, "X-User-Id": user_id },
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
          }
          testOk = true
          break
        }

        default:
          throw new Error(`Provedor desconhecido: ${provider}`)
      }
    } catch (err: unknown) {
      errMsg = err instanceof Error ? err.message : "Erro desconhecido"
    }
  }

  const newStatus = pending ? "configured" : (testOk ? "connected" : "error")
  const now       = new Date().toISOString()

  // Update existing row status
  const { data: updated } = await admin
    .from("api_connections")
    .update({
      status:         newStatus,
      last_tested_at: now,
      error_message:  testOk ? null : errMsg,
    })
    .eq("provider", provider)
    .select("id")

  // If no row existed yet (e.g., supabase tested without saving), create one
  if (!updated || updated.length === 0) {
    await admin.from("api_connections").insert({
      provider,
      name:           PROVIDER_NAMES[provider] ?? provider,
      status:         newStatus,
      config:         {},
      last_tested_at: now,
      error_message:  testOk ? null : errMsg,
    })
  }

  void logActivity({
    userId:    user.id,
    eventType: "api",
    action:    "Conexão de API testada",
    detail:    `${PROVIDER_NAMES[provider] ?? provider} — ${newStatus}`,
    metadata:  { provider, status: newStatus, pending, error: errMsg || null },
  })

  return NextResponse.json({
    ok:      testOk,
    pending,
    status:  newStatus,
    message: errMsg,
  })
}
