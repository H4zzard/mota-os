import { cn } from "@/lib/utils"

type Status = "active" | "inactive" | "done" | "completed" | "paused" | "error" | "pending" | "archived" | "planning"
type Priority = "high" | "medium" | "low"

const statusConfig: Record<Status, { label: string; className: string }> = {
  active:    { label: "Ativo",        className: "bg-mota-500/10 text-mota-500 border-mota-500/20" },
  inactive:  { label: "Inativo",      className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  done:      { label: "Concluído",    className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  completed: { label: "Concluído",    className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  paused:    { label: "Pausado",      className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  error:     { label: "Erro",         className: "bg-red-500/10 text-red-400 border-red-500/20" },
  pending:   { label: "Pendente",     className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  archived:  { label: "Arquivado",    className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  planning:  { label: "Planejamento", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high:   { label: "Alta",   className: "bg-red-500/10 text-red-400 border-red-500/20" },
  medium: { label: "Média",  className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  low:    { label: "Baixa",  className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export function AgentTag({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: color ? `${color}18` : "rgba(22,163,74,0.1)",
        color: color ?? "#16a34a",
      }}
    >
      {name}
    </span>
  )
}
