"use client"

import { motion } from "framer-motion"
import { Settings, ArrowRight, Clock, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Agent } from "@/lib/mocks/agents"

interface AgentCardProps {
  agent: Agent
  index: number
  onConfigure: (a: Agent) => void
}

export function AgentCard({ agent: a, index, onConfigure }: AgentCardProps) {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="rounded-2xl border flex flex-col overflow-hidden group"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {/* Top color accent */}
      <div
        className="h-24 flex items-center justify-center shrink-0 relative overflow-hidden"
        style={{ background: a.bg }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${a.color}, transparent 60%)`,
          }}
        />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 relative z-10"
          style={{
            background: `${a.color}20`,
            borderColor: `${a.color}40`,
          }}
        >
          <a.icon size={26} style={{ color: a.color }} />
        </div>

        {/* Status pill */}
        <div
          className={cn(
            "absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
            a.status === "active"
              ? "bg-mota-500/20 text-mota-400"
              : "bg-yellow-500/20 text-yellow-400"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              a.status === "active" ? "bg-mota-500 animate-pulse" : "bg-yellow-500"
            )}
          />
          {a.status === "active" ? "Ativo" : "Pausado"}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Name & description */}
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {a.name}
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {a.longDescription}
          </p>
        </div>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1">
          {a.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
              style={{
                background: `${a.color}10`,
                color: a.color,
                borderColor: `${a.color}25`,
              }}
            >
              {cap}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-1">
            <Zap size={11} />
            <span>{a.runs} execuções</span>
          </div>
          <div className="w-px h-3" style={{ background: "var(--border-color)" }} />
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>há {a.lastRun}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-5 py-4 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={() => router.push("/chat")}
          className="flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-xl bg-mota-600 hover:bg-mota-700 text-white transition-all"
          style={{ style: { backgroundColor: a.color } } as any}
        >
          <span>Usar agente</span>
          <ArrowRight size={13} />
        </button>
        <button
          onClick={() => onConfigure(a)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors hover:bg-[var(--bg-hover)]"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          title="Configurar agente"
        >
          <Settings size={14} />
        </button>
      </div>
    </motion.div>
  )
}
