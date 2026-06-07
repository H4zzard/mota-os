"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentWithConfig } from "@/hooks/useAgents"

interface AgentSelectorProps {
  selected:  AgentWithConfig
  onChange:  (agent: AgentWithConfig) => void
  agents?:   AgentWithConfig[]
}

export function AgentSelector({ selected, onChange, agents = [] }: AgentSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border",
          open && "border-mota-600/40"
        )}
        style={{
          background: open ? `${selected.color}12` : "var(--bg-input)",
          borderColor: open ? `${selected.color}40` : "var(--border-color)",
          color: "var(--text-secondary)",
        }}
      >
        <selected.icon size={12} style={{ color: selected.color }} />
        <span className="max-w-24 truncate" style={{ color: selected.color }}>
          {selected.shortName}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={11} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-2xl z-40 overflow-hidden"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                className="px-3 py-2.5 border-b"
                style={{ borderColor: "var(--border-color)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Selecionar agente
                </p>
              </div>

              <div className="p-1.5 max-h-80 overflow-y-auto">
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { onChange(a); setOpen(false) }}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group",
                      "hover:bg-[var(--bg-hover)]",
                      selected.id === a.id && "bg-[var(--bg-active)]"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: a.bg }}
                    >
                      <a.icon size={15} style={{ color: a.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {a.name}
                        </p>
                        {selected.id === a.id && (
                          <Check size={12} className="text-mota-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        {a.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {a.capabilities.slice(0, 3).map((cap: string) => (
                          <span
                            key={cap}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: `${a.color}15`,
                              color: a.color,
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
