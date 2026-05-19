"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { SessionList }       from "@/components/chat/SessionList"
import { ChatWindow }        from "@/components/chat/ChatWindow"
import { RightContextPanel } from "@/components/chat/RightContextPanel"
import { useAgents, type AgentWithConfig, type Agent } from "@/hooks/useAgents"
import { useSessions }  from "@/hooks/useSessions"
import { useMessages }  from "@/hooks/useMessages"
import { useCompany }   from "@/components/providers/CompanyProvider"
import type { Message } from "@/lib/mocks/messages"

// ─── Tipos dos eventos SSE ────────────────────────────────────────────────────

interface SSEDelta { type: "delta"; text: string }
interface SSEDone  { type: "done";  session_id: string; model: string; provider: string; usage: { input_tokens: number; output_tokens: number }; error: null }
interface SSEError { type: "error"; error: string }
type SSEEvent = SSEDelta | SSEDone | SSEError

function parseSSE(raw: string): SSEEvent | null {
  const line = raw.startsWith("data: ") ? raw.slice(6) : raw
  try { return JSON.parse(line) as SSEEvent } catch { return null }
}

export default function ChatPage() {
  const { agents: agentList, loading: agentsLoading, error: agentsError } = useAgents()
  const { currentCompany } = useCompany()
  const companyId = currentCompany?.slug

  const [selectedAgent, setSelectedAgent]   = useState<AgentWithConfig | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [rightPanelOpen, setRightPanelOpen]   = useState(true)
  const [isTyping, setIsTyping]               = useState(false)
  const [sourcesVersion, setSourcesVersion]   = useState(0)

  const { messages, setMessages } = useMessages(activeSessionId)
  const {
    sessions, loading: sessionsLoading, refresh: refreshSessions,
    renameSession, togglePinned, archiveSession, unarchiveSession, deleteSession,
  } = useSessions(companyId)

  // Limpa a sessão ativa ao trocar de empresa
  useEffect(() => {
    setActiveSessionId(null)
  }, [companyId])

  const abortRef = useRef<AbortController | null>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // Seleciona o primeiro agente ao carregar
  useEffect(() => {
    if (agentList.length > 0 && !selectedAgent) {
      setSelectedAgent(agentList[0])
    }
  }, [agentList, selectedAgent])

  // Sincroniza selectedAgent com dados reais após carregamento
  useEffect(() => {
    if (!agentsLoading && agentList.length > 0 && selectedAgent) {
      const updated = agentList.find((a) => a.shortName === selectedAgent.shortName)
      if (updated && updated.dbId !== selectedAgent.dbId) {
        setSelectedAgent(updated)
      }
    }
  }, [agentsLoading, agentList, selectedAgent])

  function selectSession(id: string) {
    setActiveSessionId(id)
    const session = sessions.find((s) => s.id === id)
    if (session) {
      const matched = agentList.find((a) => a.shortName === session.agentName)
      if (matched) setSelectedAgent(matched)
    }
  }

  function newSession() {
    setActiveSessionId(null)
    if (agentList.length > 0) setSelectedAgent(agentList[0])
  }

  async function handleArchive(id: string): Promise<boolean> {
    const ok = await archiveSession(id)
    if (ok && activeSessionId === id) setActiveSessionId(null)
    return ok
  }

  async function handleDelete(id: string): Promise<boolean> {
    const ok = await deleteSession(id)
    if (ok && activeSessionId === id) setActiveSessionId(null)
    return ok
  }

  // Re-enriquece o agente quando o seletor passa um Agent base
  function handleAgentChange(a: Agent) {
    const enriched = agentList.find((ag) => ag.id === a.id || ag.shortName === a.shortName)
    if (enriched) setSelectedAgent(enriched)
  }

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping || !selectedAgent) return

    // ── Mensagens otimistas ──────────────────────────────────────────────────
    const userMsg: Message = {
      id:        `u-${Date.now()}`,
      role:      "user",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      content:   [{ kind: "text", content: text }],
    }
    const aiMsgId = `ai-${Date.now()}`
    const aiMsg: Message = {
      id:         aiMsgId,
      role:       "assistant",
      agentName:  selectedAgent.shortName,
      agentColor: selectedAgent.color,
      timestamp:  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      content:    [{ kind: "text" as const, content: "" }],
    }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setIsTyping(true)

    // ── Histórico para a API ─────────────────────────────────────────────────
    const history = messages.map((m) => ({
      role:    m.role as "user" | "assistant",
      content: m.content
        .filter((b): b is { kind: "text"; content: string } => b.kind === "text")
        .map((b) => b.content)
        .join("\n"),
    }))
    history.push({ role: "user", content: text })

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages:     history,
          session_id:   activeSessionId,
          agent_id:     selectedAgent.dbId || null,
          user_message: text,
          company_id:   companyId ?? "grupo",
        }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error("Resposta sem corpo")

      // ── Parser SSE ───────────────────────────────────────────────────────────
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer      = ""
      let pendingSid: string | null = null
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data: ")) continue

            const event = parseSSE(line)
            if (!event) continue

            if (event.type === "delta") {
              accumulated += event.text
              const snap = accumulated
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: [{ kind: "text" as const, content: snap }] }
                    : m
                )
              )
            } else if (event.type === "done") {
              pendingSid = event.session_id
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: [{ kind: "text" as const, content: `⚠️ ${event.error}` }] }
                    : m
                )
              )
            }
          }
        }
      }

      if (pendingSid && pendingSid !== activeSessionId) {
        setActiveSessionId(pendingSid)
      }
      refreshSessions()

    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: [{ kind: "text" as const, content: "⚠️ Erro ao conectar com a IA. Tente novamente." }] }
              : m
          )
        )
      }
    } finally {
      setIsTyping(false)
    }
  }, [activeSessionId, isTyping, selectedAgent, messages, refreshSessions, setMessages])

  // Enquanto agentes carregam ou em caso de erro
  if (agentsLoading || !selectedAgent) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: agentsError ? "var(--color-error, #ef4444)" : "var(--text-muted)" }}>
          {agentsError ? `Erro ao carregar agentes: ${agentsError}` : "Carregando agentes..."}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <SessionList
        activeId={activeSessionId ?? ""}
        sessions={sessions}
        loading={sessionsLoading}
        onSelect={selectSession}
        onNewSession={newSession}
        onRename={renameSession}
        onTogglePinned={togglePinned}
        onArchive={handleArchive}
        onUnarchive={unarchiveSession}
        onDelete={handleDelete}
      />

      <ChatWindow
        sessionId={activeSessionId}
        sessionTitle={activeSession?.title}
        sessionCompany={activeSession?.company}
        companyId={companyId}
        messages={messages}
        isTyping={isTyping}
        selectedAgent={selectedAgent}
        rightPanelOpen={rightPanelOpen}
        onAgentChange={handleAgentChange}
        onSend={handleSend}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        onSourcesChanged={() => setSourcesVersion((v) => v + 1)}
        agents={agentList}
      />

      <RightContextPanel
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
        agent={selectedAgent}
        sessionTitle={activeSession?.title ?? "Nova sessão"}
        sessionId={activeSessionId}
        companyId={companyId}
        sourcesVersion={sourcesVersion}
      />
    </div>
  )
}
