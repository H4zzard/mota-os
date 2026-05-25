"use client"

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { useThemeContext } from "@/components/layout/ThemeProvider"
import { TrendingUp }     from "lucide-react"

type DayPoint = { day: string; gross: number; net: number; count: number }

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function CustomTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: { dataKey: string; name: string; value: number; color: string }[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  const count = (payload[0] as { payload?: DayPoint })?.payload?.count ?? 0
  return (
    <div className="rounded-xl border shadow-xl px-4 py-3 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        {label} — {count} {count === 1 ? "venda" : "vendas"}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {fmtBrl(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SalesRevenueChart({ data }: { data: DayPoint[] }) {
  const { theme } = useThemeContext()
  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  const isEmpty = data.length === 0 || data.every(d => d.gross === 0)

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <TrendingUp size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nenhuma venda no período
        </p>
      </div>
    )
  }

  // Formatar eixo X: mostrar só dia/mês
  const formatDay = (d: string) => {
    const parts = d.split("-")
    if (parts.length < 3) return d
    return `${parts[2]}/${parts[1]}`
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-gross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#16a34a" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="grad-net" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={formatDay}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="gross"
          name="Receita bruta"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#grad-gross)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="net"
          name="Receita líquida"
          stroke="#06b6d4"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          fill="url(#grad-net)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
