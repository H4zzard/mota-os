/**
 * Rocket.Chat connector — Mota OS
 * Credenciais em .env.local:
 *   ROCKETCHAT_URL          → https://rocketchat.gmeducacao.tech
 *   ROCKETCHAT_USER_ID      → ID do usuário/bot
 *   ROCKETCHAT_AUTH_TOKEN   → Token de autenticação
 *   ROCKETCHAT_WEBHOOK_URL  → Incoming webhook para envio simples
 *
 * Dois modos disponíveis:
 *   REST API  — leitura de canais/mensagens + envio autenticado
 *   Webhook   — envio simples via incoming webhook (sem auth headers)
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export interface RocketChatConfig {
  baseUrl:      string
  userId:       string
  authToken:    string
  webhookUrl?:  string
}

function getConfig(): RocketChatConfig {
  return {
    baseUrl:     process.env.ROCKETCHAT_URL          ?? "",
    userId:      process.env.ROCKETCHAT_USER_ID      ?? "",
    authToken:   process.env.ROCKETCHAT_AUTH_TOKEN   ?? "",
    webhookUrl:  process.env.ROCKETCHAT_WEBHOOK_URL,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RCRoom {
  _id:          string
  name:         string
  fname?:       string
  t:            "c" | "d" | "p" | "l"
  usersCount:   number
  msgs:         number
  lastMessage?: { msg: string; ts: string }
}

export interface RCMessage {
  _id:       string
  rid:       string
  msg:       string
  ts:        string
  u:         { _id: string; username: string; name: string }
  mentions?: { _id: string; username: string }[]
}

export interface RCUser {
  _id:      string
  username: string
  name:     string
  status:   "online" | "busy" | "away" | "offline"
}

export interface RCSendMessageParams {
  roomId:  string
  text:    string
  alias?:  string
  emoji?:  string
  attachments?: RCAttachment[]
}

export interface RCAttachment {
  title?:       string
  text?:        string
  color?:       string
  fields?:      { title: string; value: string; short?: boolean }[]
}

export interface RCWebhookPayload {
  text?:        string
  alias?:       string
  emoji?:       string
  attachments?: RCAttachment[]
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class RocketChatClient {
  constructor(private config: RocketChatConfig) {}

  // ── Auth headers ──────────────────────────────────────────────────────────

  private headers(): HeadersInit {
    return {
      "X-Auth-Token": this.config.authToken,
      "X-User-Id":    this.config.userId,
      "Content-Type": "application/json",
    }
  }

  // ── REST helpers ──────────────────────────────────────────────────────────

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const qs  = params ? `?${new URLSearchParams(params)}` : ""
    const url = `${this.config.baseUrl}/api/v1/${path}${qs}`
    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) throw new Error(`RocketChat GET ${path} → ${res.status}: ${await res.text()}`)
    const json = await res.json() as { success: boolean; error?: string } & T
    if (!json.success) throw new Error(`RocketChat error: ${json.error ?? "unknown"}`)
    return json
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1/${path}`
    const res = await fetch(url, {
      method:  "POST",
      headers: this.headers(),
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`RocketChat POST ${path} → ${res.status}: ${await res.text()}`)
    const json = await res.json() as { success: boolean; error?: string } & T
    if (!json.success) throw new Error(`RocketChat error: ${json.error ?? "unknown"}`)
    return json
  }

  // ── Canais / Salas ────────────────────────────────────────────────────────

  async getChannels(limit = 50): Promise<RCRoom[]> {
    const res = await this.get<{ channels: RCRoom[] }>("channels.list", {
      count: String(limit),
    })
    return res.channels
  }

  async getRooms(): Promise<RCRoom[]> {
    const res = await this.get<{ update: RCRoom[] }>("rooms.get")
    return res.update
  }

  // ── Mensagens ─────────────────────────────────────────────────────────────

  async getMessages(roomId: string, limit = 50): Promise<RCMessage[]> {
    const res = await this.get<{ messages: RCMessage[] }>("channels.messages", {
      roomId,
      count: String(limit),
    })
    return res.messages
  }

  /** Mensagens não lidas — retorna contagem por sala. */
  async getUnreadCount(roomId: string): Promise<number> {
    const res = await this.get<{ unreads: number }>("subscriptions.getOne", { roomId })
    return res.unreads
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  /** Envia mensagem via REST API (autenticado). */
  async sendMessage(params: RCSendMessageParams): Promise<RCMessage> {
    const res = await this.post<{ message: RCMessage }>("chat.postMessage", {
      roomId:      params.roomId,
      text:        params.text,
      alias:       params.alias,
      emoji:       params.emoji,
      attachments: params.attachments,
    })
    return res.message
  }

  /** Abre DM e envia mensagem direta para um usuário. */
  async sendDirectMessage(username: string, text: string): Promise<RCMessage> {
    const dm  = await this.post<{ room: { rid: string } }>("im.create", { username })
    return this.sendMessage({ roomId: dm.room.rid, text })
  }

  /**
   * Envia mensagem via Incoming Webhook (não requer auth headers).
   * Ideal para notificações simples do sistema.
   */
  async sendViaWebhook(payload: RCWebhookPayload): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error("RocketChat: ROCKETCHAT_WEBHOOK_URL não configurado no .env.local")
    }
    const res = await fetch(this.config.webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`RocketChat webhook → ${res.status}: ${await res.text()}`)
    }
  }

  /** Notificação rápida por texto — usa webhook se disponível, REST caso contrário. */
  async notify(roomId: string, text: string, emoji = ":robot:"): Promise<void> {
    if (this.config.webhookUrl) {
      await this.sendViaWebhook({ text, emoji })
    } else {
      await this.sendMessage({ roomId, text, emoji })
    }
  }

  // ── Usuários ──────────────────────────────────────────────────────────────

  async getOnlineUsers(): Promise<RCUser[]> {
    const res = await this.get<{ users: RCUser[] }>("users.list", {
      query: JSON.stringify({ status: { $ne: "offline" } }),
    })
    return res.users
  }
}

export function createRocketChatClient(config = getConfig()): RocketChatClient {
  return new RocketChatClient(config)
}
