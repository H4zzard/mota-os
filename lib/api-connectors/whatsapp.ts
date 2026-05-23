/**
 * WhatsApp Business API (Meta Cloud API) connector — Jarvis
 *
 * HOW TO ACTIVATE:
 *   1. No package needed — uses the Cloud API REST endpoint.
 *   2. Add to .env.local:
 *        WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx
 *        WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxxxxxxx
 *        WHATSAPP_API_TOKEN=EAAxxxxxxx    (system user token with whatsapp_business_messaging permission)
 *        WHATSAPP_WEBHOOK_VERIFY_TOKEN=xxxxxxxxxx   (arbitrary secret for webhook verification)
 *   3. Uncomment the real implementation blocks and delete the stubs.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export interface WhatsAppConfig {
  /** env: WHATSAPP_PHONE_NUMBER_ID */
  phoneNumberId:     string
  /** env: WHATSAPP_BUSINESS_ACCOUNT_ID */
  businessAccountId: string
  /** env: WHATSAPP_API_TOKEN — system user token */
  apiToken:          string
  apiVersion:        string
}

function getConfig(): WhatsAppConfig {
  return {
    phoneNumberId:     process.env.WHATSAPP_PHONE_NUMBER_ID       ?? "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID   ?? "",
    apiToken:          process.env.WHATSAPP_API_TOKEN              ?? "",
    apiVersion:        "v20.0",
  }
}

const BASE_URL = "https://graph.facebook.com"

// ─── Types ───────────────────────────────────────────────────────────────────

export type WASendStatus = "sent" | "delivered" | "read" | "failed"

export interface WATextMessage {
  to:   string   // international format: "5581999999999"
  type: "text"
  text: { body: string; preview_url?: boolean }
}

export interface WATemplateMessage {
  to:       string
  type:     "template"
  template: {
    name:       string
    language:   { code: string }  // e.g. "pt_BR"
    components: WATemplateComponent[]
  }
}

export interface WATemplateComponent {
  type:       "header" | "body" | "button"
  sub_type?:  "quick_reply" | "url"
  index?:     string
  parameters: { type: "text" | "image" | "document"; text?: string }[]
}

export interface WAMediaMessage {
  to:        string
  type:      "image" | "document" | "audio" | "video"
  image?:    { link: string; caption?: string }
  document?: { link: string; filename?: string; caption?: string }
  audio?:    { link: string }
  video?:    { link: string; caption?: string }
}

export type WAOutboundMessage = WATextMessage | WATemplateMessage | WAMediaMessage

export interface WASendResponse {
  messaging_product: "whatsapp"
  contacts:          { input: string; wa_id: string }[]
  messages:          { id: string; message_status: WASendStatus }[]
}

export interface WATemplate {
  id:       string
  name:     string
  status:   "APPROVED" | "PENDING" | "REJECTED"
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  language: string
}

export interface WAInboundMessage {
  from:      string
  id:        string
  timestamp: string
  type:      "text" | "image" | "audio" | "document" | "interactive" | "button"
  text?:     { body: string }
}

export interface WAWebhookPayload {
  object: "whatsapp_business_account"
  entry:  {
    id:      string
    changes: {
      value: {
        messaging_product: "whatsapp"
        metadata:          { phone_number_id: string }
        contacts?:         { profile: { name: string }; wa_id: string }[]
        messages?:         WAInboundMessage[]
        statuses?:         { id: string; status: WASendStatus; timestamp: string }[]
      }
    }[]
  }[]
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class WhatsAppClient {
  constructor(private config: WhatsAppConfig) {}

  private endpoint(path: string) {
    return `${BASE_URL}/${this.config.apiVersion}/${path}`
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      "Content-Type": "application/json",
    }
  }

  async sendMessage(message: WAOutboundMessage): Promise<WASendResponse> {
    // TODO:
    // const body = { messaging_product: "whatsapp", ...message }
    // const res  = await fetch(this.endpoint(`${this.config.phoneNumberId}/messages`), {
    //   method: "POST", headers: this.headers(), body: JSON.stringify(body),
    // })
    // if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`)
    // return res.json()
    throw new Error("[whatsapp] sendMessage() — TODO: uncomment fetch implementation")
  }

  async sendText(to: string, body: string): Promise<WASendResponse> {
    return this.sendMessage({ to, type: "text", text: { body } })
  }

  async sendTemplate(to: string, templateName: string, languageCode = "pt_BR", components: WATemplateComponent[] = []): Promise<WASendResponse> {
    return this.sendMessage({
      to,
      type: "template",
      template: { name: templateName, language: { code: languageCode }, components },
    })
  }

  async listTemplates(): Promise<WATemplate[]> {
    // TODO:
    // const res  = await fetch(this.endpoint(`${this.config.businessAccountId}/message_templates`), { headers: this.headers() })
    // if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`)
    // const json = await res.json()
    // return json.data
    throw new Error("[whatsapp] listTemplates() — TODO")
  }

  /** Verify webhook token on GET requests from Meta. */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""
    if (mode === "subscribe" && token === expected) return challenge
    return null
  }

  /** Parse incoming webhook payload. */
  parseWebhook(body: unknown): WAInboundMessage[] {
    // TODO: validate signature with HMAC-SHA256 before trusting payload
    const payload = body as WAWebhookPayload
    return payload.entry?.flatMap((e) =>
      e.changes.flatMap((c) => c.value.messages ?? [])
    ) ?? []
  }
}

export function createWhatsAppClient(config = getConfig()): WhatsAppClient {
  return new WhatsAppClient(config)
}
