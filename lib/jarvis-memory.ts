/**
 * Memória evolutiva do Jarvis — escopo POR EMPRESA.
 * SERVER-SIDE ONLY. Camada de memória RAG: extrai fatos das conversas,
 * salva com embedding e recupera por similaridade em conversas futuras.
 */

import { createAdminClient } from "@/lib/supabase-admin"
import { completeText } from "@/lib/ai-service"
import { embedText } from "@/lib/rag/embeddings"

export type MemoryKind = "fact" | "preference" | "process" | "entity"

export interface ExtractedMemory {
  content: string
  kind:    MemoryKind
}

const KINDS: MemoryKind[] = ["fact", "preference", "process", "entity"]

const EXTRACT_SYSTEM = `Você destila MEMÓRIAS duráveis de uma conversa para um assistente corporativo reaproveitar no futuro.

Extraia apenas o que for ESTÁVEL e ÚTIL a longo prazo desta empresa: fatos, decisões, preferências de trabalho, processos internos, entidades importantes (pessoas, produtos, valores recorrentes).

NÃO extraia: saudações, pedidos pontuais, dúvidas momentâneas, dados sensíveis de pessoas físicas (CPF, telefone, endereço), nada efêmero ou trivial.

Responda APENAS com JSON válido:
{"memories": [{"content": "fato em uma frase clara e autossuficiente", "kind": "fact|preference|process|entity"}]}

Se não houver nada memorável, responda {"memories": []}. Máximo 3 memórias. Escreva em português, na 3ª pessoa, sem referência a "o usuário disse".`

/** Extrai memórias duráveis da última troca da conversa. */
export async function extractMemories(
  exchange: { role: "user" | "assistant"; content: string }[],
): Promise<ExtractedMemory[]> {
  const transcript = exchange
    .slice(-6) // últimas mensagens
    .map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content.slice(0, 2000)}`)
    .join("\n\n")
  if (transcript.trim().length < 20) return []

  try {
    const raw = await completeText({
      system:    EXTRACT_SYSTEM,
      messages:  [{ role: "user", content: transcript.slice(0, 6000) }],
      model:     "claude-haiku-4-5",
      maxTokens: 400,
    })
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as { memories?: unknown }
    if (!Array.isArray(parsed.memories)) return []

    const out: ExtractedMemory[] = []
    for (const m of parsed.memories.slice(0, 3)) {
      const mem = m as { content?: unknown; kind?: unknown }
      if (typeof mem.content !== "string" || mem.content.trim().length < 5) continue
      const kind = KINDS.includes(mem.kind as MemoryKind) ? (mem.kind as MemoryKind) : "fact"
      out.push({ content: mem.content.trim().slice(0, 1000), kind })
    }
    return out
  } catch {
    return []
  }
}

/** Salva memórias da empresa, pulando duplicatas semânticas (similaridade > 0.92). */
export async function saveMemories(
  companyId: string,
  memories: ExtractedMemory[],
  opts: { sessionId?: string | null; userId?: string | null } = {},
): Promise<number> {
  if (memories.length === 0) return 0
  const admin = createAdminClient()
  let saved = 0

  for (const mem of memories) {
    let embedding: number[]
    try { embedding = await embedText(mem.content) } catch { continue }

    // Dedupe semântico: pula se já existe memória muito parecida
    try {
      const { data: similar } = await admin.rpc("match_jarvis_memories", {
        query_embedding: `[${embedding.join(",")}]`,
        filter_company:  companyId,
        match_count:     1,
        min_similarity:  0.92,
      })
      if (similar && similar.length > 0) continue
    } catch { /* segue e insere mesmo assim */ }

    const { error } = await admin.from("jarvis_memories").insert({
      company_id:        companyId,
      content:           mem.content,
      kind:              mem.kind,
      embedding:         `[${embedding.join(",")}]`,
      source_session_id: opts.sessionId ?? null,
      created_by:        opts.userId ?? null,
    })
    if (!error) saved++
  }
  return saved
}

/** Recupera memórias relevantes da empresa para a mensagem atual. */
export async function recallMemories(
  companyId: string,
  query: string,
  limit = 5,
): Promise<{ content: string; kind: string }[]> {
  if (!query.trim()) return []
  let embedding: number[]
  try { embedding = await embedText(query.slice(0, 2000)) } catch { return [] }

  const admin = createAdminClient()
  try {
    const { data } = await admin.rpc("match_jarvis_memories", {
      query_embedding: `[${embedding.join(",")}]`,
      filter_company:  companyId,
      match_count:     limit,
      min_similarity:  0.3,
    })
    return (data ?? []) as { content: string; kind: string }[]
  } catch {
    return []
  }
}
