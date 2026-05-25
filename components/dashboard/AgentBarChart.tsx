"use client"

import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { Bot } from "lucide-react"
import { useThemeContext } from "@/components/layout/ThemeProvider"

type AgentUsageItem = { name: string; fullName: string; uses: number; color: string }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; color: string; payload: AgentUsageItem }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border shadow-xl px-4 py-3 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{d.payload.fullName}</p>
      <p style={{ color: "var(--text-secondary)" }}>
        <span className="font-medium" style={{ color: d.color }}>{d.value}</span> execuções
      </p>
    </div>
  )
}

export function AgentBarChart({ data }: { data: AgentUsageItem[] }) {
  const { theme } = useThemeContext()
  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Bot size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma sessão nos últimos 30 dias</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
        <Bar dataKey="uses" radius={[0, 6, 6, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
