"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Sparkles, PanelRightOpen, PanelRightClose, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { TypingIndicator } from "./TypingIndicator"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { RocketChatSendModal } from "@/components/integrations/RocketChatSendModal"
import { useCompany }  from "@/components/providers/CompanyProvider"
import type { Agent } from "@/lib/mocks/agents"
import type { Message } from "@/lib/mocks/messages"

const quickPrompts = [
  "Criar campanha de leads para a CPPEM",
  "Analisar métricas do Meta Ads desta semana",
  "Gerar calendário de conteúdo para o mês",
  "Organizar tarefas do time de marketing",
  "Criar scripts de WhatsApp para o comercial",
  "Analisar landing page da Unicive",
]

interface ChatWindowProps {
  sessionId:        string | null
  sessionTitle?:    string
  sessionCompany?:  string
  companyId?:       string
  messages:         Message[]
  isTyping:         boolean
  selectedAgent:    Agent
  rightPanelOpen:   boolean
  onAgentChange:    (a: Agent) => void
  onSend:           (text: string) => void
  onToggleRightPanel: () => void
  onSourcesChanged?: () => void
  agents?:          Agent[]
}

export function ChatWindow({
  sessionId,
  sessionTitle,
  sessionCompany,
  companyId,
  messages,
  isTyping,
  selectedAgent,
  rightPanelOpen,
  onAgentChange,
  onSend,
  onToggleRightPanel,
  onSourcesChanged,
  agents,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isEmpty   = messages.length === 0

  const [rocketModalOpen,    setRocketModalOpen]    = useState(false)
  const [rocketInitialMsg,   setRocketInitialMsg]   = useState("")

  function handleSendToRocket(text: string) {
    setRocketInitialMsg(text)
    setRocketModalOpen(true)
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-5 h-14 border-b shrink-0"
        style={{ borderColor: "var(--border-color)", background: "var(--bg-sidebar)" }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {sessionTitle ?? "Nova sessão"}
          </p>

          {sessionId && (
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: `${selectedAgent.color}18`,
                  color: selectedAgent.color,
                }}
              >
                {selectedAgent.shortName}
              </span>
              {sessionCompany && (
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {sessionCompany}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Company selector */}
          <CompanySelector />

          <div className="w-px h-4 mx-1" style={{ background: "var(--border-color)" }} />

          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-muted)" }}
            title="Compartilhar"
          >
            <Share2 size={14} />
          </button>

          <button
            onClick={onToggleRightPanel}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
              rightPanelOpen
                ? "bg-mota-600/10 text-mota-500"
                : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            )}
            title={rightPanelOpen ? "Fechar painel" : "Abrir painel de contexto"}
          >
            {rightPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>

          <ThemeToggle size="sm" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState onPrompt={onSend} agentName={selectedAgent.shortName} agentColor={selectedAgent.color} />
        ) : (
          <div className="px-6 py-6 space-y-6 max-w-4xl mx-auto">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                index={i}
                onSendToRocket={msg.role === "assistant" ? handleSendToRocket : undefined}
              />
            ))}

            <AnimatePresence>
              {isTyping && (
                <TypingIndicator
                  agentName={selectedAgent.name}
                  agentColor={selectedAgent.color}
                />
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        selectedAgent={selectedAgent}
        onAgentChange={onAgentChange}
        onSend={onSend}
        agents={agents}
        disabled={isTyping}
        sessionId={sessionId}
        companyId={companyId}
        onSourcesChanged={onSourcesChanged}
      />

      <RocketChatSendModal
        open={rocketModalOpen}
        onClose={() => setRocketModalOpen(false)}
        initialMessage={rocketInitialMsg}
        sessionId={sessionId}
      />
    </div>
  )
}

function EmptyState({
  onPrompt, agentName, agentColor,
}: {
  onPrompt: (text: string) => void
  agentName: string
  agentColor: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 max-w-lg text-center"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center border"
          style={{
            background: `${agentColor}15`,
            borderColor: `${agentColor}30`,
          }}
        >
          <Sparkles size={22} style={{ color: agentColor }} />
        </div>

        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Como posso ajudar?
          </h3>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Você está conversando com o{" "}
            <span className="font-medium" style={{ color: agentColor }}>
              {agentName}
            </span>
            . Faça uma pergunta ou escolha uma sugestão abaixo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full">
          {quickPrompts.map((p) => (
            <motion.button
              key={p}
              onClick={() => onPrompt(p)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors hover:border-mota-600/30 hover:bg-mota-600/5 cursor-pointer"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-color)",
              }}
            >
              <MessageSquare size={13} className="text-mota-500 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {p}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function CompanySelector() {
  const { currentCompany, allowedCompanies, loading, setCurrentCompany } = useCompany()
  const [open, setOpen] = useState(false)

  if (loading || !currentCompany) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:bg-[var(--bg-hover)]"
        style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentCompany.color }} />
        <span className="hidden sm:inline">{currentCompany.name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl z-20 p-1"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              {allowedCompanies.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => { void setCurrentCompany(c.slug); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
