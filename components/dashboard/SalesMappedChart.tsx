"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useThemeContext } from "@/components/layout/ThemeProvider"

type MappedData = {
  mapped_count:   number
  unmapped_count: number
  mapped_gross:   number
  unmapped_gross: number
}

function fmtBrl(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

export function SalesMappedChart({ data }: { data: MappedData }) {
  const { theme } = useThemeContext()
  const isEmpty = data.mapped_count === 0 && data.unmapped_count === 0

  const countData = [
    { name: "Mapeadas",      value: data.mapped_count,   fill: "#16a34a" },
    { name: "Não mapeadas",  value: data.unmapped_count, fill: "#f59e0b" },
  ].filter(d => d.value > 0)

  const grossData = [
    { name: "Mapeadas",      value: data.mapped_gross,   fill: "#16a34a" },
    { name: "Não mapeadas",  value: data.unmapped_gross, fill: "#f59e0b" },
  ].filter(d => d.value > 0)

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nenhuma venda no período
        </p>
      </div>
    )
  }

  const tooltipStyle = {
    background:   "var(--bg-card)",
    border:       "1px solid var(--border-color)",
    borderRadius: "12px",
    padding:      "10px 14px",
    fontSize:     "11px",
    color:        "var(--text-primary)",
  }

  const legendColor = theme === "dark" ? "#94a3b8" : "#64748b"

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Contagem */}
      <div>
        <p className="text-[10px] text-center mb-1" style={{ color: "var(--text-muted)" }}>
          Por quantidade
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={countData}
              dataKey="value"
              innerRadius={40}
              outerRadius={62}
              paddingAngle={3}
            >
              {countData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value} vendas`, ""]}
              contentStyle={tooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, color: legendColor }}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Valor */}
      <div>
        <p className="text-[10px] text-center mb-1" style={{ color: "var(--text-muted)" }}>
          Por receita bruta
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={grossData}
              dataKey="value"
              innerRadius={40}
              outerRadius={62}
              paddingAngle={3}
            >
              {grossData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [fmtBrl(Number(value)), ""]}
              contentStyle={tooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, color: legendColor }}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
