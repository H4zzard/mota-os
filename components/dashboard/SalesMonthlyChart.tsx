"use client"

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { useThemeContext } from "@/components/layout/ThemeProvider"
import { BarChart2 } from "lucide-react"

type MonthPoint = { month: string; gross: number; net: number; count: number; avg_ticket: number }

function fmtBrl(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

function CustomTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: { dataKey: string; name: string; value: number; color: string }[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  const count = (payload[0] as { payload?: MonthPoint })?.payload?.count ?? 0
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
            {p.dataKey === "avg_ticket" ? fmtBrl(p.value) : fmtBrl(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Converte "2026-04" → "Abr/26"
function fmtMonth(m: string): string {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const parts  = m.split("-")
  const idx    = parseInt(parts[1] ?? "0") - 1
  return `${months[idx] ?? m}/${(parts[2] ?? parts[0] ?? "").slice(-2) || (parts[0] ?? "").slice(-2)}`
}

// Converte "2026-04" → "Abr/26" usando apenas year e month
function fmtMonthLabel(m: string): string {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const [year, month] = m.split("-")
  const idx = parseInt(month ?? "0") - 1
  return `${months[idx] ?? m}/${(year ?? "").slice(2)}`
}

export function SalesMonthlyChart({ data }: { data: MonthPoint[] }) {
  const { theme } = useThemeContext()
  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  const isEmpty = data.length === 0 || data.every(d => d.gross === 0)

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <BarChart2 size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nenhum dado mensal no período
        </p>
      </div>
    )
  }

  const formatted = data.map(d => ({ ...d, label: fmtMonthLabel(d.month) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 16, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="amount"
          tickFormatter={v => fmtBrl(v)}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <YAxis
          yAxisId="ticket"
          orientation="right"
          tickFormatter={v => fmtBrl(v)}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 10, color: axisColor, paddingTop: 8 }}
          iconSize={8}
        />
        <Bar
          yAxisId="amount"
          dataKey="gross"
          name="Receita bruta"
          fill="#16a34a"
          fillOpacity={0.8}
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          yAxisId="amount"
          dataKey="net"
          name="Receita líquida"
          fill="#06b6d4"
          fillOpacity={0.7}
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
        <Line
          yAxisId="ticket"
          type="monotone"
          dataKey="avg_ticket"
          name="Ticket médio"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de ticket médio por dia ─────────────────────────────────────────

type DayTicketPoint = { day: string; avg_ticket: number; count: number }

export function SalesTicketChart({ data }: { data: DayTicketPoint[] }) {
  const { theme } = useThemeContext()
  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  const isEmpty = data.length === 0 || data.every(d => d.avg_ticket === 0)

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <BarChart2 size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nenhuma venda no período
        </p>
      </div>
    )
  }

  const formatDay = (d: string) => {
    const parts = d.split("-")
    if (parts.length < 3) return d
    return `${parts[2]}/${parts[1]}`
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
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
          tickFormatter={v => fmtBrl(v)}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const count = (payload[0] as { payload?: DayTicketPoint })?.payload?.count ?? 0
            return (
              <div className="rounded-xl border shadow-xl px-3 py-2 text-xs"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {String(label)} — {count} {count === 1 ? "venda" : "vendas"}
                </p>
                <p style={{ color: "#8b5cf6" }}>
                  Ticket médio: <strong>{fmtBrl(Number(payload[0]?.value ?? 0))}</strong>
                </p>
              </div>
            )
          }}
        />
        <Bar
          dataKey="avg_ticket"
          name="Ticket médio"
          fill="#8b5cf6"
          fillOpacity={0.8}
          radius={[3, 3, 0, 0]}
          maxBarSize={24}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
