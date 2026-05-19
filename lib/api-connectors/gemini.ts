/**
 * Google Gemini connector — Mota OS
 * Credenciais em .env.local → GOOGLE_AI_API_KEY
 * Usar apenas em Server Components, Route Handlers ou Server Actions.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GeminiConfig {
  apiKey:       string
  defaultModel: GeminiModel
  timeoutMs:    number
}

function getConfig(): GeminiConfig {
  return {
    apiKey:       process.env.GOOGLE_AI_API_KEY ?? "",
    defaultModel: "gemini-2.0-flash",
    timeoutMs:    30_000,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type GeminiModel =
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"

export interface GeminiPart {
  text: string
}

export interface GeminiContent {
  role:  "user" | "model"
  parts: GeminiPart[]
}

export interface GeminiGenerateRequest {
  model?:             GeminiModel
  contents:           GeminiContent[]
  systemInstruction?: string
  maxOutputTokens?:   number
  temperature?:       number
}

export interface GeminiGenerateResponse {
  text:  string
  usage: {
    promptTokenCount:     number
    candidatesTokenCount: number
    totalTokenCount:      number
  }
}

// ─── Pricing (USD per token) ─────────────────────────────────────────────────

const PRICING: Record<GeminiModel, { in: number; out: number }> = {
  "gemini-2.0-flash":      { in: 0.000000075,  out: 0.0000003   },
  "gemini-2.0-flash-lite": { in: 0.0000000375, out: 0.00000015  },
  "gemini-1.5-pro":        { in: 0.00000125,   out: 0.000005    },
  "gemini-1.5-flash":      { in: 0.000000075,  out: 0.0000003   },
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class GeminiClient {
  private sdk: GoogleGenerativeAI

  constructor(private config: GeminiConfig) {
    this.sdk = new GoogleGenerativeAI(config.apiKey)
  }

  async generate(request: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const model = this.sdk.getGenerativeModel({
      model:             request.model ?? this.config.defaultModel,
      systemInstruction: request.systemInstruction,
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens,
        temperature:     request.temperature,
      },
    })

    const history = request.contents.slice(0, -1).map((c) => ({
      role:  c.role,
      parts: c.parts,
    }))
    const last    = request.contents[request.contents.length - 1]
    const message = last.parts.map((p) => p.text).join("")

    const chat   = model.startChat({ history })
    const result = await chat.sendMessage(message)

    const response = result.response
    return {
      text:  response.text(),
      usage: {
        promptTokenCount:     response.usageMetadata?.promptTokenCount     ?? 0,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokenCount:      response.usageMetadata?.totalTokenCount      ?? 0,
      },
    }
  }

  async *stream(request: GeminiGenerateRequest): AsyncGenerator<string> {
    const model = this.sdk.getGenerativeModel({
      model:            request.model ?? this.config.defaultModel,
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens,
        temperature:     request.temperature,
      },
    })

    const last    = request.contents[request.contents.length - 1]
    const message = last.parts.map((p) => p.text).join("")

    const result = await model.generateContentStream(message)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }

  estimateCost(promptTokens: number, outputTokens: number, model: GeminiModel = "gemini-2.0-flash"): number {
    const p = PRICING[model]
    return promptTokens * p.in + outputTokens * p.out
  }
}

export function createGeminiClient(config = getConfig()): GeminiClient {
  return new GeminiClient(config)
}
