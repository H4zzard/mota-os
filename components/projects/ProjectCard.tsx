"use client"

import { motion } from "framer-motion"
import { MessageSquare, CheckSquare, Clock, ArrowUpRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/StatusBadge"
import type { Project } from "@/lib/mocks/projects"

interface ProjectCardProps {
  project: Project
  index: number
  onOpen: (p: Project) => void
}

export function ProjectCard({ project: p, index, onOpen }: ProjectCardProps) {
  const taskPct = p.tasksTotal > 0 ? Math.round((p.tasksTotal - p.tasksOpen) / p.tasksTotal * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="rounded-2xl border flex flex-col overflow-hidden cursor-pointer group"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      onClick={() => onOpen(p)}
    >
      {/* Color bar */}
      <div className="h-1 shrink-0" style={{ backgroundColor: p.companyColor }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge status={p.status} />
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: `${p.companyColor}18`, color: p.companyColor }}
              >
                {p.company}
              </span>
            </div>
            <h3
              className="text-sm font-semibold leading-snug group-hover:text-mota-500 transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              {p.title}
            </h3>
            <p
              className="text-xs mt-1 leading-relaxed line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {p.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Progresso geral
            </span>
            <span className="text-[11px] font-semibold" style={{ color: p.companyColor }}>
              {p.progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${p.progress}%` }}
              transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              className="h-full rounded-full"
              style={{ backgroundColor: p.companyColor }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={MessageSquare} value={p.sessionsCount} label="sessões" />
          <Stat icon={CheckSquare} value={`${p.tasksTotal - p.tasksOpen}/${p.tasksTotal}`} label="tarefas" />
          <Stat icon={Users} value={p.responsible} label="resp." />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {p.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
            >
              {tag}
            </span>
          ))}
          {p.tags.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
              +{p.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-1.5">
          <Clock size={11} style={{ color: "var(--text-muted)" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {p.lastUpdated}
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-xs font-medium transition-colors text-mota-500 hover:text-mota-400"
          onClick={(e) => { e.stopPropagation(); onOpen(p) }}
        >
          Abrir projeto <ArrowUpRight size={12} />
        </button>
      </div>
    </motion.div>
  )
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl" style={{ background: "var(--bg-input)" }}>
      <Icon size={12} style={{ color: "var(--text-muted)" }} />
      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  )
}
