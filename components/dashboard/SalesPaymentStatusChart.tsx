"use client"

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

type StatusSlice = { status: string; count: number; gross: number }

const STATUS_COLORS: Record<string, string> = {
  paid:       "#16a34a",
  pago:       "#16a34a",
  approved:   "#16a34a",
  aprovado:   "#16a34a",
  pending:    "#f59e0b",
  pendente:   "#f59e0b",
  waiting:    "#f59e0b",
  canceled:   "#ef4444",
  cancelado:  "#ef4444",
  refunded:   "#8b5cf6",
  chargeback: "#dc2626",
  unknown:    "#94a3b8",
}
const STATUS_LABEL: Record<string, string> = {
  paid:       "Pago",
  pago:       "Pago",
  approved:   "Aprovado",
  aprovado:   "Aprovado",
  pending:    "Pendente",
  pendente:   "Pendente",
  waiting:    "Aguardando",
  canceled:   "Cancelado",
  cancelado:  "Cancelado",
  refunded:   "Reembolsado",
  chargeback: "Chargeback",
  unknown:    "Outro",
}

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function CustomTooltip({ active, payload }: {
  active?:  boolean
  payload?: { name: string; value: number; payload: StatusSlice }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border shadow-xl px-3 py-2 text-xs"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {STATUS_LABEL[d.status] ?? d.status}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>{d.count} vendas</p>
      <p style={{ color: "var(--text-secondary)" }}>{fmtBrl(d.gross)}</p>
    </div>
  )
}

export function SalesPaymentStatusChart({ data }: { data: StatusSlice[] }) {
  if (!data.length) return (
    <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
      Sem dados de status no período
    </p>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="gross"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={72}
          innerRadius={40}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => STATUS_LABEL[value] ?? value}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
