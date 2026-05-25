"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"
type CompanyUsageItem = { name: string; value: number; color: string }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: CompanyUsageItem }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border shadow-xl px-4 py-3 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</p>
      </div>
      <p style={{ color: "var(--text-secondary)" }}>
        <span className="font-medium" style={{ color: d.payload.color }}>{d.value}%</span> do uso total
      </p>
    </div>
  )
}

export function CompanyDonutChart({ data }: { data: CompanyUsageItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <TrendingUp size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma sessão nos últimos 30 dias</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 space-y-2.5">
        {data.map((c) => (
          <div key={c.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{c.name}</span>
              </div>
              <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                {c.value}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${c.value}%`, backgroundColor: c.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
