"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  delta: string
  deltaPositive: boolean
  sublabel: string
  color: string
  bg: string
  icon: React.ElementType
  index?: number
}

export function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  sublabel,
  color,
  bg,
  icon: Icon,
  index = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-xl p-4 border cursor-default"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: bg }}
      >
        <Icon size={17} style={{ color }} />
      </div>

      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>

      <p
        className="text-xs mt-0.5 leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>

      <div className="flex items-center gap-1 mt-2">
        {deltaPositive ? (
          <TrendingUp size={11} className="text-mota-500 shrink-0" />
        ) : (
          <TrendingDown size={11} className="text-red-400 shrink-0" />
        )}
        <span
          className={cn(
            "text-[11px] font-medium",
            deltaPositive ? "text-mota-500" : "text-red-400"
          )}
        >
          {delta}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {sublabel}
        </span>
      </div>
    </motion.div>
  )
}
