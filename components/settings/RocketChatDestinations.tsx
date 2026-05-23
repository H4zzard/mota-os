"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Pencil, Trash2, Zap, Loader2, Check, X,
  AlertCircle, ChevronDown, Wifi, WifiOff, Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Destination {
  id:              string
  name:            string
  type:            string
  mode:            string
  base_url:        string | null
  user_id:         string | null
  channel:         string
  alias:           string | null
  avatar:          string | null
  status:          string
  is_default:      boolean
  company_id:      string | null
  has_webhook_url: boolean
  has_auth_token:  boolean
  created_at:      string
  updated_at:      string
}

const TYPE_LABELS: Record<string, string> = {
  chat:         "Chat IA",
  daily_report: "Relatório Diário",
  automation:   "Automação",
  watcher:      "Vigia / Alerta",
  workflow:     "Workflow",
  project:      "Projeto",
  general:      "Geral",
}

const TYPE_COLORS: Record<string, string> = {
  chat:         "#16a34a",
  daily_report: "#3b82f6",
  automation:   "#f97316",
  watcher:      "#ef4444",
  workflow:     "#8b5cf6",
  project:      "#f59e0b",
  general:      "#6366f1",
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  not_configured: { label: "Não config.",  color: "#94a3b8" },
  configured:     { label: "Configurado",  color: "#3b82f6" },
  connected:      { label: "Conectado",    color: "#16a34a" },
  error:          { label: "Erro",         color: "#ef4444" },
  inactive:       { label: "Inativo",      color: "#94a3b8" },
}

// ─── Form vazio ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:        "",
  type:        "chat",
  mode:        "webhook",
  webhook_url: "",
  base_url:    "",
  user_id:     "",
  auth_token:  "",
  channel:     "",
  alias:       "",
  avatar:      "",
  is_default:  false,
  company_id:  "",
}

type FormState = typeof EMPTY_FORM

// ─── Componente principal ─────────────────────────────────────────────────────

export function RocketChatDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetchErr,     setFetchErr]     = useState<string | null>(null)
  const [editingId,    setEditingId]    = useState<string | "new" | null>(null)
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [testing,      setTesting]      = useState<string | null>(null)
  const [formErr,      setFormErr]      = useState<string | null>(null)
  const [feedback,     setFeedback]     = useState<Record<string, { kind: "ok" | "error"; msg?: string } | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    try {
      const res  = await fetch("/api/integrations/rocketchat/destinations")
      const json = await res.json() as { destinations?: Destination[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar")
      setDestinations(json.destinations ?? [])
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormErr(null)
    setEditingId("new")
  }

  function openEdit(dest: Destination) {
    setForm({
      name:        dest.name,
      type:        dest.type,
      mode:        dest.mode,
      webhook_url: dest.has_webhook_url ? "****" : "",
      base_url:    dest.base_url ?? "",
      user_id:     dest.user_id  ?? "",
      auth_token:  dest.has_auth_token  ? "****" : "",
      channel:     dest.channel,
      alias:       dest.alias  ?? "",
      avatar:      dest.avatar ?? "",
      is_default:  dest.is_default,
      company_id:  dest.company_id ?? "",
    })
    setFormErr(null)
    setEditingId(dest.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setFormErr(null)
  }

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim())    { setFormErr("Nome é obrigatório."); return }
    if (!form.channel.trim()) { setFormErr("Canal é obrigatório."); return }

    setSaving(true)
    setFormErr(null)

    try {
      const isCreate = editingId === "new"
      const url      = isCreate
        ? "/api/integrations/rocketchat/destinations"
        : `/api/integrations/rocketchat/destinations/${editingId}`
      const method   = isCreate ? "POST" : "PATCH"

      const body: Record<string, unknown> = {
        name:       form.name.trim(),
        type:       form.type,
        mode:       form.mode,
        channel:    form.channel.trim(),
        alias:      form.alias.trim()  || null,
        avatar:     form.avatar.trim() || null,
        is_default: form.is_default,
        company_id: form.company_id.trim() || null,
      }

      // Secrets: não enviar se ainda mascarado (só no PATCH)
      if (form.mode === "webhook") {
        if (!form.webhook_url.startsWith("****")) body.webhook_url = form.webhook_url.trim() || null
      } else {
        if (!form.auth_token.startsWith("****")) body.auth_token = form.auth_token.trim() || null
        body.base_url = form.base_url.trim() || null
        body.user_id  = form.user_id.trim()  || null
      }

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { destination?: Destination; error?: string }

      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar")
      if (!json.destination) throw new Error("Resposta inválida")

      if (isCreate) {
        setDestinations((prev) => [...prev, json.destination!])
      } else {
        setDestinations((prev) => prev.map((d) => d.id === editingId ? json.destination! : d))
      }
      setEditingId(null)
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Erro inesperado")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(id: string) {
    setTesting(id)
    setFeedback((prev) => ({ ...prev, [id]: null }))
    try {
      const res  = await fetch(`/api/integrations/rocketchat/destinations/${id}/test`, {
        method: "POST",
      })
      const json = await res.json() as { ok: boolean; status: string; error?: string }

      setDestinations((prev) => prev.map((d) => d.id === id ? { ...d, status: json.status } : d))

      setFeedback((prev) => ({
        ...prev,
        [id]: json.ok
          ? { kind: "ok", msg: "Conectado" }
          : { kind: "error", msg: json.error ?? "Falha" },
      }))
      setTimeout(() => setFeedback((prev) => ({ ...prev, [id]: null })), 3500)
    } catch {
      setFeedback((prev) => ({ ...prev, [id]: { kind: "error", msg: "Erro de conexão" } }))
    } finally {
      setTesting(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o destino "${name}"?`)) return
    const res = await fetch(`/api/integrations/rocketchat/destinations/${id}`, { method: "DELETE" })
    if (res.ok) setDestinations((prev) => prev.filter((d) => d.id !== id))
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mt-6 space-y-3">
      {/* Título da seção */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Destinos Rocket.Chat
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Cada destino tem webhook, canal e alias próprios. O chat IA nunca mistura canal com o relatório diário.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white bg-mota-600 hover:bg-mota-700 transition-colors"
        >
          <Plus size={11} /> Novo destino
        </button>
      </div>

      {/* Loading / erro */}
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      )}
      {fetchErr && (
        <p className="text-xs text-red-400 py-2">{fetchErr}</p>
      )}

      {/* Lista de destinos */}
      {!loading && !fetchErr && (
        <div className="space-y-2">
          {destinations.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border border-dashed"
              style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
            >
              <Radio size={22} />
              <p className="text-xs">Nenhum destino configurado ainda.</p>
            </div>
          )}
          {destinations.map((dest) => {
            const typeColor  = TYPE_COLORS[dest.type] ?? "#6366f1"
            const statusInfo = STATUS_INFO[dest.status] ?? STATUS_INFO.not_configured
            const fb         = feedback[dest.id]
            const isTesting  = testing === dest.id
            const isEditing  = editingId === dest.id

            return (
              <div
                key={dest.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: isEditing ? "var(--border-active, #16a34a44)" : "var(--border-color)",
                  background:  "var(--bg-input)",
                }}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {dest.name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${typeColor}18`, color: typeColor }}
                      >
                        {TYPE_LABELS[dest.type] ?? dest.type}
                      </span>
                      {dest.is_default && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-mota-500/10 text-mota-600">
                          padrão
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {dest.mode === "webhook" ? "Webhook" : "REST"} · {dest.channel}
                      {dest.alias ? ` · ${dest.alias}` : ""}
                      {dest.company_id ? ` · ${dest.company_id}` : " · Global"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Feedback de teste */}
                    {fb?.kind === "ok" && (
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: "#16a34a" }}>
                        <Check size={10} /> {fb.msg}
                      </span>
                    )}
                    {fb?.kind === "error" && (
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: "#ef4444" }}>
                        <AlertCircle size={10} /> {fb.msg}
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>

                    {/* Testar */}
                    <button
                      onClick={() => void handleTest(dest.id)}
                      disabled={isTesting}
                      title="Testar conexão"
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {isTesting
                        ? <Loader2 size={11} className="animate-spin" />
                        : dest.status === "connected" ? <Wifi size={11} /> : <WifiOff size={11} />}
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => isEditing ? cancelEdit() : openEdit(dest)}
                      title="Editar"
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {isEditing ? <ChevronDown size={11} /> : <Pencil size={11} />}
                    </button>

                    {/* Excluir */}
                    <button
                      onClick={() => void handleDelete(dest.id, dest.name)}
                      title="Excluir"
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-red-500/10"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Form de edição inline */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <DestinationForm
                        form={form}
                        setF={setF}
                        formErr={formErr}
                        saving={saving}
                        isCreate={false}
                        onCancel={cancelEdit}
                        onSave={() => void handleSave()}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Form de criação */}
      <AnimatePresence>
        {editingId === "new" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-active, #16a34a44)", background: "var(--bg-input)" }}
          >
            <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border-color)" }}>
              <Zap size={12} style={{ color: "#16a34a" }} />
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                Novo destino
              </p>
            </div>
            <DestinationForm
              form={form}
              setF={setF}
              formErr={formErr}
              saving={saving}
              isCreate={true}
              onCancel={cancelEdit}
              onSave={() => void handleSave()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-componente: form ─────────────────────────────────────────────────────

function DestinationForm({
  form, setF, formErr, saving, isCreate, onCancel, onSave,
}: {
  form:     FormState
  setF:     <K extends keyof FormState>(key: K, value: FormState[K]) => void
  formErr:  string | null
  saving:   boolean
  isCreate: boolean
  onCancel: () => void
  onSave:   () => void
}) {
  const inputStyle = {
    background:  "var(--bg-card)",
    borderColor: "var(--border-color)",
    color:       "var(--text-primary)",
  }

  const SECRET_KEYS_OF_FORM = new Set(["webhook_url", "auth_token"])
  function isMasked(key: keyof FormState) {
    return SECRET_KEYS_OF_FORM.has(key) && (form[key] as string).startsWith("****")
  }

  return (
    <div className="p-4 space-y-3">
      {formErr && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 px-1">
          <AlertCircle size={11} />
          {formErr}
        </div>
      )}

      {/* Linha 1: Nome + Tipo + Modo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Nome *</label>
          <input
            value={form.name}
            onChange={(e) => setF("name", e.target.value)}
            placeholder="Chat IA"
            className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Tipo</label>
          <div className="relative">
            <select
              value={form.type}
              onChange={(e) => setF("type", e.target.value)}
              className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none appearance-none"
              style={inputStyle}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Modo</label>
          <div className="relative">
            <select
              value={form.mode}
              onChange={(e) => setF("mode", e.target.value)}
              className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none appearance-none"
              style={inputStyle}
            >
              <option value="webhook">Incoming Webhook</option>
              <option value="rest">REST API</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* Credenciais por modo */}
      {form.mode === "webhook" ? (
        <SecretInput
          label="Webhook URL *"
          fieldKey="webhook_url"
          value={form.webhook_url}
          masked={isMasked("webhook_url")}
          onChange={(v) => setF("webhook_url", v)}
          onUnmask={() => setF("webhook_url", "")}
          placeholder="https://chat.empresa.com/hooks/..."
          inputStyle={inputStyle}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Base URL *</label>
            <input
              value={form.base_url}
              onChange={(e) => setF("base_url", e.target.value)}
              placeholder="https://chat.empresa.com"
              className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>User ID *</label>
            <input
              value={form.user_id}
              onChange={(e) => setF("user_id", e.target.value)}
              placeholder="abc123..."
              className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div className="col-span-2">
            <SecretInput
              label="Auth Token *"
              fieldKey="auth_token"
              value={form.auth_token}
              masked={isMasked("auth_token")}
              onChange={(v) => setF("auth_token", v)}
              onUnmask={() => setF("auth_token", "")}
              placeholder="token..."
              inputStyle={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Canal + Alias + Avatar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Canal *</label>
          <input
            value={form.channel}
            onChange={(e) => setF("channel", e.target.value)}
            placeholder="#geral"
            className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Alias</label>
          <input
            value={form.alias}
            onChange={(e) => setF("alias", e.target.value)}
            placeholder="Jarvis"
            className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Avatar (URL)</label>
          <input
            value={form.avatar}
            onChange={(e) => setF("avatar", e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Empresa + Default */}
      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Empresa (slug, vazio = global)
          </label>
          <input
            value={form.company_id}
            onChange={(e) => setF("company_id", e.target.value)}
            placeholder="grupo, cppem, unicive..."
            className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <div
            onClick={() => setF("is_default", !form.is_default)}
            className={cn(
              "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
              form.is_default ? "bg-mota-600" : "bg-slate-300 dark:bg-slate-600",
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
              form.is_default ? "left-4.5 translate-x-0" : "left-0.5",
            )} />
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Padrão para este tipo
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-mota-600 hover:bg-mota-700 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {saving ? "Salvando..." : isCreate ? "Criar destino" : "Salvar"}
        </button>
      </div>
    </div>
  )
}

// ─── Input com suporte a mascaramento de secret ───────────────────────────────

function SecretInput({
  label, value, masked, onChange, onUnmask, placeholder, inputStyle,
}: {
  label:      string
  fieldKey:   string
  value:      string
  masked:     boolean
  onChange:   (v: string) => void
  onUnmask:   () => void
  placeholder: string
  inputStyle: Record<string, string>
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
      {masked ? (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg px-2.5 py-2 text-xs border font-mono"
            style={{ ...inputStyle, color: "var(--text-muted)" }}
          >
            {value}
          </div>
          <button
            onClick={onUnmask}
            className="shrink-0 text-[10px] px-2.5 py-2 rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
          >
            Alterar
          </button>
        </div>
      ) : (
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg px-2.5 py-2 text-xs border outline-none"
          style={inputStyle}
        />
      )}
      {masked && (
        <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
          Já salvo. Clique em Alterar para substituir.
        </p>
      )}
    </div>
  )
}
