import { motion } from "framer-motion"
import { Zap } from "lucide-react"

export function TypingIndicator({ agentName, agentColor }: { agentName: string; agentColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-start"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border"
        style={{
          background: `${agentColor}18`,
          borderColor: `${agentColor}30`,
        }}
      >
        <Zap size={13} style={{ color: agentColor }} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold" style={{ color: agentColor }}>
          {agentName}
        </span>
        <div
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-mota-500"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
