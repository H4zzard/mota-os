"use client"

import { useState } from "react"
import { Check, X, Clock, CheckSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { PendingTaskItem } from "@/app/(app)/dashboard/page"

const priorityColor: Record<string, string> = {
  urgente: "#ef4444",
  alta:    "#f59e0b",
  media:   "#3b82f6",
  baixa:   "#94a3b8",
}

const priorityLabel: Record<string, string> = {
  urgente: "Urgente",
  alta:    "Alta",
  media:   "Média",
  baixa:   "Baixa",
}

export function PendingApprovals({ tasks }: { tasks: PendingTaskItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = tasks.filter((t) => !dismissed.has(t.id))

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <CheckSquare size={24} className="text-mota-500" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {tasks.length === 0 ? "Nenhuma tarefa aguardando aprovação" : "Tudo revisado"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((t) => {
          const pColor = priorityColor[t.priority] ?? "#94a3b8"
          const pLabel = priorityLabel[t.priority] ?? t.priority
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                      style={{
                        background: `${pColor}15`,
                        color:       pColor,
                        borderColor: `${pColor}40`,
                      }}
                    >
                      {pLabel}
                    </span>
                    {t.companyId && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}
                      >
                        {t.companyName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} style={{ color: "var(--text-muted)" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.timeAgo}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setDismissed((p) => new Set([...p, t.id]))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-mota-600/10 hover:bg-mota-600/20 text-mota-500"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setDismissed((p) => new Set([...p, t.id]))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
