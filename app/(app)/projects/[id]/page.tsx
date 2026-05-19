"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Edit2, Check, X, Plus, Loader2,
  CheckSquare, Square, Trash2, Upload, File, Download,
  Target, DollarSign, CalendarDays, Tag, AlertCircle,
} from "lucide-react"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { cn } from "@/lib/utils"
import type { ApiProject, ApiTask, ApiProjectFile } from "@/lib/project-helpers"

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Tab = "visao-geral" | "tarefas" | "arquivos"

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente",
}
const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280", medium: "#3b82f6", high: "#f97316", urgent: "#ef4444",
}
const STATUS_OPTIONS = [
  { value: "planning",  label: "Planejamento" },
  { value: "active",    label: "Ativo"        },
  { value: "paused",    label: "Pausado"      },
  { value: "completed", label: "Concluído"    },
]
const PRIORITY_OPTIONS = [
  { value: "low",    label: "Baixa"   },
  { value: "medium", label: "Média"   },
  { value: "high",   label: "Alta"    },
  { value: "urgent", label: "Urgente" },
]
const TASK_PRIORITIES = [
  { value: "baixa",   label: "Baixa"   },
  { value: "media",   label: "Média"   },
  { value: "alta",    label: "Alta"    },
  { value: "urgente", label: "Urgente" },
]

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}
function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject]     = useState<ApiProject | null>(null)
  const [tasks, setTasks]         = useState<ApiTask[]>([])
  const [files, setFiles]         = useState<ApiProjectFile[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<Tab>("visao-geral")
  const [error, setError]         = useState("")

  // Editing state
  const [editing, setEditing]     = useState<Partial<ApiProject> | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Tasks
  const [newTaskTitle, setNewTaskTitle]   = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState("media")
  const [addingTask, setAddingTask]       = useState(false)
  const [togglingTask, setTogglingTask]   = useState<string | null>(null)
  const [deletingTask, setDeletingTask]   = useState<string | null>(null)

  // Files
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]         = useState(false)
  const [deletingFile, setDeletingFile]   = useState<string | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { setError("Projeto não encontrado"); return }
    setProject(await res.json() as ApiProject)
  }, [id])

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/tasks`)
    if (res.ok) setTasks(await res.json() as ApiTask[])
  }, [id])

  const loadFiles = useCallback(async () => {
    // project_files endpoint not yet paginated; keep simple
    const res = await fetch(`/api/projects/${id}/files`)
    if (res.ok) setFiles(await res.json() as ApiProjectFile[])
  }, [id])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProject(), loadTasks(), loadFiles()]).finally(() => setLoading(false))
  }, [loadProject, loadTasks, loadFiles])

  // ── Edit project ────────────────────────────────────────────────────────────

  function startEdit() {
    if (!project) return
    setEditing({
      name:        project.name,
      description: project.description,
      status:      project.status,
      priority:    project.priority,
      start_date:  project.start_date ?? "",
      due_date:    project.due_date ?? "",
      budget:      project.budget ?? undefined,
      objectives:  project.objectives ?? "",
    })
  }

  async function saveEdit() {
    if (!editing || !project) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editing,
          budget: editing.budget != null ? Number(editing.budget) : null,
        }),
      })
      if (res.ok) {
        setProject(await res.json() as ApiProject)
        setEditing(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async function createTask() {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), priority: newTaskPriority }),
      })
      if (res.ok) {
        const t = await res.json() as ApiTask
        setTasks((prev) => [t, ...prev])
        setNewTaskTitle("")
        void loadProject() // atualiza contagens
      }
    } finally {
      setAddingTask(false)
    }
  }

  async function toggleTask(t: ApiTask) {
    setTogglingTask(t.id)
    const newStatus = t.status === "done" ? "todo" : "done"
    try {
      const res = await fetch(`/api/project-tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json() as ApiTask
        setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x))
        void loadProject()
      }
    } finally {
      setTogglingTask(null)
    }
  }

  async function deleteTask(taskId: string) {
    setDeletingTask(taskId)
    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, { method: "DELETE" })
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        void loadProject()
      }
    } finally {
      setDeletingTask(null)
    }
  }

  // ── Files ───────────────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/projects/${id}/files/upload`, { method: "POST", body: fd })
      if (res.ok) {
        const pf = await res.json() as ApiProjectFile
        setFiles((prev) => [pf, ...prev])
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function deleteFile(fileId: string) {
    setDeletingFile(fileId)
    try {
      const res = await fetch(`/api/project-files/${fileId}`, { method: "DELETE" })
      if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } finally {
      setDeletingFile(null)
    }
  }

  async function downloadFile(fileId: string) {
    const res = await fetch(`/api/project-files/${fileId}`)
    if (!res.ok) return
    const data = await res.json() as { download_url?: string }
    if (data.download_url) window.open(data.download_url, "_blank")
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando projeto...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle size={32} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error || "Projeto não encontrado"}</p>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border hover:bg-[var(--bg-hover)]"
          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={12} /> Voltar
        </button>
      </div>
    )
  }

  const done  = tasks.filter((t) => t.status === "done").length
  const total = tasks.length
  const progress = total > 0 ? Math.round((done / total) * 100) : project.progress

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={() => router.push("/projects")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={editing.name ?? ""}
              onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
              className="text-base font-bold bg-transparent outline-none border-b focus:border-mota-500 w-full"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-color)" }}
            />
          ) : (
            <h1 className="text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {project.name}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={project.status as "active" | "paused" | "planning" | "completed" | "archived"} />
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ color: PRIORITY_COLORS[project.priority], background: `${PRIORITY_COLORS[project.priority]}15` }}
            >
              {PRIORITY_LABELS[project.priority] ?? project.priority}
            </span>
          </div>
        </div>

        {editing ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-mota-600 hover:bg-mota-700 text-white disabled:opacity-50"
            >
              {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Salvar
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-[var(--bg-hover)] shrink-0"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
          >
            <Edit2 size={12} /> Editar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-5 pt-3 border-b shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        {([ ["visao-geral", "Visão geral"], ["tarefas", "Tarefas"], ["arquivos", "Arquivos"] ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
              tab === key ? "border-mota-500 text-mota-500" : "border-transparent hover:text-[var(--text-primary)]"
            )}
            style={{ color: tab === key ? undefined : "var(--text-muted)" }}
          >
            {label}
            {key === "tarefas"  && <span className="ml-1.5 text-[10px] opacity-70">{total}</span>}
            {key === "arquivos" && <span className="ml-1.5 text-[10px] opacity-70">{files.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {tab === "visao-geral" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Progress */}
                <div
                  className="rounded-2xl border p-5 space-y-3"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Progresso</span>
                    <span className="text-sm font-bold text-mota-500">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-mota-500"
                    />
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {done} de {total} tarefas concluídas
                  </p>
                </div>

                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {editing ? (
                    <>
                      <InfoFieldEdit label="Status" icon={AlertCircle}>
                        <select
                          value={editing.status ?? "planning"}
                          onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                        >
                          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </InfoFieldEdit>
                      <InfoFieldEdit label="Prioridade" icon={AlertCircle}>
                        <select
                          value={editing.priority ?? "medium"}
                          onChange={(e) => setEditing((p) => ({ ...p, priority: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                        >
                          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </InfoFieldEdit>
                      <InfoFieldEdit label="Data início" icon={CalendarDays}>
                        <input type="date" value={(editing.start_date as string) ?? ""}
                          onChange={(e) => setEditing((p) => ({ ...p, start_date: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                      </InfoFieldEdit>
                      <InfoFieldEdit label="Data entrega" icon={CalendarDays}>
                        <input type="date" value={(editing.due_date as string) ?? ""}
                          onChange={(e) => setEditing((p) => ({ ...p, due_date: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                      </InfoFieldEdit>
                      <InfoFieldEdit label="Budget (R$)" icon={DollarSign}>
                        <input type="number" min="0" step="0.01"
                          value={editing.budget != null ? String(editing.budget) : ""}
                          onChange={(e) => setEditing((p) => ({ ...p, budget: e.target.value ? Number(e.target.value) : null }))}
                          className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                      </InfoFieldEdit>
                    </>
                  ) : (
                    <>
                      <InfoField label="Início"    icon={CalendarDays} value={fmtDate(project.start_date)} />
                      <InfoField label="Entrega"   icon={CalendarDays} value={fmtDate(project.due_date)} />
                      <InfoField label="Budget"    icon={DollarSign}   value={project.budget != null ? `R$ ${Number(project.budget).toLocaleString("pt-BR")}` : "—"} />
                      <InfoField label="Prioridade" icon={AlertCircle}  value={PRIORITY_LABELS[project.priority] ?? project.priority} />
                    </>
                  )}
                </div>

                {/* Objective */}
                <div
                  className="rounded-2xl border p-5"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={13} className="text-mota-500" />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Objetivo</span>
                  </div>
                  {editing ? (
                    <textarea
                      value={editing.objectives as string ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, objectives: e.target.value }))}
                      rows={3}
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none resize-none focus:ring-1 focus:ring-mota-500"
                      style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                      {project.objectives || project.description || "—"}
                    </p>
                  )}
                </div>

                {/* Description */}
                {editing && (
                  <div
                    className="rounded-2xl border p-5"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <span className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>Descrição</span>
                    <textarea
                      value={editing.description ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none resize-none focus:ring-1 focus:ring-mota-500"
                      style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                  </div>
                )}

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <Tag size={12} style={{ color: "var(--text-muted)" }} />
                    {project.tags.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded font-medium"
                        style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "tarefas" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                {/* Add task */}
                <div
                  className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void createTask() }}
                    placeholder="Nova tarefa..."
                    className="flex-1 text-xs bg-transparent outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded border outline-none"
                    style={{ background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                  >
                    {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button
                    onClick={() => void createTask()}
                    disabled={addingTask || !newTaskTitle.trim()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-mota-600 text-white disabled:opacity-50"
                  >
                    {addingTask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </div>

                {/* Task list */}
                {tasks.length === 0 ? (
                  <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                    Nenhuma tarefa. Adicione a primeira acima.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border group hover:bg-[var(--bg-hover)] transition-colors"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                      >
                        <button
                          onClick={() => void toggleTask(t)}
                          disabled={togglingTask === t.id}
                          className="shrink-0"
                        >
                          {togglingTask === t.id
                            ? <Loader2 size={15} className="animate-spin text-mota-500" />
                            : t.status === "done"
                              ? <CheckSquare size={15} className="text-mota-500" />
                              : <Square size={15} style={{ color: "var(--text-muted)" }} />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn("text-xs", t.status === "done" && "line-through")}
                            style={{ color: t.status === "done" ? "var(--text-muted)" : "var(--text-primary)" }}
                          >
                            {t.title}
                          </p>
                          {t.due_date && (
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                              Prazo: {fmtDate(t.due_date)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => void deleteTask(t.id)}
                          disabled={deletingTask === t.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded hover:bg-red-100"
                          style={{ color: "#ef4444" }}
                        >
                          {deletingTask === t.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "arquivos" && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                {/* Upload button */}
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {files.length} arquivo{files.length !== 1 ? "s" : ""} · máx 20 MB por arquivo
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-mota-600 hover:bg-mota-700 text-white transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Enviar arquivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {files.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border-2 border-dashed"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <Upload size={28} style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum arquivo enviado</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-mota-500 hover:underline"
                    >
                      Clique para enviar o primeiro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border group hover:bg-[var(--bg-hover)] transition-colors"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "rgba(16,185,129,0.1)" }}
                        >
                          <File size={15} className="text-mota-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {f.file_name}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {f.file_type.toUpperCase()} · {fmtBytes(f.file_size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => void downloadFile(f.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-input)]"
                            style={{ color: "var(--text-muted)" }}
                            title="Baixar"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => void deleteFile(f.id)}
                            disabled={deletingFile === f.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100"
                            style={{ color: "#ef4444" }}
                            title="Excluir"
                          >
                            {deletingFile === f.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function InfoField({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value: string }) {
  return (
    <div className="rounded-xl p-3 border space-y-1"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-mota-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  )
}

function InfoFieldEdit({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 border space-y-1"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-mota-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}
