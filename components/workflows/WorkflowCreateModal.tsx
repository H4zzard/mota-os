"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/components/providers/CompanyProvider"
import {
  type DBWorkflow,
  CATEGORY_LABELS,
  OUTPUT_TYPE_LABELS,
} from "@/lib/workflow-types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkflowCreateModalProps {
  open:     boolean
  workflow: DBWorkflow | null    // null = criar, truthy = editar
  onClose:  () => void
  onSaved:  (wf: DBWorkflow) => void
}

// ─── Estado do formulário ─────────────────────────────────────────────────────

interface FormState {
  name:             string
  description:      string
  category:         string
  status:           "active" | "inactive"
  output_type:      string
  prompt_template:  string
  input_schema_raw: string   // JSON string do input_schema
  scope:            "global" | "company"
}

function defaultForm(wf: DBWorkflow | null, companySlug: string | null): FormState {
  if (!wf) {
    return {
      name:             "",
      description:      "",
      category:         "custom",
      status:           "active",
      output_type:      "text",
      prompt_template:  "",
      input_schema_raw: "[]",
      scope:            companySlug ? "company" : "global",
    }
  }
  return {
    name:             wf.name,
    description:      wf.description ?? "",
    category:         wf.category ?? wf.area ?? "custom",
    status:           wf.status === "inactive" ? "inactive" : "active",
    output_type:      wf.output_type ?? "text",
    prompt_template:  wf.prompt_template ?? "",
    input_schema_raw: JSON.stringify(wf.input_schema ?? [], null, 2),
    scope:            wf.company_id ? "company" : "global",
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function WorkflowCreateModal({ open, workflow, onClose, onSaved }: WorkflowCreateModalProps) {
  const { currentCompany } = useCompany()

  const [form,    setForm]    = useState<FormState>(() => defaultForm(workflow, currentCompany?.slug ?? null))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [schemaErr, setSchemaErr] = useState<string | null>(null)

  // Reset do form quando o modal abre / muda de workflow
  useEffect(() => {
    if (open) {
      setForm(defaultForm(workflow, currentCompany?.slug ?? null))
      setError(null)
      setSchemaErr(null)
    }
  }, [open, workflow, currentCompany])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateSchema(): unknown[] | null {
    try {
      const parsed = JSON.parse(form.input_schema_raw) as unknown
      if (!Array.isArray(parsed)) {
        setSchemaErr("Deve ser um array JSON: [ ... ]")
        return null
      }
      setSchemaErr(null)
      return parsed
    } catch {
      setSchemaErr("JSON inválido. Verifique a sintaxe.")
      return null
    }
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError("O nome é obrigatório."); return }

    const inputSchema = validateSchema()
    if (inputSchema === null) return

    setSaving(true)
    try {
      const companyId = form.scope === "company" ? (currentCompany?.slug ?? null) : null

      const body = {
        name:            form.name.trim(),
        description:     form.description.trim() || null,
        category:        form.category || null,
        status:          form.status,
        output_type:     form.output_type,
        prompt_template: form.prompt_template.trim() || null,
        input_schema:    inputSchema,
        company_id:      companyId,
      }

      const url    = workflow ? `/api/workflows/${workflow.id}` : "/api/workflows"
      const method = workflow ? "PATCH" : "POST"

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { workflow?: DBWorkflow; error?: string }

      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar")
      if (!json.workflow) throw new Error("Resposta inválida do servidor")

      onSaved(json.workflow)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado")
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!workflow

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={saving ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {isEdit ? "Editar workflow" : "Novo workflow"}
                </p>
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[620px]">

                {/* Erro global */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    <AlertCircle size={13} className="shrink-0" />
                    {error}
                  </div>
                )}

                {/* ── Nome ── */}
                <Field label="Nome *">
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ex: Gerador de posts para Instagram"
                    className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none placeholder:text-[var(--text-muted)]"
                    style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </Field>

                {/* ── Descrição ── */}
                <Field label="Descrição">
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Descreva o que este workflow faz..."
                    rows={2}
                    className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none resize-none placeholder:text-[var(--text-muted)]"
                    style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </Field>

                {/* ── Categoria / Status / Tipo ── */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Categoria">
                    <SelectField
                      value={form.category}
                      onChange={(v) => set("category", v)}
                      options={Object.entries(CATEGORY_LABELS).map(([k, label]) => ({ value: k, label }))}
                    />
                  </Field>
                  <Field label="Status">
                    <SelectField
                      value={form.status}
                      onChange={(v) => set("status", v as "active" | "inactive")}
                      options={[
                        { value: "active",   label: "Ativo" },
                        { value: "inactive", label: "Inativo" },
                      ]}
                    />
                  </Field>
                  <Field label="Tipo de saída">
                    <SelectField
                      value={form.output_type}
                      onChange={(v) => set("output_type", v)}
                      options={Object.entries(OUTPUT_TYPE_LABELS).map(([k, label]) => ({ value: k, label }))}
                    />
                  </Field>
                </div>

                {/* ── Escopo ── */}
                <Field label="Visibilidade">
                  <div className="flex gap-2">
                    {(["global", "company"] as const).map((scope) => (
                      <button
                        key={scope}
                        onClick={() => set("scope", scope)}
                        disabled={scope === "company" && !currentCompany}
                        className={cn(
                          "flex-1 py-2 rounded-xl border text-xs font-medium transition-all",
                          form.scope === scope ? "border-mota-600 bg-mota-600/10 text-mota-600" : "hover:bg-[var(--bg-hover)]",
                        )}
                        style={{
                          borderColor: form.scope === scope ? undefined : "var(--border-color)",
                          color:       form.scope === scope ? undefined : "var(--text-secondary)",
                        }}
                      >
                        {scope === "global" ? "Global (todos)" : `Empresa: ${currentCompany?.name ?? "—"}`}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* ── Prompt template ── */}
                <Field
                  label="Prompt template"
                  hint="Use {{variavel}} para interpolar campos de entrada."
                >
                  <textarea
                    value={form.prompt_template}
                    onChange={(e) => set("prompt_template", e.target.value)}
                    placeholder={"Crie um post para Instagram sobre {{tema}}.\nTom: {{tom}}.\nPúblico-alvo: {{publico}}."}
                    rows={6}
                    className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none resize-y placeholder:text-[var(--text-muted)] font-mono"
                    style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </Field>

                {/* ── Input schema ── */}
                <Field
                  label="Campos de entrada (JSON)"
                  hint={schemaErr ?? 'Array de objetos: { "id", "label", "type", "placeholder", "required", "options" }'}
                  hintError={!!schemaErr}
                >
                  <textarea
                    value={form.input_schema_raw}
                    onChange={(e) => { set("input_schema_raw", e.target.value); setSchemaErr(null) }}
                    onBlur={validateSchema}
                    rows={8}
                    spellCheck={false}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-xs border outline-none resize-y font-mono",
                      schemaErr && "border-red-400/60",
                    )}
                    style={{ background: "var(--bg-input)", borderColor: schemaErr ? undefined : "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </Field>

              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-mota-600 hover:bg-mota-700 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar workflow"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function Field({
  label, hint, hintError = false, children,
}: {
  label:      string
  hint?:      string
  hintError?: boolean
  children:   React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px]" style={{ color: hintError ? "#f87171" : "var(--text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function SelectField({
  value, onChange, options,
}: {
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none appearance-none pr-7"
        style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--text-muted)" }} />
    </div>
  )
}
