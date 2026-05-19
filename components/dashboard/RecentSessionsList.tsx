"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { motion } from "framer-motion"
import { AgentTag } from "@/components/ui/StatusBadge"
import type { RecentSessionItem } from "@/app/(app)/dashboard/page"

export function RecentSessionsList({ sessions }: { sessions: RecentSessionItem[] }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <MessageSquare size={24} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma sessão ainda</p>
      </div>
    )
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
      {sessions.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
        >
          <Link href="/chat">
            <div className="flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer hover:bg-[var(--bg-hover)] group">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(22,163,74,0.1)" }}
              >
                <MessageSquare size={13} className="text-mota-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm truncate group-hover:text-mota-500 transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.agentName && <AgentTag name={s.agentName} color={s.agentColor ?? undefined} />}
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {s.companyName}
                  </span>
                </div>
              </div>

              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                {s.timeAgo}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
