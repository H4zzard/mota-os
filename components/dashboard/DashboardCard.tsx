import { cn } from "@/lib/utils"

interface DashboardCardProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconColor?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = "#16a34a",
  action,
  children,
  className,
  noPadding,
}: DashboardCardProps) {
  return (
    <div
      className={cn("rounded-xl border overflow-hidden flex flex-col", className)}
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={15} style={{ color: iconColor }} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 ml-2">{action}</div>}
      </div>
      <div className={cn("flex-1", !noPadding && "p-5")}>{children}</div>
    </div>
  )
}
