"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, X, CalendarDays, Circle, MoreHorizontal,
  CheckSquare, Pencil, Archive, Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import {
  kanbanColumns, COMPANY_COLOR,
  type Task, type TaskStatus, type TaskPriority,
} from "@/lib/mocks/tasks"

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANY_OPTIONS = [
  { id: "cppem",   label: "CPPEM Concursos" },
  { id: "unicive", label: "Unicive" },
  { id: "colegio", label: "Colégio CPPEM" },
  { id: "everton", label: "Everton Mota" },
  { id: "grupo",   label: "Grupo Mota" },
]

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  baixa:   { label: "Baixa",   color: "#94a3b8" },
  media:   { label: "Média",   color: "#3b82f6" },
  alta:    { label: "Alta",    color: "#f59e0b" },
  urgente: { label: "Urgente", color: "#ef4444" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function nameColor(name: string): string {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#16a34a", "#06b6d4"]
  return colors[name.charCodeAt(0) % colors.length]
}

function fmtDate(iso: string): string {
  if (!iso) return ""
  const p = iso.split("-")
  return `${p[2]}/${p[1]}`
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface SavePayload {
  id:          string
  title:       string
  description: string
  status:      TaskStatus
  priority:    TaskPriority
  companyId:   string | null
  assigneeName: string | null
  dueDate:     string
}

function EditModal({
  task,
  onClose,
  onSave,
  onArchive,
  onDelete,
}: {
  task:      Task
  onClose:   () => void
  onSave:    (p: SavePayload) => Promise<void>
  onArchive: (id: string) => void
  onDelete:  (id: string) => void
}) {
  const [title,    setTitle]    = useState(task.title)
  const [desc,     setDesc]     = useState(task.description)
  const [status,   setStatus]   = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [company,  setCompany]  = useState(task.companyId ?? "")
  const [assignee, setAssignee] = useState(task.assigneeName ?? "")
  const [dueDate,  setDueDate]  = useState(task.dueDate ?? "")
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    await onSave({
      id:          task.id,
      title:       title.trim(),
      description: desc.trim(),
      status,
      priority,
      companyId:   company   || null,
      assigneeName: assignee.trim() || null,
      dueDate,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Editar Tarefa</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors" style={{ color: "var(--text-muted)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Título *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Descrição</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
              >
                {kanbanColumns.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
              >
                {(["baixa", "media", "alta", "urgente"] as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{priorityConfig[p].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Empresa</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
            >
              <option value="">— Nenhuma —</option>
              {COMPANY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Responsável</label>
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nome..."
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (confirm("Arquivar esta tarefa?")) { onArchive(task.id); onClose() } }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              <Archive size={11} /> Arquivar
            </button>
            <button
              onClick={() => { if (confirm("Excluir permanentemente? Não pode ser desfeito.")) { onDelete(task.id); onClose() } }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors hover:bg-red-500/10"
              style={{ color: "#ef4444" }}
            >
              <Trash2 size={11} /> Excluir
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 rounded-lg text-[10px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [taskList, setTaskList]       = useState<Task[]>(initialTasks)
  const [newTaskCol, setNewTaskCol]   = useState<TaskStatus | null>(null)
  const [newTitle, setNewTitle]       = useState("")
  const [newDesc, setNewDesc]         = useState("")
  const [newPriority, setNewPriority] = useState<TaskPriority>("media")
  const [newCompany, setNewCompany]   = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [newDueDate, setNewDueDate]   = useState("")
  const [saving, setSaving]           = useState(false)
  const [editTask, setEditTask]       = useState<Task | null>(null)
  const [openMenuId, setOpenMenuId]   = useState<string | null>(null)

  const totalOpen = taskList.filter((t) => t.status !== "done").length

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function moveTask(id: string, to: TaskStatus) {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: to } : t)))
    setOpenMenuId(null)
    await fetch("/api/tasks", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, status: to }),
    })
  }

  async function saveTask(p: SavePayload) {
    const an = p.assigneeName
    const ci = p.companyId
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === p.id
          ? {
              ...t,
              title:            p.title,
              description:      p.description,
              status:           p.status,
              priority:         p.priority,
              assigneeName:     an,
              assignee:         an ?? "—",
              assigneeInitials: an ? nameInitials(an) : "?",
              assigneeColor:    an ? nameColor(an)    : "#94a3b8",
              companyId:        ci,
              projectColor:     ci ? (COMPANY_COLOR[ci] ?? "#94a3b8") : "#94a3b8",
              dueDate:          p.dueDate,
            }
          : t
      )
    )
    await fetch("/api/tasks", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:            p.id,
        title:         p.title,
        description:   p.description,
        status:        p.status,
        priority:      p.priority,
        company_id:    p.companyId,
        assignee_name: p.assigneeName,
        due_date:      p.dueDate || null,
      }),
    })
  }

  function archiveTask(id: string) {
    setTaskList((prev) => prev.filter((t) => t.id !== id))
    fetch("/api/tasks", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, archive: true }),
    })
  }

  function deleteTask(id: string) {
    setTaskList((prev) => prev.filter((t) => t.id !== id))
    fetch("/api/tasks", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
  }

  async function addTask() {
    if (!newTitle.trim() || !newTaskCol || saving) return
    setSaving(true)
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        title:         newTitle.trim(),
        description:   newDesc.trim(),
        status:        newTaskCol,
        priority:      newPriority,
        company_id:    newCompany     || null,
        assignee_name: newAssignee.trim() || null,
        due_date:      newDueDate     || null,
        tags:          [],
      }),
    })
    const row = await res.json()
    const an = newAssignee.trim() || null
    const ci = newCompany || null
    setTaskList((prev) => [
      ...prev,
      {
        id:               row.id ?? `new-${Date.now()}`,
        title:            row.title ?? newTitle.trim(),
        description:      row.description ?? newDesc.trim(),
        status:           (row.status   ?? newTaskCol)  as TaskStatus,
        priority:         (row.priority ?? newPriority) as TaskPriority,
        assigneeName:     an,
        assignee:         an ?? "—",
        assigneeInitials: an ? nameInitials(an) : "?",
        assigneeColor:    an ? nameColor(an)    : "#94a3b8",
        companyId:        ci,
        projectColor:     ci ? (COMPANY_COLOR[ci] ?? "#94a3b8") : "#94a3b8",
        dueDate:          row.due_date ?? newDueDate,
        tags:             row.tags ?? [],
        archived:         false,
      },
    ])
    cancelNew()
    setSaving(false)
  }

  function cancelNew() {
    setNewTaskCol(null)
    setNewTitle("")
    setNewDesc("")
    setNewPriority("media")
    setNewCompany("")
    setNewAssignee("")
    setNewDueDate("")
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Tarefas"
          subtitle={`${totalOpen} abertas · ${taskList.filter((t) => t.status === "done").length} concluídas`}
          actions={
            <div className="flex items-center gap-2">
              <CheckSquare size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{taskList.length} total</span>
            </div>
          }
        />

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full p-5 min-w-max">
            {kanbanColumns.map((col) => {
              const colTasks = taskList.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="flex flex-col w-64 shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{col.label}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${col.color}20`, color: col.color }}
                      >
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setNewTaskCol(col.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Cards + inline create form */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pb-2">
                    <AnimatePresence>
                      {newTaskCol === col.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="rounded-xl border p-3 shadow-sm space-y-2"
                          style={{ background: "var(--bg-card)", borderColor: col.color + "60" }}
                        >
                          <input
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTask() }
                              if (e.key === "Escape") cancelNew()
                            }}
                            placeholder="Título da tarefa..."
                            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
                            style={{ color: "var(--text-primary)" }}
                          />
                          <textarea
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") cancelNew() }}
                            placeholder="Descrição..."
                            rows={2}
                            className="w-full bg-transparent text-xs outline-none resize-none placeholder:text-[var(--text-muted)]"
                            style={{ color: "var(--text-secondary)" }}
                          />
                          <select
                            value={newCompany}
                            onChange={(e) => setNewCompany(e.target.value)}
                            className="w-full rounded-md px-2 py-1 text-[10px] outline-none"
                            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                          >
                            <option value="">Empresa (opcional)</option>
                            {COMPANY_OPTIONS.map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input
                              value={newAssignee}
                              onChange={(e) => setNewAssignee(e.target.value)}
                              placeholder="Responsável..."
                              className="flex-1 rounded-md px-2 py-1 text-[10px] outline-none placeholder:text-[var(--text-muted)]"
                              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                            />
                            <input
                              type="date"
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="w-28 rounded-md px-2 py-1 text-[10px] outline-none"
                              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {(["baixa", "media", "alta", "urgente"] as TaskPriority[]).map((p) => (
                              <button
                                key={p}
                                onClick={() => setNewPriority(p)}
                                className="flex-1 py-0.5 rounded-md text-[9px] font-medium transition-all"
                                style={{
                                  background: newPriority === p ? priorityConfig[p].color + "25" : "var(--bg-tertiary)",
                                  color:      newPriority === p ? priorityConfig[p].color         : "var(--text-muted)",
                                  border:     `1px solid ${newPriority === p ? priorityConfig[p].color + "60" : "transparent"}`,
                                }}
                              >
                                {priorityConfig[p].label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={addTask}
                              disabled={saving || !newTitle.trim()}
                              className="text-[10px] px-3 py-1 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                              style={{ background: col.color }}
                            >
                              {saving ? "Criando…" : "Criar tarefa"}
                            </button>
                            <button
                              onClick={cancelNew}
                              className="p-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        moveTask={moveTask}
                        onEdit={() => { setOpenMenuId(null); setEditTask(task) }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editTask && (
          <EditModal
            task={editTask}
            onClose={() => setEditTask(null)}
            onSave={saveTask}
            onArchive={archiveTask}
            onDelete={deleteTask}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, openMenuId, setOpenMenuId, moveTask, onEdit,
}: {
  task:          Task
  openMenuId:    string | null
  setOpenMenuId: (id: string | null) => void
  moveTask:      (id: string, to: TaskStatus) => void
  onEdit:        () => void
}) {
  const pConf  = priorityConfig[task.priority]
  const isOpen = openMenuId === task.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border p-3 shadow-sm relative"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {task.companyId && (
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
          style={{ background: task.projectColor }}
        />
      )}
      <div className="pl-2">
        {/* Priority + title + menu */}
        <div className="flex items-start gap-2 mb-2">
          <Circle size={7} className="mt-1 shrink-0 fill-current" style={{ color: pConf.color }} />
          <p className="text-xs font-medium leading-snug flex-1" style={{ color: "var(--text-primary)" }}>
            {task.title}
          </p>
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenMenuId(isOpen ? null : task.id)}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              <MoreHorizontal size={13} />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-7 z-50 rounded-xl border shadow-lg overflow-hidden min-w-[160px]"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <button
                    onClick={onEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-hover)] text-left"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <div className="border-t my-0.5" style={{ borderColor: "var(--border-color)" }} />
                  <div className="px-3 pt-1.5 pb-0.5">
                    <p className="text-[9px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Mover para</p>
                  </div>
                  {kanbanColumns
                    .filter((c) => c.id !== task.status)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => moveTask(task.id, c.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)] text-left"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                        {c.label}
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-[10px] mb-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: assignee + due date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {task.assigneeName && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: task.assigneeColor }}
                title={task.assigneeName}
              >
                {task.assigneeInitials}
              </div>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <CalendarDays size={10} />
              <span className="text-[10px]">{fmtDate(task.dueDate)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
