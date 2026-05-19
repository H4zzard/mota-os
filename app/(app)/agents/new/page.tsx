"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bot, Save, AlertCircle } from "lucide-react"
import { useCompany } from "@/components/providers/CompanyProvider"
import { cn } from "@/lib/utils"

const inputCls = [
  "w-full rounded-xl border px-3 py-2 text-xs outline-none transition-colors",
  "focus:border-mota-500",
  "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]",
].join(" ")

export default function NewAgentPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()

  const [form, setForm] = useState({
    name:             "",
    short_name:       "",
    slug:             "",
    description:      "",
    role_description: "",
    category:         "",
    icon:             "Bot",
    color:            "#6366f1",
    bg_color:         "rgba(99,102,241,0.12)",
    provider:         "anthropic",
    model_id:         "claude-sonnet-4-6",
    temperature:      0.7,
    max_tokens:       4000,
    system_prompt:    "",
  })

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = k === "temperature" || k === "max_tokens" ? Number(e.target.value) : e.target.value
      setForm((f) => {
        const next = { ...f, [k]: val }
        // Auto-fill slug from name
        if (k === "name") {
          next.slug = (e.target.value as string)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
          if (!f.short_name || f.short_name === f.name) {
            next.short_name = e.target.value as string
          }
        }
        return next
      })
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome é obrigatório."); return }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/agents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          company_id: currentCompany?.slug ?? null,
        }),
      })

      if (res.status === 401) { setError("Sessão expirada. Faça login novamente."); return }
      if (res.status === 403) {
        setError("Sem permissão. Apenas administradores globais podem criar agentes.")
        return
      }

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao criar agente."); return }

      router.push(`/agents/${data.id}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center gap-4 px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border-color)", background: "var(--bg-secondary)" }}
      >
        <button
          onClick={() => router.push("/agents")}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
        </button>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: form.bg_color }}
        >
          <Bot size={16} style={{ color: form.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {form.name || "Novo agente"}
          </h1>
          {currentCompany && (
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Será vinculado a: {currentCompany.name}
            </p>
          )}
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* ── Seção: Identidade ── */}
          <Section title="Identidade">
            <Row label="Nome *">
              <input className={inputCls} value={form.name} onChange={set("name")} required
                placeholder="ex: Agente de Marketing" autoFocus />
            </Row>
            <Row label="Nome curto">
              <input className={inputCls} value={form.short_name} onChange={set("short_name")}
                placeholder="ex: Marketing" />
            </Row>
            <Row label="Slug (URL)">
              <input className={inputCls} value={form.slug} onChange={set("slug")}
                placeholder="ex: marketing" pattern="[a-z0-9-]+" />
            </Row>
            <Row label="Categoria">
              <input className={inputCls} value={form.category} onChange={set("category")}
                placeholder="ex: Marketing, Suporte, Vendas" />
            </Row>
          </Section>

          {/* ── Seção: Descrição / Papel ── */}
          <Section title="Descrição">
            <Row label="Descrição curta">
              <textarea className={inputCls} rows={2} value={form.description} onChange={set("description")}
                placeholder="Uma linha descrevendo o que este agente faz." />
            </Row>
            <Row label="Papel (system prompt base)">
              <textarea className={inputCls} rows={5} value={form.role_description} onChange={set("role_description")}
                placeholder="Descreva o papel, tom, restrições e comportamento esperado deste agente..." />
            </Row>
          </Section>

          {/* ── Seção: Visual ── */}
          <Section title="Visual">
            <Row label="Ícone (nome Lucide)">
              <input className={inputCls} value={form.icon} onChange={set("icon")}
                placeholder="Bot" />
            </Row>
            <div className="grid grid-cols-2 gap-4">
              <Row label="Cor primária">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={set("color")}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0" />
                  <input className={cn(inputCls, "flex-1")} value={form.color} onChange={set("color")} />
                </div>
              </Row>
              <Row label="Cor de fundo">
                <input className={inputCls} value={form.bg_color} onChange={set("bg_color")}
                  placeholder="rgba(99,102,241,0.12)" />
              </Row>
            </div>
          </Section>

          {/* ── Seção: Modelo ── */}
          <Section title="Configuração de modelo">
            <Row label="Provedor">
              <select className={inputCls} value={form.provider} onChange={set("provider")}>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </Row>
            <Row label="Model ID">
              <input className={inputCls} value={form.model_id} onChange={set("model_id")}
                placeholder="claude-sonnet-4-6" />
            </Row>
            <Row label={`Temperatura (${form.temperature})`}>
              <input type="range" min={0} max={1} step={0.05}
                value={form.temperature} onChange={set("temperature")}
                className="w-full accent-mota-600" />
            </Row>
            <Row label="Max tokens">
              <input type="number" className={inputCls} value={form.max_tokens} onChange={set("max_tokens")}
                min={256} max={32000} step={256} />
            </Row>
            <Row label="System prompt (opcional — gerado automaticamente se vazio)">
              <textarea className={inputCls} rows={4} value={form.system_prompt} onChange={set("system_prompt")}
                placeholder="Deixe em branco para gerar a partir do nome e descrição." />
            </Row>
          </Section>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-mota-600 hover:bg-mota-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {saving ? "Criando agente..." : "Criar agente"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/agents")}
              className="px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <h2 className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  )
}
