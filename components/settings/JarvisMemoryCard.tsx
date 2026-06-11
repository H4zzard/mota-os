"use client"

import { useEffect, useState, useCallback } from "react"
import { useCompany } from "@/components/providers/CompanyProvider"
import { Brain, Trash2, Loader2 } from "lucide-react"

interface Memory {
  id:         string
  content:    string
  kind:       string
  created_at: string
}

const KIND_LABEL: Record<string, string> = {
  fact:       "Fato",
  preference: "Preferência",
  process:    "Processo",
  entity:     "Entidade",
}

export function JarvisMemoryCard() {
  const { currentCompany } = useCompany()
  const companyId          = currentCompany?.slug

  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/jarvis/memory?company_id=${encodeURIComponent(companyId)}`)
      if (res.ok) {
        const data = await res.json() as { memories: Memory[] }
        setMemories(data.memories ?? [])
      } else setMemories([])
    } catch { setMemories([]) }
    setLoading(false)
  }, [companyId])

  useEffect(() => { void load() }, [load])

  async function remove(id: string) {
    if (!companyId) return
    setDeleting(id)
    const res = await fetch("/api/jarvis/memory", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, company_id: companyId }),
    })
    if (res.ok) setMemories(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}>

      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)" }}>
            <Brain size={16} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Memória do Jarvis</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Aprendizados acumulados {currentCompany ? `— ${currentCompany.name}` : ""}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2 py-1 rounded-full"
          style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
          {memories.length}
        </span>
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          O Jarvis destila aprendizados desta empresa a cada conversa e os reutiliza automaticamente.
          Revise e remova o que estiver incorreto.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Carregando...</span>
          </div>
        ) : memories.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
            Nenhuma memória ainda. Ela cresce conforme você conversa com o Jarvis.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {memories.map(m => (
              <div key={m.id}
                className="flex items-start gap-2 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 mt-0.5"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                  {KIND_LABEL[m.kind] ?? m.kind}
                </span>
                <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {m.content}
                </p>
                <button onClick={() => void remove(m.id)} disabled={deleting === m.id}
                  className="shrink-0 p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-40"
                  title="Apagar memória">
                  {deleting === m.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
