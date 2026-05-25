import { NextRequest } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { streamChat, type AIProvider } from "@/lib/ai-service"
import { logActivity }                 from "@/lib/activity-logger"
import { embedText }                   from "@/lib/rag/embeddings"

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages:     { role: "user" | "assistant"; content: string }[]
    system?:      string
    session_id?:  string | null
    agent_id?:    string | null
    user_message: string
    company_id?:  string
    provider?:    AIProvider
    model?:       string
  }

  // ─── Auth (client Supabase com cookies) ──────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "Sessão expirada. Faça login novamente." })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } },
    )
  }

  // ─── Configuração do agente ───────────────────────────────────────────────
  const admin = createAdminClient()

  let provider: AIProvider = body.provider ?? "anthropic"
  let model:    string | undefined = body.model
  let system:   string | undefined = body.system

  if (body.agent_id) {
    const { data: cfg } = await admin
      .from("agent_model_configs")
      .select("provider, model_id, system_prompt")
      .eq("agent_id", body.agent_id)
      .single()

    if (!cfg) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", error: "Agente sem configuração de modelo. Configure o modelo em Configurações > Modelos." })}\n\n`,
        { status: 422, headers: { "Content-Type": "text/event-stream" } },
      )
    }

    provider = cfg.provider as AIProvider
    model    = cfg.model_id
    if (cfg.system_prompt) system = cfg.system_prompt
  }

  // ─── Sessão ───────────────────────────────────────────────────────────────
  let sid = body.session_id ?? null

  if (!sid) {
    const title = body.user_message.slice(0, 80).trim() || "Nova conversa"
    const { data: sess, error: sessErr } = await admin
      .from("sessions")
      .insert({
        user_id:    user.id,
        agent_id:   body.agent_id ?? null,
        company_id: body.company_id ?? "grupo",
        title,
        pinned:     false,
        archived:   false,
        tags:       [],
      })
      .select("id")
      .single()

    if (sessErr || !sess) {
      const msg = sessErr?.message ?? "Erro ao criar sessão"
      return new Response(
        `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } },
      )
    }
    sid = sess.id as string
  }

  // ─── Contexto de conhecimento (RAG semântico + fallback full-text) ──────────
  {
    try {
      const { data: rows } = await admin
        .from("session_sources")
        .select("source_id, knowledge_sources(id, name, type, content, embedding_status)")
        .eq("session_id", sid)

      if (rows && rows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sources = rows.map(r => (r as any).knowledge_sources as {
          id: string; name: string; type: string; content: string | null; embedding_status: string | null
        } | null).filter(Boolean) as { id: string; name: string; type: string; content: string | null; embedding_status: string | null }[]

        const indexedIds = sources.filter(s => s.embedding_status === "done").map(s => s.id)
        let injectedCtx = false

        // ── Tentativa RAG semântico ─────────────────────────────────────
        if (indexedIds.length > 0) {
          try {
            const queryEmbedding = await embedText(body.user_message.slice(0, 2000))
            const { data: chunks } = await admin.rpc("match_knowledge_chunks", {
              query_embedding:   `[${queryEmbedding.join(",")}]`,
              match_count:       8,
              filter_company:    body.company_id ?? null,
              filter_agent_id:   null,
              filter_source_ids: indexedIds,
              min_similarity:    0.35,
            })

            if (chunks && chunks.length > 0) {
              const parts = (chunks as { title?: string | null; source_type?: string | null; content: string }[])
                .map(c => `[${c.title ?? c.source_type ?? "Fonte"}]\n${c.content}`)
              const ctx = `\n\nFONTES DE CONHECIMENTO (busca semântica — ${parts.length} trecho(s)):\n${parts.join("\n\n---\n\n")}\n`
              system = (system ?? "") + ctx
              injectedCtx = true

              void logActivity({
                userId:    user.id,
                eventType: "source",
                action:    "chat_rag_injected",
                detail:    `${parts.length} trecho(s) semântico(s)`,
                sessionId: sid as string,
                companyId: body.company_id,
              })
            }
          } catch (ragErr) {
            console.warn("[chat] RAG falhou, usando fallback full-text:", ragErr)
          }
        }

        // ── Fallback: injetar conteúdo completo (fontes sem embedding) ──
        if (!injectedCtx) {
          const CONTEXT_CHAR_LIMIT = 40_000
          const parts: string[] = []
          let totalChars = 0

          for (const src of sources) {
            if (!src.content) continue
            const remaining = CONTEXT_CHAR_LIMIT - totalChars
            if (remaining <= 0) break
            const excerpt = src.content.slice(0, remaining)
            parts.push(`=== ${src.name} (${src.type}) ===\n${excerpt}`)
            totalChars += excerpt.length
          }

          if (parts.length > 0) {
            system = (system ?? "") + `\n\nFONTES DE CONHECIMENTO ATIVAS:\n${parts.join("\n\n")}\n`

            void logActivity({
              userId:    user.id,
              eventType: "source",
              action:    "chat_fulltext_injected",
              detail:    `${parts.length} fonte(s) — ${totalChars} chars`,
              sessionId: sid as string,
            })
          }
        }
      }
    } catch (ctxErr) {
      console.warn("[chat] Erro ao buscar contexto de conhecimento:", ctxErr)
    }
  }

  // ─── Salvar mensagem do usuário ───────────────────────────────────────────
  {
    const { error: e } = await admin.from("messages").insert({
      session_id: sid,
      role:       "user",
      content:    body.user_message,
      agent_id:   null,
      status:     "done",
    })
    if (e) {
      // status pode não existir (migration 2 não aplicada) — fallback sem status
      console.warn("[chat] user msg insert failed, trying base:", e.message)
      await admin.from("messages").insert({
        session_id: sid,
        role:       "user",
        content:    body.user_message,
        agent_id:   null,
      })
    }
  }

  // ─── Stream ───────────────────────────────────────────────────────────────
  const finalSid = sid

  const readable = new ReadableStream({
    async start(controller) {
      let accumulated = ""

      try {
        for await (const chunk of streamChat({
          messages: body.messages,
          system,
          provider,
          model,
        })) {
          if (!chunk.done) {
            // Texto parcial — AIChunkDelta
            accumulated += chunk.text
            controller.enqueue(sse({ type: "delta", text: chunk.text }))

          } else if ("error" in chunk) {
            // Erro do provedor — AIChunkError
            controller.enqueue(sse({ type: "error", error: chunk.error }))
            const { error: eErr } = await admin.from("messages").insert({
              session_id:    finalSid,
              role:          "assistant",
              content:       "",
              agent_id:      body.agent_id ?? null,
              status:        "error",
              error_message: chunk.error,
            })
            if (eErr) {
              await admin.from("messages").insert({
                session_id: finalSid,
                role:       "assistant",
                content:    "",
                agent_id:   body.agent_id ?? null,
              })
            }

          } else {
            // Fim com sucesso — AIChunkDone
            const { error: saveErr } = await admin.from("messages").insert({
              session_id:    finalSid,
              role:          "assistant",
              content:       accumulated,
              agent_id:      body.agent_id ?? null,
              model_used:    chunk.model,
              provider:      chunk.provider,
              input_tokens:  chunk.usage.input_tokens,
              output_tokens: chunk.usage.output_tokens,
              status:        "done",
            })

            if (saveErr) {
              // status/provider podem não existir — fallback com colunas base
              console.warn("[chat] assistant msg insert failed, trying base:", saveErr.message)
              const { error: baseErr } = await admin.from("messages").insert({
                session_id:    finalSid,
                role:          "assistant",
                content:       accumulated,
                agent_id:      body.agent_id ?? null,
                model_used:    chunk.model,
                input_tokens:  chunk.usage.input_tokens,
                output_tokens: chunk.usage.output_tokens,
              })
              if (baseErr) {
                console.error("[chat] assistant msg base insert also failed:", baseErr.message)
              }
            }

            void logActivity({
              userId:    user.id,
              eventType: "chat",
              action:    "Mensagem enviada",
              detail:    `${chunk.provider} / ${chunk.model}`,
              metadata:  {
                session_id:    finalSid,
                agent_id:      body.agent_id ?? null,
                provider:      chunk.provider,
                model:         chunk.model,
                input_tokens:  chunk.usage.input_tokens,
                output_tokens: chunk.usage.output_tokens,
              },
              sessionId: finalSid,
            })

            controller.enqueue(sse({
              type:       "done",
              session_id: finalSid,
              content:    accumulated,
              model:      chunk.model,
              provider:   chunk.provider,
              usage:      chunk.usage,
              error:      null,
            }))
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro interno no servidor"
        controller.enqueue(sse({ type: "error", error: msg }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Session-Id":      finalSid,
    },
  })
}
