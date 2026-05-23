"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Paperclip, Database, Send, ChevronDown, Check, X, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentSelector } from "./AgentSelector"
import type { Agent } from "@/lib/mocks/agents"

export type { Agent }

const modes = [
  { id: "balanced",   label: "Balanced",  desc: "Equilibrio entre criatividade e precisão" },
  { id: "creative",   label: "Criativo",  desc: "Mais criativo e exploratório"             },
  { id: "analytical", label: "Analítico", desc: "Focado em dados e análise"                },
  { id: "executive",  label: "Executivo", desc: "Direto, resumido e orientado a ação"      },
]

interface KnowledgeSource {
  id:          string
  name:        string
  type:        string
  description: string | null
}

interface ChatInputProps {
  selectedAgent:    Agent
  onAgentChange:    (a: Agent) => void
  onSend:           (text: string) => void
  agents?:          Agent[]
  disabled?:        boolean
  sessionId?:       string | null
  companyId?:       string
  onSourcesChanged?: () => void
}

// ─── Sources popup content ────────────────────────────────────────────────────

function SourcesPopup({ sessionId, companyId, onSourcesChanged }: {
  sessionId?: string | null
  companyId?: string
  onSourcesChanged?: () => void
}) {
  const [sources, setSources]   = useState<KnowledgeSource[]>([])
  const [linked, setLinked]     = useState<Set<string>>(new Set())
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)

    const [srcRes, lnkRes] = await Promise.all([
      fetch(`/api/knowledge-sources?company_id=${encodeURIComponent(companyId)}`),
      sessionId
        ? fetch(`/api/session-sources?session_id=${encodeURIComponent(sessionId)}`)
        : Promise.resolve(null),
    ])

    if (srcRes.ok) setSources(await srcRes.json() as KnowledgeSource[])
    if (lnkRes?.ok) {
      const data = await lnkRes.json() as { source_id: string }[]
      setLinked(new Set(data.map((r) => r.source_id)))
    }
    setLoading(false)
  }, [companyId, sessionId])

  useEffect(() => { void load() }, [load])

  async function toggle(sourceId: string) {
    if (!sessionId) return
    setToggling((prev) => new Set([...prev, sourceId]))

    const isLinked = linked.has(sourceId)
    if (isLinked) {
      const res = await fetch("/api/session-sources", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, source_id: sourceId }),
      })
      if (res.ok) { setLinked((prev) => { const next = new Set(prev); next.delete(sourceId); return next }); onSourcesChanged?.() }
    } else {
      const res = await fetch("/api/session-sources", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, source_id: sourceId }),
      })
      if (res.ok) { setLinked((prev) => new Set([...prev, sourceId])); onSourcesChanged?.() }
    }

    setToggling((prev) => { const next = new Set(prev); next.delete(sourceId); return next })
  }

  if (!sessionId) {
    return (
      <p className="text-xs px-3 py-3" style={{ color: "var(--text-muted)" }}>
        Envie uma mensagem primeiro para vincular fontes à sessão.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-5 gap-2">
        <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Carregando...</span>
      </div>
    )
  }

  if (sources.length === 0) {
    return (
      <p className="text-xs px-3 py-4 text-center" style={{ color: "var(--text-muted)" }}>
        Nenhuma fonte cadastrada para esta empresa.
      </p>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto p-1">
      {sources.map((s) => {
        const isLinked = linked.has(s.id)
        const isTog    = toggling.has(s.id)
        return (
          <button
            key={s.id}
            onClick={() => void toggle(s.id)}
            disabled={isTog}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            <div
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                isLinked ? "bg-mota-600 border-mota-600" : "border-[var(--border-color)]"
              )}
            >
              {isTog ? (
                <Loader2 size={10} className="animate-spin text-white" />
              ) : isLinked ? (
                <Check size={10} className="text-white" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {s.name}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {s.type}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── ChatInput ────────────────────────────────────────────────────────────────

export function ChatInput({
  selectedAgent, onAgentChange, onSend, agents, disabled,
  sessionId, companyId, onSourcesChanged,
}: ChatInputProps) {
  const [value, setValue]           = useState("")
  const [mode, setMode]             = useState(modes[0])
  const [modeOpen, setModeOpen]     = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px" }
  }

  return (
    <div
      className="px-4 py-3 border-t shrink-0"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-sidebar)" }}
    >
      <div
        className="rounded-2xl border transition-all"
        style={{ background: "var(--bg-input)", borderColor: "var(--border-color)" }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem para o Jarvis..."
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full bg-transparent resize-none px-4 pt-3.5 pb-1 text-sm outline-none",
            "placeholder:text-[var(--text-muted)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ color: "var(--text-primary)", maxHeight: 140, minHeight: 44 }}
        />

        {/* Bottom bar */}
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
          {/* Left actions */}
          <div className="flex items-center gap-1">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
              title="Anexar arquivo"
            >
              <Paperclip size={14} />
            </button>

            {/* Database / sources button */}
            <div className="relative">
              <button
                onClick={() => setSourcesOpen((v) => !v)}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                  sourcesOpen ? "bg-mota-600/15 text-mota-500" : "hover:bg-[var(--bg-hover)]"
                )}
                style={{ color: sourcesOpen ? undefined : "var(--text-muted)" }}
                title="Selecionar fontes"
              >
                <Database size={14} />
              </button>

              <AnimatePresence>
                {sourcesOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSourcesOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-xl z-40 overflow-hidden"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-2.5 border-b"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          Fontes de conhecimento
                        </span>
                        <button
                          onClick={() => setSourcesOpen(false)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <SourcesPopup sessionId={sessionId} companyId={companyId} onSourcesChanged={onSourcesChanged} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1" />

          {/* Agent selector */}
          <AgentSelector selected={selectedAgent} onChange={onAgentChange} agents={agents} />

          {/* Mode selector */}
          <div className="relative">
            <button
              onClick={() => setModeOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all",
                modeOpen && "border-mota-600/40"
              )}
              style={{
                background:   "var(--bg-card)",
                borderColor:  modeOpen ? undefined : "var(--border-color)",
                color:        "var(--text-secondary)",
              }}
            >
              {mode.label}
              <motion.div animate={{ rotate: modeOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={11} />
              </motion.div>
            </button>

            {modeOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setModeOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border shadow-xl z-40 overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <div className="p-1">
                    {modes.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setMode(m); setModeOpen(false) }}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{m.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{m.desc}</p>
                        </div>
                        {mode.id === m.id && <Check size={13} className="text-mota-500 shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Send */}
          <motion.button
            onClick={submit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!value.trim() || disabled}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
              value.trim() && !disabled
                ? "bg-mota-600 hover:bg-mota-700 text-white shadow-sm"
                : "text-[var(--text-muted)] cursor-not-allowed"
            )}
            style={!value.trim() || disabled ? { background: "var(--bg-hover)" } : {}}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>

      <p className="text-[10px] text-center mt-1.5" style={{ color: "var(--text-muted)" }}>
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  )
}
