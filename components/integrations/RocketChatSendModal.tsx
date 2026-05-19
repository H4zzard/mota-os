"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2, CheckCircle2, AlertCircle, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

interface RocketChatSendModalProps {
  open:           boolean
  onClose:        () => void
  initialMessage: string
  sessionId?:     string | null
}

interface RCConfig {
  configured:      boolean
  mode:            string
  default_channel: string | null
  bot_username:    string | null
  alias:           string | null
  status:          string
}

export function RocketChatSendModal({
  open,
  onClose,
  initialMessage,
  sessionId,
}: RocketChatSendModalProps) {
  const [config,  setConfig]  = useState<RCConfig | null>(null)
  const [channel, setChannel] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMessage(initialMessage)
    setSuccess(false)
    setError(null)
    setLoading(false)
    setChannel("")   // Sempre reseta o canal ao abrir

    fetch("/api/integrations/rocketchat/config")
      .then((r) => r.json())
      .then((data: RCConfig) => {
        setConfig(data)
        setChannel(data.default_channel ?? "")  // Sempre preenche do config, não do estado anterior
      })
      .catch(() => {
        setConfig({ configured: false, mode: "rest", default_channel: null, bot_username: null, alias: null, status: "error" })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage])

  async function handleSend() {
    if (!channel.trim() || !message.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/integrations/rocketchat/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:          message.trim(),
          channel:          channel.trim() || undefined,
          destination_type: "chat",
          source_type:      "chat",
          session_id:       sessionId ?? undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Erro ao enviar mensagem")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const canSend = !loading && !!config?.configured && !!channel.trim() && !!message.trim()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl pointer-events-auto flex flex-col"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Rocket size={16} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Enviar para Rocket.Chat
                  </p>
                  {(config?.bot_username || config?.alias) && (
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      via {config.alias ?? `@${config.bot_username}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)] shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Not configured warning */}
                {config && !config.configured && (
                  <div
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{ borderColor: "rgb(249 115 22 / 0.3)", background: "rgb(249 115 22 / 0.05)" }}
                  >
                    <AlertCircle size={15} className="text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        Rocket.Chat não configurado
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Configure em{" "}
                        <strong>Configurações &gt; Conexões de API</strong>{" "}
                        antes de enviar mensagens.
                      </p>
                    </div>
                  </div>
                )}

                {/* Success state */}
                {success ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-mota-500/10">
                    <CheckCircle2 size={18} className="text-mota-500 shrink-0" />
                    <p className="text-sm font-medium text-mota-600 dark:text-mota-400">
                      Mensagem enviada com sucesso!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Channel input */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Canal ou usuário
                      </label>
                      <input
                        type="text"
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        placeholder={config?.mode === "webhook" ? "Nome do canal ou ID da sala" : "#geral ou @usuario"}
                        disabled={loading || !config?.configured}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors",
                          "focus:border-mota-500 disabled:opacity-50"
                        )}
                        style={{
                          background:   "var(--bg-input)",
                          borderColor:  "var(--border-color)",
                          color:        "var(--text-primary)",
                        }}
                      />
                    </div>

                    {/* Message textarea */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Mensagem
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={7}
                        disabled={loading || !config?.configured}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors resize-none",
                          "focus:border-mota-500 disabled:opacity-50"
                        )}
                        style={{
                          background:  "var(--bg-input)",
                          borderColor: "var(--border-color)",
                          color:       "var(--text-primary)",
                        }}
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10">
                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-2 px-5 pb-5 shrink-0"
              >
                {success ? (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-mota-600 hover:bg-mota-700 text-white transition-colors"
                  >
                    Fechar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-sm border transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => void handleSend()}
                      disabled={!canSend}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      {loading ? "Enviando…" : "Enviar"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
