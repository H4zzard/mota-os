/**
 * Wrapper para embeddings OpenAI text-embedding-3-small.
 * SERVER-SIDE ONLY — nunca importar em Client Components.
 * Requer OPENAI_API_KEY no ambiente.
 */

import OpenAI from "openai"

// Instância reutilizável (criada apenas uma vez por processo)
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error("OPENAI_API_KEY não configurada. Configure em Configurações > API.")
    _client = new OpenAI({ apiKey: key })
  }
  return _client
}

export const EMBEDDING_MODEL = "text-embedding-3-small"
export const EMBEDDING_DIMS  = 1536

/** Gera embedding para um único texto. */
export async function embedText(text: string): Promise<number[]> {
  const res = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n+/g, " ").slice(0, 8191),
  })
  return res.data[0].embedding
}

/** Gera embeddings em batch (máx 2048 inputs por chamada OpenAI). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const BATCH = 100 // conservador para evitar timeout
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map(t => t.replace(/\n+/g, " ").slice(0, 8191))
    const res = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: slice,
    })
    // Preservar ordem da resposta
    const sorted = res.data.sort((a, b) => a.index - b.index)
    results.push(...sorted.map(d => d.embedding))
  }

  return results
}
