/**
 * OpenAI connector — Jarvis
 * Credenciais em .env.local → OPENAI_API_KEY
 * Usar apenas em Server Components, Route Handlers ou Server Actions.
 */

import OpenAI from "openai"

// ─── Config ──────────────────────────────────────────────────────────────────

export interface OpenAIConfig {
  apiKey:        string
  organization?: string
  defaultModel:  OpenAIModel
}

function getConfig(): OpenAIConfig {
  return {
    apiKey:       process.env.OPENAI_API_KEY ?? "",
    organization: process.env.OPENAI_ORG_ID,
    defaultModel: "gpt-4o",
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type OpenAIModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "o1"
  | "o1-mini"

export interface OpenAIMessage {
  role:    "system" | "user" | "assistant"
  content: string
}

export interface OpenAIChatRequest {
  messages:     OpenAIMessage[]
  model?:       OpenAIModel
  max_tokens?:  number
  temperature?: number
}

export interface OpenAIChatResponse {
  id:      string
  model:   string
  content: string
  usage: {
    prompt_tokens:     number
    completion_tokens: number
    total_tokens:      number
  }
}

export interface OpenAIImageRequest {
  prompt:   string
  model?:   "dall-e-3" | "dall-e-2"
  size?:    "1024x1024" | "1792x1024" | "1024x1792"
  quality?: "standard" | "hd"
  n?:       number
}

export interface OpenAIImageResponse {
  created: number
  data:    { url: string; revised_prompt?: string }[]
}

// ─── Pricing (USD per token) ─────────────────────────────────────────────────

const PRICING: Record<OpenAIModel, { in: number; out: number }> = {
  "gpt-4o":      { in: 0.000005,   out: 0.000015  },
  "gpt-4o-mini": { in: 0.00000015, out: 0.0000006 },
  "gpt-4-turbo": { in: 0.00001,    out: 0.00003   },
  "o1":          { in: 0.000015,   out: 0.00006   },
  "o1-mini":     { in: 0.000003,   out: 0.000012  },
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class OpenAIClient {
  private sdk: OpenAI

  constructor(private config: OpenAIConfig) {
    this.sdk = new OpenAI({
      apiKey:       config.apiKey,
      organization: config.organization,
    })
  }

  /** Completion síncrona. */
  async chat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const response = await this.sdk.chat.completions.create({
      model:       request.model       ?? this.config.defaultModel,
      messages:    request.messages,
      max_tokens:  request.max_tokens,
      temperature: request.temperature,
    })

    return {
      id:      response.id,
      model:   response.model,
      content: response.choices[0]?.message?.content ?? "",
      usage: {
        prompt_tokens:     response.usage?.prompt_tokens     ?? 0,
        completion_tokens: response.usage?.completion_tokens ?? 0,
        total_tokens:      response.usage?.total_tokens      ?? 0,
      },
    }
  }

  /** Streaming — yield de tokens de texto conforme chegam. */
  async *stream(request: OpenAIChatRequest): AsyncGenerator<string> {
    const stream = await this.sdk.chat.completions.create({
      model:       request.model       ?? this.config.defaultModel,
      messages:    request.messages,
      max_tokens:  request.max_tokens,
      temperature: request.temperature,
      stream:      true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  /** Geração de imagem com DALL-E. */
  async generateImage(request: OpenAIImageRequest): Promise<OpenAIImageResponse> {
    const response = await this.sdk.images.generate({
      prompt:  request.prompt,
      model:   request.model   ?? "dall-e-3",
      size:    request.size    ?? "1024x1024",
      quality: request.quality ?? "standard",
      n:       request.n       ?? 1,
    })

    return {
      created: response.created,
      data:    (response.data ?? []).map((d) => ({
        url:             d.url ?? "",
        revised_prompt:  d.revised_prompt,
      })),
    }
  }

  /** Custo estimado em USD. */
  estimateCost(promptTokens: number, completionTokens: number, model: OpenAIModel = "gpt-4o"): number {
    const p = PRICING[model]
    return promptTokens * p.in + completionTokens * p.out
  }
}

export function createOpenAIClient(config = getConfig()): OpenAIClient {
  return new OpenAIClient(config)
}
