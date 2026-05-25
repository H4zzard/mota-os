"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
type WorkflowErrorItem = { id: string; name: string; errorMessage: string; timeAgo: string }

export function AlertsList({ errors }: { errors: WorkflowErrorItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = errors.filter((e) => !dismissed.has(e.id))

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <CheckCircle2 size={24} className="text-mota-500" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {errors.length === 0 ? "Nenhum erro recente" : "Todos os erros dispensados"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {visible.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border p-3 border-orange-500/25 bg-orange-500/6"
          >
            <div className="flex gap-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-orange-300">{e.name}</p>
                <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {e.errorMessage}
                </p>
                <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  {e.timeAgo}
                </p>
              </div>
              <button
                onClick={() => setDismissed((p) => new Set([...p, e.id]))}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-white/10"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={11} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
