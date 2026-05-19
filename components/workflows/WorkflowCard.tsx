"use client"

import { motion } from "framer-motion"
import {
  Play, Clock, Pencil, Trash2,
  Megaphone, BarChart3, Calendar, Palette,
  MessageCircle, TrendingUp, ListChecks, Rocket, Search, Globe,
} from "lucide-react"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { type DBWorkflow, workflowColor, categoryLabel } from "@/lib/workflow-types"

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  marketing:  Megaphone,
  traffic:    BarChart3,
  content:    Palette,
  sales:      TrendingUp,
  management: ListChecks,
  launch:     Rocket,
  reports:    BarChart3,
  project:    Calendar,
  support:    MessageCircle,
  custom:     Globe,
  "Marketing":    Megaphone,
  "Tráfego Pago": BarChart3,
  "Conteúdo":     Palette,
  "Design":       Palette,
  "Comercial":    TrendingUp,
  "Gestão":       ListChecks,
  "Lançamentos":  Rocket,
  "Relatórios":   BarChart3,
  "Pesquisa":     Search,
  "Conversão":    TrendingUp,
}

interface WorkflowCardProps {
  workflow:  DBWorkflow
  index:     number
  onExecute: (w: DBWorkflow) => void
  onEdit:    (w: DBWorkflow) => void
  onDelete:  (id: string) => void
}

export function WorkflowCard({ workflow: w, index, onExecute, onEdit, onDelete }: WorkflowCardProps) {
  const color = workflowColor(w)
  const cat   = categoryLabel(w.category ?? w.area)
  const Icon  = CATEGORY_ICONS[w.category ?? ""] ?? CATEGORY_ICONS[w.area ?? ""] ?? Play

  const lastRun = w.last_run_at
    ? new Date(w.last_run_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—"

  async function handleDelete() {
    if (!confirm(`Excluir o workflow "${w.name}"?`)) return
    await fetch(`/api/workflows/${w.id}`, { method: "DELETE" })
    onDelete(w.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-2xl border flex flex-col overflow-hidden group"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}15` }}
          >
            <Icon size={18} style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={w.status} />
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: `${color}15`, color }}
              >
                {cat}
              </span>
            </div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {w.name}
            </h3>
          </div>

          {/* Edit / Delete — aparecem no hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onEdit(w)}
              title="Editar"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDelete}
              title="Excluir"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Description */}
        {w.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {w.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Campos",    value: `${w.input_schema?.length ?? 0}` },
            { label: "Execuções", value: `${w.run_count ?? 0}×` },
            { label: "Última",    value: w.last_run_at
                ? new Date(w.last_run_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                : "—" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: "var(--bg-input)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {m.value}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Last run timestamp */}
        {w.last_run_at && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <Clock size={11} />
            <span>Último: {lastRun}</span>
          </div>
        )}
      </div>

      {/* Execute button */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border-color)" }}>
        <button
          onClick={() => onExecute(w)}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all text-white"
          style={{ background: color }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
        >
          <Play size={13} />
          Executar workflow
        </button>
      </div>
    </motion.div>
  )
}
