"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, MessageSquare, CheckSquare, Target, DollarSign,
  CalendarDays, CheckCircle2, ExternalLink, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/StatusBadge"
import type { Project } from "@/lib/mocks/projects"

const tabs = ["Visão geral", "Sessões", "Tarefas", "Documentos"] as const
type Tab = (typeof tabs)[number]

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

export function ProjectModal({ project: p, onClose }: ProjectModalProps) {
  const [tab, setTab] = useState<Tab>("Visão geral")

  return (
    <AnimatePresence>
      {p && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-2xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="h-1.5 shrink-0" style={{ backgroundColor: p.companyColor }} />
              <div
                className="flex items-start gap-4 px-6 py-5 border-b shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
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
                  <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {p.title}
                  </h2>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {p.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex gap-1 px-5 pt-3 pb-0 border-b shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                      tab === t
                        ? "border-mota-500 text-mota-500"
                        : "border-transparent hover:text-[var(--text-primary)]"
                    )}
                    style={{ color: tab === t ? undefined : "var(--text-muted)" }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {tab === "Visão geral" && <OverviewTab p={p} />}
                {tab === "Sessões"     && <SessionsTab />}
                {tab === "Tarefas"     && <TasksTab p={p} />}
                {tab === "Documentos"  && <DocsTab />}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-6 py-4 border-t shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <button
                  className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                >
                  <ExternalLink size={13} /> Abrir em nova aba
                </button>
                <button className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-mota-600 hover:bg-mota-700 text-white transition-colors">
                  <Sparkles size={13} /> Nova sessão neste projeto
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function OverviewTab({ p }: { p: Project }) {
  return (
    <div className="space-y-5">
      {/* Key info */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Target,      label: "Objetivo",       value: p.objective },
          { icon: DollarSign,  label: "Budget",         value: p.budget ?? "—" },
          { icon: CalendarDays,label: "Início",          value: p.startDate },
          { icon: CalendarDays,label: "Previsão fim",    value: p.endDate ?? "—" },
        ].map((row) => (
          <div key={row.label} className="rounded-xl p-3 border space-y-1"
            style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
            <div className="flex items-center gap-1.5">
              <row.icon size={12} className="text-mota-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {row.label}
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{row.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Progresso geral</span>
          <span className="text-xs font-bold" style={{ color: p.companyColor }}>{p.progress}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${p.progress}%` }}
            transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: p.companyColor }} />
        </div>
      </div>

      {/* Highlights */}
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Destaques</p>
        <div className="space-y-2">
          {p.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 size={13} className="text-mota-500 shrink-0 mt-0.5" />
              <span style={{ color: "var(--text-primary)" }}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SessionsTab() {
  const mockSess = [
    { title: "Criar campanha Intensivão PMPE", agent: "Marketing", time: "14min" },
    { title: "Analisar relatório semanal",     agent: "Tráfego Pago", time: "1h" },
    { title: "Revisar criativos com designer", agent: "Marketing", time: "3h" },
  ]
  return (
    <div className="space-y-2">
      {mockSess.map((s, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
          style={{ borderColor: "var(--border-color)" }}>
          <MessageSquare size={14} className="text-mota-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.title}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.agent}</p>
          </div>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.time}</span>
        </div>
      ))}
    </div>
  )
}

function TasksTab({ p }: { p: Project }) {
  const done = p.tasksTotal - p.tasksOpen
  const tasks = [
    ...Array(done).fill(null).map((_, i) => ({ text: `Tarefa concluída ${i + 1}`, done: true })),
    ...Array(Math.min(p.tasksOpen, 4)).fill(null).map((_, i) => ({ text: `Tarefa em andamento ${i + 1}`, done: false })),
  ]
  return (
    <div className="space-y-2">
      {tasks.map((t, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
          style={{ borderColor: "var(--border-color)" }}>
          <CheckSquare size={13} className={t.done ? "text-mota-500" : ""} style={!t.done ? { color: "var(--text-muted)" } : {}} />
          <span className={cn("text-xs", t.done && "line-through")}
            style={{ color: t.done ? "var(--text-muted)" : "var(--text-primary)" }}>
            {t.text}
          </span>
        </div>
      ))}
    </div>
  )
}

function DocsTab() {
  const docs = ["Briefing — Campanha PMPE.pdf", "Criativos aprovados.zip", "Relatório semana 18.pdf"]
  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div key={d} className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
          style={{ borderColor: "var(--border-color)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(22,163,74,0.1)" }}>
            <CheckSquare size={14} className="text-mota-500" />
          </div>
          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{d}</p>
        </div>
      ))}
    </div>
  )
}
