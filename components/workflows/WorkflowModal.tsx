"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, ChevronRight, Check, Play, Sparkles, ArrowLeft,
  Copy, Download, MessageSquare, RefreshCw, AlertCircle,
  Database, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type DBWorkflow, type WorkflowField, type WorkflowStep,
  workflowColor, categoryLabel,
} from "@/lib/workflow-types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = "form" | "running" | "result" | "error"

interface SSEDelta { type: "delta"; text: string }
interface SSEDone  { type: "done";  run_id: string; model: string }
interface SSEError { type: "error"; error: string }
type SSEEvent = SSEDelta | SSEDone | SSEError

function parseSSE(line: string): SSEEvent | null {
  const raw = line.startsWith("data: ") ? line.slice(6) : line
  try { return JSON.parse(raw) as SSEEvent } catch { return null }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkflowModalProps {
  workflow: DBWorkflow | null
  onClose:  () => void
}

export function WorkflowModal({ workflow: wf, onClose }: WorkflowModalProps) {
  const router = useRouter()

  const [step,      setStep]      = useState(0)
  const [values,    setValues]    = useState<Record<string, string | string[]>>({})
  const [phase,     setPhase]     = useState<Phase>("form")
  const [result,    setResult]    = useState("")
  const [runId,     setRunId]     = useState<string | null>(null)
  const [errorMsg,  setErrorMsg]  = useState("")
  const [copied,       setCopied]       = useState(false)
  const [sourceSaved,  setSourceSaved]  = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [rcSent,       setRcSent]       = useState<"idle" | "sending" | "sent" | "error">("idle")

  const abortRef = useRef<AbortController | null>(null)

  // Reseta o estado ao trocar de workflow
  useEffect(() => {
    setStep(0); setValues({}); setPhase("form")
    setResult(""); setRunId(null); setErrorMsg("")
    setCopied(false)
    setSourceSaved("idle"); setRcSent("idle")
  }, [wf?.id])

  if (!wf) return null

  const w     = wf
  const color = workflowColor(w)
  const cat   = categoryLabel(w.category ?? w.area)

  // Converter input_schema flat → steps sintéticos, para reutilizar o stepper
  const effectiveSteps: WorkflowStep[] =
    (w.steps?.length ?? 0) > 0
      ? w.steps
      : (w.input_schema?.length ?? 0) > 0
        ? [
            { title: "Dados de entrada", description: "Preencha as informações necessárias", fields: w.input_schema },
            { title: "Revisão",          description: "Revise antes de executar",            fields: [] },
          ]
        : [{ title: "Executar", description: "Clique para iniciar", fields: [] }]

  const totalSteps    = effectiveSteps.length
  const currentStep   = effectiveSteps[step]
  const isLastStep    = step === totalSteps - 1
  const isPreviewStep = currentStep.fields.length === 0

  // ─── Navegação ────────────────────────────────────────────────────────────

  function next() { if (step < totalSteps - 1) setStep((s) => s + 1) }
  function back() { if (step > 0) setStep((s) => s - 1) }

  function setValue(id: string, val: string | string[]) {
    setValues((prev) => ({ ...prev, [id]: val }))
  }
  function toggleMulti(id: string, option: string) {
    const cur  = (values[id] as string[]) ?? []
    const next = cur.includes(option) ? cur.filter((v) => v !== option) : [...cur, option]
    setValue(id, next)
  }

  function reset() {
    abortRef.current?.abort()
    setStep(0); setValues({}); setPhase("form")
    setResult(""); setRunId(null); setErrorMsg("")
    setCopied(false)
    setSourceSaved("idle"); setRcSent("idle")
  }

  // ─── Execução SSE ─────────────────────────────────────────────────────────

  async function execute() {
    setPhase("running")
    setResult("")
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/workflows/${w.id}/run`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: values }),
        signal:  abortRef.current.signal,
      })

      if (!res.body) throw new Error("Sem resposta do servidor")

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
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
              setResult(accumulated)
            } else if (event.type === "done") {
              setRunId(event.run_id)
              setPhase("result")
            } else if (event.type === "error") {
              setErrorMsg(event.error)
              setPhase("error")
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setErrorMsg((err as Error)?.message ?? "Erro inesperado")
        setPhase("error")
      }
    }
  }

  // ─── Ações pós-resultado ──────────────────────────────────────────────────

  async function copyResult() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportResult() {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `${w.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function saveAsSource() {
    if (!runId || (sourceSaved !== "idle" && sourceSaved !== "error")) return
    setSourceSaved("saving")
    try {
      const date = new Date().toLocaleDateString("pt-BR")
      const res  = await fetch(`/api/workflow-runs/${runId}/save-as-source`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        `[${w.name}] ${date}`,
          description: `Resultado do workflow "${w.name}" gerado em ${date}`,
          type:        "document",
        }),
      })
      setSourceSaved(res.ok ? "saved" : "error")
    } catch {
      setSourceSaved("error")
    }
  }

  async function sendToRC() {
    if (rcSent !== "idle" && rcSent !== "error") return
    setRcSent("sending")
    try {
      const date    = new Date().toLocaleDateString("pt-BR")
      const message = `📋 *${w.name}* — ${date}\n\n${result}`
      const res     = await fetch("/api/integrations/rocketchat/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message,
          destination_type: "workflow",
          source_type:      "workflow_run",
          source_id:        runId ?? undefined,
        }),
      })
      setRcSent(res.ok ? "sent" : "error")
    } catch {
      setRcSent("error")
    }
  }

  function openInChat() {
    onClose()
    router.push("/chat")
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {wf && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={phase === "running" ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}20` }}
                  >
                    <Play size={14} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {w.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {phase === "running" ? "Gerando resultado..."
                        : phase === "result" ? "Concluído"
                        : phase === "error"  ? "Erro na execução"
                        : `Etapa ${step + 1} de ${totalSteps} · ${cat}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={phase === "running" ? undefined : onClose}
                  disabled={phase === "running"}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Step indicators — só no formulário com múltiplas etapas */}
              {phase === "form" && totalSteps > 1 && (
                <div
                  className="flex items-center gap-1.5 px-6 py-3 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  {effectiveSteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 flex-1">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                          i < step  && "bg-mota-600 text-white",
                          i === step && "text-white",
                          i > step  && "border",
                        )}
                        style={{
                          background:  i === step ? color : i < step ? "#16a34a" : undefined,
                          borderColor: i > step ? "var(--border-color)" : undefined,
                          color:       i > step ? "var(--text-muted)" : undefined,
                        }}
                      >
                        {i < step ? <Check size={10} /> : i + 1}
                      </div>
                      <span
                        className="text-[10px] truncate flex-1 hidden sm:block"
                        style={{ color: i === step ? "var(--text-primary)" : "var(--text-muted)" }}
                      >
                        {s.title}
                      </span>
                      {i < effectiveSteps.length - 1 && (
                        <ChevronRight size={12} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Conteúdo principal */}
              <div className="flex-1 overflow-y-auto p-6 max-h-[480px]">
                <AnimatePresence mode="wait">

                  {/* Streaming */}
                  {phase === "running" && (
                    <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                          style={{ borderColor: color, borderTopColor: "transparent" }}
                        />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Gerando resultado com IA...
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            Isso pode levar alguns segundos
                          </p>
                        </div>
                      </div>
                      {result && (
                        <div
                          className="rounded-xl border p-4 text-xs whitespace-pre-wrap leading-relaxed"
                          style={{
                            background:  "var(--bg-input)",
                            borderColor: "var(--border-color)",
                            color:       "var(--text-secondary)",
                            fontFamily:  "inherit",
                          }}
                        >
                          {result}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Resultado pronto */}
                  {phase === "result" && (
                    <motion.div key="result"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="space-y-4">
                      <div
                        className="flex items-center gap-2 p-3 rounded-xl border"
                        style={{ borderColor: `${color}40`, background: `${color}0a` }}
                      >
                        <Check size={14} style={{ color }} />
                        <p className="text-xs font-semibold" style={{ color }}>
                          Resultado gerado com sucesso
                        </p>
                        {runId && (
                          <span className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>
                            #{runId.slice(0, 8)}
                          </span>
                        )}
                      </div>

                      <div
                        className="rounded-xl border p-4 text-xs whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
                        style={{
                          background:  "var(--bg-input)",
                          borderColor: "var(--border-color)",
                          color:       "var(--text-primary)",
                          fontFamily:  "inherit",
                        }}
                      >
                        {result}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={copyResult}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                        >
                          <Copy size={12} />
                          {copied ? "Copiado!" : "Copiar texto"}
                        </button>

                        <button
                          onClick={exportResult}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                        >
                          <Download size={12} />
                          Exportar .txt
                        </button>

                        <button
                          onClick={() => { if (sourceSaved === "idle" || sourceSaved === "error") void saveAsSource() }}
                          disabled={sourceSaved === "saving" || sourceSaved === "saved" || !runId}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-[var(--bg-hover)] disabled:opacity-60"
                          style={{
                            borderColor: sourceSaved === "error" ? "#f87171" : "var(--border-color)",
                            color:       sourceSaved === "error" ? "#f87171" : "var(--text-secondary)",
                          }}
                        >
                          <Database size={12} />
                          {sourceSaved === "saving" ? "Salvando..." : sourceSaved === "saved" ? "Fonte salva!" : sourceSaved === "error" ? "Tentar de novo" : "Salvar como fonte"}
                        </button>

                        <button
                          onClick={() => { if (rcSent === "idle" || rcSent === "error") void sendToRC() }}
                          disabled={rcSent === "sending" || rcSent === "sent"}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-[var(--bg-hover)] disabled:opacity-60"
                          style={{
                            borderColor: rcSent === "error" ? "#f87171" : "var(--border-color)",
                            color:       rcSent === "error" ? "#f87171" : "var(--text-secondary)",
                          }}
                        >
                          <Send size={12} />
                          {rcSent === "sending" ? "Enviando..." : rcSent === "sent" ? "Enviado!" : rcSent === "error" ? "Tentar de novo" : "Enviar para RC"}
                        </button>

                        <button
                          onClick={openInChat}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
                          style={{ background: color, color: "#fff" }}
                        >
                          <MessageSquare size={12} />
                          Ir para o Chat
                        </button>
                      </div>

                      <button
                        onClick={reset}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <RefreshCw size={11} />
                        Executar novamente
                      </button>
                    </motion.div>
                  )}

                  {/* Erro */}
                  {phase === "error" && (
                    <motion.div key="error"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                        <AlertCircle size={24} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          Erro na execução
                        </p>
                        <p className="text-xs mt-1.5 leading-relaxed max-w-xs"
                          style={{ color: "var(--text-secondary)" }}>
                          {errorMsg}
                        </p>
                      </div>
                      <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                      >
                        <RefreshCw size={12} /> Tentar novamente
                      </button>
                    </motion.div>
                  )}

                  {/* Preview (etapa de revisão) */}
                  {phase === "form" && isPreviewStep && (
                    <motion.div key={`preview-${step}`}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <PreviewStep steps={effectiveSteps} color={color} values={values} />
                    </motion.div>
                  )}

                  {/* Campos do formulário */}
                  {phase === "form" && !isPreviewStep && (
                    <motion.div key={step}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {currentStep.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {currentStep.description}
                        </p>
                      </div>
                      {currentStep.fields.map((field) => (
                        <FieldRenderer
                          key={field.id}
                          field={field}
                          value={values[field.id]}
                          onChange={(v) => setValue(field.id, v)}
                          onToggleMulti={(opt) => toggleMulti(field.id, opt)}
                          color={color}
                        />
                      ))}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Footer — só no formulário */}
              {phase === "form" && (
                <div
                  className="flex items-center justify-between px-6 py-4 border-t shrink-0"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <button
                    onClick={back}
                    disabled={step === 0}
                    className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                  >
                    <ArrowLeft size={13} /> Voltar
                  </button>

                  <button
                    onClick={isLastStep ? execute : next}
                    className="flex items-center gap-2 text-xs px-5 py-2.5 rounded-xl text-white font-semibold transition-all"
                    style={{ background: color }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88" }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
                  >
                    {isLastStep
                      ? <><Sparkles size={13} /> Aprovar e executar</>
                      : <>Próxima etapa <ChevronRight size={13} /></>}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FieldRenderer({
  field, value, onChange, onToggleMulti, color,
}: {
  field:         WorkflowField
  value:         string | string[] | undefined
  onChange:      (v: string) => void
  onToggleMulti: (option: string) => void
  color:         string
}) {
  const baseInput = {
    background:  "var(--bg-input)",
    borderColor: "var(--border-color)",
    color:       "var(--text-primary)",
  }

  if (field.type === "multiselect") {
    const selected = (value as string[]) ?? []
    return (
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const sel = selected.includes(opt)
            return (
              <button
                key={opt} onClick={() => onToggleMulti(opt)}
                className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all"
                style={{
                  background:  sel ? `${color}18` : "var(--bg-input)",
                  borderColor: sel ? `${color}50` : "var(--border-color)",
                  color:       sel ? color : "var(--text-secondary)",
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none appearance-none"
          style={baseInput}
        >
          <option value="">Selecionar...</option>
          {field.options?.map((opt) => <option key={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </label>
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none resize-none placeholder:text-[var(--text-muted)]"
          style={baseInput}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {field.label} {field.required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none placeholder:text-[var(--text-muted)]"
        style={baseInput}
      />
    </div>
  )
}

function PreviewStep({
  steps, color, values,
}: {
  steps:  WorkflowStep[]
  color:  string
  values: Record<string, string | string[]>
}) {
  const filled = Object.entries(values).filter(([, v]) =>
    v && (Array.isArray(v) ? v.length > 0 : v !== ""),
  )

  const getLabelFor = (id: string): string => {
    for (const s of steps) {
      const f = s.fields.find((f) => f.id === id)
      if (f) return f.label
    }
    return id
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-3 p-4 rounded-xl border"
        style={{ borderColor: `${color}30`, background: `${color}08` }}
      >
        <Sparkles size={16} style={{ color }} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Pronto para executar
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Revise as informações abaixo antes de aprovar o workflow.
          </p>
        </div>
      </div>

      {filled.length > 0 ? (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-color)" }}>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {filled.map(([id, val]) => (
              <div key={id} className="flex gap-3 px-4 py-2.5 text-xs">
                <span className="w-36 shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>
                  {getLabelFor(id)}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {Array.isArray(val) ? val.join(", ") : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
          Nenhum campo preenchido — o workflow usará os padrões do agente.
        </p>
      )}
    </div>
  )
}
