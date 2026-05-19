"use client"

import { useState } from "react"
import { ChevronDown, Check, Building2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useCompany } from "@/components/providers/CompanyProvider"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  showCompanySelector?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showCompanySelector = true,
}: PageHeaderProps) {
  const { currentCompany, allowedCompanies, loading, setCurrentCompany } = useCompany()
  const [open,    setOpen]    = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  async function handleSelect(slug: string) {
    if (slug === currentCompany?.slug) { setOpen(false); return }
    setSwitching(true)
    setSwitchError(null)
    const ok = await setCurrentCompany(slug)
    setSwitching(false)
    if (ok) {
      setOpen(false)
    } else {
      setSwitchError("Sem acesso a esta empresa.")
    }
  }

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b shrink-0 relative z-20"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-sidebar)" }}
    >
      <div>
        <h1 className="text-sm font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        {showCompanySelector && (
          <div className="relative">
            <button
              onClick={() => { setSwitchError(null); setOpen((v) => !v) }}
              disabled={loading || switching}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                "hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-not-allowed",
                open && "border-mota-600/40 bg-[var(--bg-hover)]"
              )}
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: currentCompany?.color ?? "#6b7280" }}
              />
              <span>
                {loading ? "Carregando..." : switching ? "Trocando..." : (currentCompany?.name ?? "Empresa")}
              </span>
              <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={12} />
              </motion.div>
            </button>

            <AnimatePresence>
              {open && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-xl z-20 overflow-hidden"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <div
                      className="px-3 py-2 border-b flex items-center gap-2"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <Building2 size={12} className="text-mota-500" />
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        Selecionar empresa
                      </span>
                    </div>

                    <div className="p-1">
                      {allowedCompanies.length === 0 ? (
                        <p className="px-3 py-3 text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                          Você não está vinculado a nenhuma empresa.
                        </p>
                      ) : (
                        allowedCompanies.map((c) => (
                          <button
                            key={c.slug}
                            onClick={() => void handleSelect(c.slug)}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left",
                              "hover:bg-[var(--bg-hover)]",
                              currentCompany?.slug === c.slug && "bg-[var(--bg-active)]"
                            )}
                            style={{ color: "var(--text-primary)" }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              {c.name}
                            </div>
                            {currentCompany?.slug === c.slug && (
                              <Check size={12} className="text-mota-500 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {switchError && (
                      <div className="px-3 py-2 border-t text-[11px] text-red-400"
                        style={{ borderColor: "var(--border-color)" }}>
                        {switchError}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
