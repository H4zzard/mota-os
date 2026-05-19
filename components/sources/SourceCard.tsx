"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Wifi, WifiOff, RefreshCw, Eye, PlugZap,
  BookOpen, GraduationCap, School, User, BarChart3,
  Image, FileText, HelpCircle, Globe, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Source } from "@/lib/mocks/sources"

const iconMap: Record<string, React.ElementType> = {
  BookOpen, GraduationCap, School, User, BarChart3,
  Image, FileText, HelpCircle, Globe, TrendingUp,
}

interface SourceCardProps {
  source: Source
  index: number
}

export function SourceCard({ source: s, index }: SourceCardProps) {
  const [connected, setConnected] = useState(s.connected)
  const [syncing, setSyncing] = useState(false)

  const Icon = iconMap[s.icon] ?? FileText

  function handleSync() {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className="rounded-2xl border flex flex-col overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${s.companyColor}15` }}
          >
            <Icon size={18} style={{ color: s.companyColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                {s.name}
              </p>
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                  connected
                    ? "bg-mota-500/10 text-mota-500"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {connected ? <Wifi size={9} /> : <WifiOff size={9} />}
                {connected ? "Conectado" : "Desconectado"}
              </div>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {s.company} · {s.type}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {s.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Arquivos",      value: s.fileCount > 0 ? s.fileCount.toLocaleString() : "—" },
            { label: "Tamanho",       value: s.sizeLabel },
            { label: "Sincronizado",  value: s.lastSync },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-2 text-center"
              style={{ background: "var(--bg-input)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {stat.value}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {s.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={() => setConnected((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex-1 justify-center",
            connected
              ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
              : "bg-mota-600 hover:bg-mota-700 text-white border-transparent"
          )}
        >
          <PlugZap size={12} />
          {connected ? "Desconectar" : "Conectar"}
        </button>

        <button
          onClick={handleSync}
          disabled={!connected}
          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          title="Sincronizar"
        >
          <RefreshCw size={13} className={cn(syncing && "animate-spin")} />
        </button>

        <button
          disabled={!connected}
          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          title="Visualizar"
        >
          <Eye size={13} />
        </button>
      </div>
    </motion.div>
  )
}
