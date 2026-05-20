/**
 * Camada de abstração para provedores de IA.
 * SERVER-SIDE ONLY — nunca importar em Client Components.
 * API keys ficam exclusivamente aqui.
 */

import Anthropic from "@anthropic-ai/sdk"
import OpenAI    from "openai"

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type AIProvider = "anthropic" | "openai"

export interface AIUsage {
  input_tokens:  number
  output_tokens: number
}

export interface AIStreamParams {
  messages:  { role: "user" | "assistant"; content: string }[]
  system?:   string
  provider?: AIProvider
  model?:    string
}

/** Chunk de texto parcial durante o stream */
export interface AIChunkDelta {
  done:  false
  text:  string
}

/** Chunk final com metadados (sem texto) */
export interface AIChunkDone {
  done:     true
  text:     ""
  model:    string
  provider: AIProvider
  usage:    AIUsage
}

/** Chunk de erro — termina o stream */
export interface AIChunkError {
  done:  true
  text:  ""
  error: string
}

export type AIChunk = AIChunkDelta | AIChunkDone | AIChunkError

// ─── Clientes (instanciados uma vez, reutilizados) ────────────────────────────

function getAnthropicClient() {
  // Sem API key estática — o SDK resolve credenciais via WIF (variáveis ANTHROPIC_FEDERATION_*)
  // ou via ANTHROPIC_API_KEY se estiver definida. Não forçar a key aqui.
  return new Anthropic({
    baseURL:    process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
    maxRetries: 2,
  })
}

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY não configurada")
  return new OpenAI({ apiKey: key })
}

// ─── Entry point público ──────────────────────────────────────────────────────

export async function* streamChat(params: AIStreamParams): AsyncGenerator<AIChunk> {
  const provider = params.provider ?? "anthropic"

  try {
    if (provider === "openai") {
      yield* streamOpenAI(params)
    } else {
      yield* streamAnthropic(params)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    yield { done: true, text: "", error: `[${provider}] ${msg}` }
  }
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function* streamAnthropic(params: AIStreamParams): AsyncGenerator<AIChunk> {
  const client = getAnthropicClient()
  const model  = params.model ?? "claude-sonnet-4-6"

  let inputTokens  = 0
  let outputTokens = 0

  const stream = client.messages.stream({
    model,
    max_tokens: 2048,
    system:     params.system ??
      "Você é um assistente de IA para o Grupo Mota Educação. Seja prestativo, objetivo e responda em português.",
    messages: params.messages,
  })

  for await (const event of stream) {
    switch (event.type) {
      case "message_start":
        inputTokens = event.message.usage.input_tokens
        break

      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          yield { done: false, text: event.delta.text }
        }
        break

      case "message_delta":
        outputTokens = event.usage.output_tokens
        break
    }
  }

  yield {
    done:     true,
    text:     "",
    model,
    provider: "anthropic",
    usage:    { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function* streamOpenAI(params: AIStreamParams): AsyncGenerator<AIChunk> {
  const client = getOpenAIClient()
  const model  = params.model ?? "gpt-4o-mini"

  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (params.system) msgs.push({ role: "system", content: params.system })
  for (const m of params.messages) msgs.push({ role: m.role, content: m.content })

  const stream = await client.chat.completions.create({
    model,
    messages: msgs,
    stream:   true,
  })

  let inputTokens  = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield { done: false, text: delta }

    // usage vem no último chunk (quando stream_options.include_usage = true)
    if (chunk.usage) {
      inputTokens  = chunk.usage.prompt_tokens     ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  yield {
    done:     true,
    text:     "",
    model,
    provider: "openai",
    usage:    { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}
