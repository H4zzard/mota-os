import Link from "next/link"
import { GitBranch, ArrowUpRight } from "lucide-react"
type WorkflowRunItem = { name: string; slug: string; runs: number }

export function WorkflowActivity({ data }: { data: WorkflowRunItem[] }) {
  return (
    <div className="space-y-2">
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <GitBranch size={24} style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhum workflow executado ainda</p>
        </div>
      ) : (
        data.map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(139,92,246,0.1)" }}
            >
              <GitBranch size={13} style={{ color: "#8b5cf6" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {w.name}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {w.runs}x executado
              </p>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}
            >
              ativo
            </span>
          </div>
        ))
      )}

      <Link href="/workflows">
        <div
          className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border border-dashed transition-colors hover:border-mota-600/40 hover:text-mota-500 cursor-pointer"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <ArrowUpRight size={13} />
          Ver todos os workflows
        </div>
      </Link>
    </div>
  )
}
