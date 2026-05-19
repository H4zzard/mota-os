"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ClipboardList,
  Plus,
  X,
  Loader2,
  Sparkles,
  Send,
  Download,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { useCompany } from "@/components/providers/CompanyProvider"
import { createClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyReport {
  id:                  string
  user_id:             string
  company_id:          string
  report_date:         string
  name:                string
  sector:              string | null
  role:                string | null
  activities:          string[]
  report_text:         string | null
  ai_used:             boolean
  status:              "draft" | "generated" | "submitted" | "sent" | "error"
  rocketchat_status:   string | null
  rocketchat_channel:  string | null
  rocketchat_sent_at:  string | null
  generated_at:        string | null
  submitted_at:        string | null
  created_at:          string
  updated_at:          string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })
}

const QUICK_EXAMPLES = [
  "Reunião de equipe",
  "Revisão de documentos",
  "Atendimento a alunos",
  "Elaboração de relatório",
  "Suporte técnico",
  "Planejamento pedagógico",
  "Análise de dados",
  "Desenvolvimento de projeto",
]

const STATUS_CONFIG = {
  draft:     { label: "Rascunho",  color: "#6b7280", bg: "bg-slate-500/10" },
  generated: { label: "Gerado",    color: "#3b82f6", bg: "bg-blue-500/10" },
  submitted: { label: "Enviado",   color: "#8b5cf6", bg: "bg-violet-500/10" },
  sent:      { label: "Enviado RC",color: "#16a34a", bg: "bg-green-500/10" },
  error:     { label: "Erro",      color: "#ef4444", bg: "bg-red-500/10" },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  const { currentCompany, allowedCompanies, loading: companyLoading } = useCompany()

  const [reportDate,  setReportDate]  = useState(todayISO())
  const [report,      setReport]      = useState<DailyReport | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [fetchErr,    setFetchErr]    = useState<string | null>(null)

  // Identification fields (local state, synced from report)
  const [name,        setName]        = useState("")
  const [sector,      setSector]      = useState("")
  const [role,        setRole]        = useState("")
  const [activities,  setActivities]  = useState<string[]>([])
  const [reportText,  setReportText]  = useState("")

  // UI state
  const [activityInput, setActivityInput] = useState("")
  const [saving,        setSaving]        = useState(false)
  const [generating,    setGenerating]    = useState(false)
  const [sending,       setSending]       = useState(false)
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [showExamples,  setShowExamples]  = useState(false)

  const activityRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Load report ────────────────────────────────────────────────────────────

  const loadReport = useCallback(async (date: string, companyId: string) => {
    setLoading(true)
    setFetchErr(null)
    setReport(null)
    try {
      const res = await fetch(`/api/daily-reports?date=${date}&company_id=${companyId}`)
      const json = await res.json() as { report?: DailyReport; error?: string }
      if (res.ok && json.report) {
        const r = json.report
        setReport(r)
        setName(r.name)
        setSector(r.sector ?? "")
        setRole(r.role ?? "")
        setActivities(r.activities ?? [])
        setReportText(r.report_text ?? "")
      } else {
        // No report yet — pre-fill identification from profile
        setName("")
        setSector("")
        setRole("")
        setActivities([])
        setReportText("")
        void prefillFromProfile()
      }
    } catch {
      setFetchErr("Erro ao carregar relatório")
    } finally {
      setLoading(false)
    }
  }, [])

  async function prefillFromProfile() {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const res = await fetch(`/api/users/${authUser.id}`)
      if (!res.ok) return
      const json = await res.json() as { user?: { name?: string | null; job_title?: string | null; department?: string | null } }
      if (json.user) {
        if (json.user.name)       setName(json.user.name)
        if (json.user.job_title)  setRole(json.user.job_title)
        if (json.user.department) setSector(json.user.department)
      }
    } catch { /* noop */ }
  }

  useEffect(() => {
    if (currentCompany && reportDate) {
      void loadReport(reportDate, currentCompany.slug)
    }
  }, [currentCompany, reportDate, loadReport])

  // ─── Activities ─────────────────────────────────────────────────────────────

  function addActivity(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setActivities((prev) => [...prev, trimmed])
    setActivityInput("")
    setShowExamples(false)
  }

  function removeActivity(idx: number) {
    setActivities((prev) => prev.filter((_, i) => i !== idx))
  }

  // ─── Save draft ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!currentCompany) return
    setSaving(true)
    try {
      let res: Response
      if (report?.id) {
        res = await fetch(`/api/daily-reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, sector, role, activities, report_text: reportText }),
        })
      } else {
        res = await fetch("/api/daily-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id:  currentCompany.slug,
            report_date: reportDate,
            name, sector, role, activities,
          }),
        })
      }
      const json = await res.json() as { report?: DailyReport; error?: string }
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar")
      setReport(json.report!)
      setReportText(json.report!.report_text ?? reportText)
      showToast("Rascunho salvo com sucesso")
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar", false)
    } finally {
      setSaving(false)
    }
  }

  // ─── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!currentCompany) return
    if (activities.length === 0) {
      showToast("Adicione ao menos uma atividade antes de gerar o relatório.", false)
      return
    }

    // Save first if no report ID yet
    let reportId = report?.id
    if (!reportId) {
      setSaving(true)
      try {
        const res = await fetch("/api/daily-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id:  currentCompany.slug,
            report_date: reportDate,
            name, sector, role, activities,
          }),
        })
        const json = await res.json() as { report?: DailyReport; error?: string }
        if (!res.ok) throw new Error(json.error ?? "Erro ao criar relatório")
        setReport(json.report!)
        reportId = json.report!.id
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : "Erro ao salvar", false)
        setSaving(false)
        return
      } finally {
        setSaving(false)
      }
    } else {
      // Sync activities before generate
      await fetch(`/api/daily-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sector, role, activities }),
      })
    }

    setGenerating(true)
    try {
      const res = await fetch(`/api/daily-reports/${reportId}/generate`, { method: "POST" })
      const json = await res.json() as { report?: DailyReport; ai_used?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? "Erro ao gerar relatório")
      setReport(json.report!)
      setReportText(json.report!.report_text ?? "")
      showToast(json.ai_used ? "Relatório gerado com IA" : "Relatório gerado (fallback local)")
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao gerar", false)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Send to Rocket.Chat ─────────────────────────────────────────────────────

  async function handleSendRC() {
    if (!report?.id) {
      showToast("Salve o relatório antes de enviar.", false)
      return
    }
    if (!report.report_text) {
      showToast("Gere o relatório antes de enviar.", false)
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/daily-reports/${report.id}/send-rocketchat`, { method: "POST" })
      const json = await res.json() as { ok?: boolean; channel?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? "Erro ao enviar")
      setReport((prev) => prev ? { ...prev, status: "sent", rocketchat_channel: json.channel ?? null } : prev)
      showToast(`Enviado para ${json.channel ?? "Rocket.Chat"}`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao enviar", false)
    } finally {
      setSending(false)
    }
  }

  // ─── Download .txt ───────────────────────────────────────────────────────────

  function handleDownload() {
    const text = reportText || activities.map((a) => `• ${a}`).join("\n")
    if (!text) { showToast("Nada para exportar.", false); return }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `relatorio-${name.replace(/\s+/g, "-").toLowerCase()}-${reportDate}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Clear ───────────────────────────────────────────────────────────────────

  function handleClear() {
    setActivities([])
    setReportText("")
    setActivityInput("")
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const busy = saving || generating || sending
  const statusCfg = report ? STATUS_CONFIG[report.status] : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Relatório Diário"
        subtitle={currentCompany ? `${currentCompany.name} · ${fmtDate(reportDate)}` : "Carregando…"}
        actions={
          <div className="flex items-center gap-2">
            {/* Date picker */}
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border outline-none transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-color)",
                color: "var(--text-secondary)",
              }}
            />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {companyLoading || loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : fetchErr ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <AlertCircle size={22} className="text-red-400" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{fetchErr}</p>
              <button
                onClick={() => currentCompany && void loadReport(reportDate, currentCompany.slug)}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          ) : (
            <>

              {/* ── Status badge ─────────────────────────────────────────── */}
              {statusCfg && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", statusCfg.bg)}
                    style={{ color: statusCfg.color, borderColor: statusCfg.color + "33" }}
                  >
                    {statusCfg.label}
                  </span>
                  {report?.rocketchat_channel && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Canal: {report.rocketchat_channel}
                    </span>
                  )}
                </div>
              )}

              {/* ── Identification card ──────────────────────────────────── */}
              <div
                className="rounded-2xl border p-5 space-y-4"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-mota-500 shrink-0" />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Identificação
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                      Nome completo
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-mota-500"
                      style={{
                        background: "var(--bg-input, var(--bg-hover))",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                      Cargo / Função
                    </label>
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Ex.: Coordenador Pedagógico"
                      className="w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-mota-500"
                      style={{
                        background: "var(--bg-input, var(--bg-hover))",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                      Setor / Departamento
                    </label>
                    <input
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      placeholder="Ex.: Pedagógico"
                      className="w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-mota-500"
                      style={{
                        background: "var(--bg-input, var(--bg-hover))",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {allowedCompanies.length > 1 && (
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                        Empresa
                      </label>
                      <p className="text-sm px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {currentCompany?.name ?? "–"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Activities ───────────────────────────────────────────── */}
              <div
                className="rounded-2xl border p-5 space-y-4"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Atividades do dia
                  </h2>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {activities.length} {activities.length === 1 ? "atividade" : "atividades"}
                  </span>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2">
                  <input
                    ref={activityRef}
                    value={activityInput}
                    onChange={(e) => setActivityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addActivity(activityInput) }
                    }}
                    placeholder="Descreva uma atividade e pressione Enter…"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-mota-500"
                    style={{
                      background: "var(--bg-input, var(--bg-hover))",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    onClick={() => addActivity(activityInput)}
                    disabled={!activityInput.trim()}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-mota-600 hover:bg-mota-700 text-white disabled:opacity-40 transition-colors shrink-0"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Quick examples */}
                <div>
                  <button
                    onClick={() => setShowExamples((v) => !v)}
                    className="flex items-center gap-1 text-xs transition-colors hover:text-mota-500"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <ChevronDown
                      size={12}
                      className={cn("transition-transform", showExamples && "rotate-180")}
                    />
                    Exemplos rápidos
                  </button>
                  <AnimatePresence>
                    {showExamples && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {QUICK_EXAMPLES.map((ex) => (
                            <button
                              key={ex}
                              onClick={() => addActivity(ex)}
                              className="text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-[var(--bg-hover)] hover:border-mota-500/40"
                              style={{
                                borderColor: "var(--border-color)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {ex}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Activity list */}
                <AnimatePresence initial={false}>
                  {activities.length === 0 ? (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-center py-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Nenhuma atividade adicionada ainda.
                    </motion.p>
                  ) : (
                    <motion.ul className="space-y-1.5">
                      {activities.map((act, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-start gap-2 group"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mota-500 shrink-0" />
                          <span
                            className="flex-1 text-sm leading-snug"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {act}
                          </span>
                          <button
                            onClick={() => removeActivity(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-hover)]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <X size={13} />
                          </button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Generated report ─────────────────────────────────────── */}
              <AnimatePresence>
                {(reportText || generating) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border p-5 space-y-3"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-mota-500" />
                        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Relatório gerado
                        </h2>
                        {report?.ai_used && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            IA
                          </span>
                        )}
                      </div>
                      {report?.generated_at && (
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {new Date(report.generated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {generating ? (
                      <div className="flex items-center gap-2 py-8 justify-center">
                        <Loader2 size={18} className="animate-spin text-mota-500" />
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          Gerando relatório com IA…
                        </span>
                      </div>
                    ) : (
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        rows={12}
                        className="w-full text-sm px-3 py-2.5 rounded-lg border outline-none transition-colors focus:border-mota-500 resize-y font-mono leading-relaxed"
                        style={{
                          background: "var(--bg-input, var(--bg-hover))",
                          borderColor: "var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Action buttons ───────────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 pb-6">
                <button
                  onClick={() => void handleSave()}
                  disabled={busy || !name.trim()}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Salvar rascunho
                </button>

                <button
                  onClick={() => void handleGenerate()}
                  disabled={busy || activities.length === 0}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold text-white bg-mota-600 hover:bg-mota-700 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Gerar com IA
                </button>

                {reportText && (
                  <>
                    <button
                      onClick={() => void handleSendRC()}
                      disabled={busy || !report?.id}
                      className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Enviar Rocket.Chat
                    </button>

                    <button
                      onClick={handleDownload}
                      disabled={busy}
                      className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                    >
                      <Download size={12} />
                      Baixar .txt
                    </button>
                  </>
                )}

                {(activities.length > 0 || reportText) && (
                  <button
                    onClick={handleClear}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors hover:bg-red-500/10 ml-auto disabled:opacity-50"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 size={12} />
                    Limpar
                  </button>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium"
            style={{
              background: "var(--bg-card)",
              borderColor: toast.ok ? "#16a34a44" : "#ef444444",
              color: toast.ok ? "#16a34a" : "#ef4444",
            }}
          >
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
