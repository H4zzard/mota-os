"use client"

import { useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Activity } from "lucide-react"
import { useThemeContext } from "@/components/layout/ThemeProvider"
import type { WeeklyPoint } from "@/app/(app)/dashboard/page"

const series = [
  { key: "sessions",  label: "Sessões",   color: "#16a34a" },
  { key: "workflows", label: "Workflows", color: "#8b5cf6" },
  { key: "tasks",     label: "Tarefas",   color: "#f97316" },
]

type SeriesKey = "sessions" | "workflows" | "tasks"

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border shadow-xl px-4 py-3 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function WeeklyActivityChart({ data }: { data: WeeklyPoint[] }) {
  const { theme } = useThemeContext()
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  const isEmpty = data.every(d => d.sessions === 0 && d.workflows === 0 && d.tasks === 0)

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Activity size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma atividade nos últimos 7 dias</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        {series.map((s) => (
          <button
            key={s.key}
            onClick={() => setHidden(prev => {
              const next = new Set(prev)
              next.has(s.key as SeriesKey) ? next.delete(s.key as SeriesKey) : next.add(s.key as SeriesKey)
              return next
            })}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ color: "var(--text-secondary)", opacity: hidden.has(s.key as SeriesKey) ? 0.35 : 1 }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={s.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              hide={hidden.has(s.key as SeriesKey)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
