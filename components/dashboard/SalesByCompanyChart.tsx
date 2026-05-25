"use client"

import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { useThemeContext } from "@/components/layout/ThemeProvider"

type CompanyBar = { company_id: string; gross: number; net: number; count: number }

const COMPANY_COLORS: Record<string, string> = {
  cppem:   "#16a34a",
  unicive: "#3b82f6",
  colegio: "#f59e0b",
  everton: "#8b5cf6",
  grupo:   "#06b6d4",
}
const COMPANY_LABELS: Record<string, string> = {
  cppem:   "CPPEM",
  unicive: "Unicive",
  colegio: "Colégio",
  everton: "Everton",
  grupo:   "Grupo",
}

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function CustomTooltip({ active, payload }: {
  active?:  boolean
  payload?: { name: string; value: number; payload: CompanyBar }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border shadow-xl px-4 py-3 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        {COMPANY_LABELS[d.company_id] ?? d.company_id}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-secondary)" }}>Bruto:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmtBrl(d.gross)}</span>
        </div>
        {d.net > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: "var(--text-secondary)" }}>Líquido:</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmtBrl(d.net)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-secondary)" }}>Vendas:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{d.count}</span>
        </div>
      </div>
    </div>
  )
}

export function SalesByCompanyChart({ data }: { data: CompanyBar[] }) {
  const { theme } = useThemeContext()
  const axisColor = theme === "dark" ? "#475569" : "#94a3b8"
  const gridColor = theme === "dark" ? "#1e293b" : "#f1f5f9"

  if (!data.length) return (
    <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
      Sem dados por empresa no período
    </p>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="company_id"
          tickFormatter={id => COMPANY_LABELS[id] ?? id}
          tick={{ fontSize: 11, fill: axisColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="gross" name="Receita bruta" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.company_id} fill={COMPANY_COLORS[d.company_id] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
