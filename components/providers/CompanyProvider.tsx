"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

export interface CompanyInfo {
  slug:        string
  name:        string
  color:       string
  initials:    string
  description: string | null
  active:      boolean
}

interface CompanyContextValue {
  currentCompany:    CompanyInfo | null
  allowedCompanies:  CompanyInfo[]
  loading:           boolean
  error:             string | null
  userRole:          string | null
  isAdmin:           boolean
  setCurrentCompany: (slug: string) => Promise<boolean>
  refresh:           () => void
}

const CompanyContext = createContext<CompanyContextValue>({
  currentCompany:    null,
  allowedCompanies:  [],
  loading:           true,
  error:             null,
  userRole:          null,
  isAdmin:           false,
  setCurrentCompany: async () => false,
  refresh:           () => {},
})

export function useCompany() {
  return useContext(CompanyContext)
}

const MAX_RETRIES    = 3
const RETRY_DELAY_MS = 1500

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany,   setCurrentCompanyState] = useState<CompanyInfo | null>(null)
  const [allowedCompanies, setAllowedCompanies]    = useState<CompanyInfo[]>([])
  const [userRole,         setUserRole]            = useState<string | null>(null)
  const [loading,          setLoading]             = useState(true)
  const [error,            setError]               = useState<string | null>(null)

  // Controla a versão da fetch para cancelar fetches obsoletos em StrictMode / re-mounts
  const fetchVersion = useRef(0)

  const fetchData = useCallback((attempt = 0) => {
    const version = ++fetchVersion.current
    setLoading(true)
    if (attempt === 0) setError(null)

    fetch("/api/current-company")
      .then(async r => {
        if (!r.ok) {
          // 401 = sessão expirou — não fazer retry, limpar estado
          if (r.status === 401) {
            if (version !== fetchVersion.current) return
            setCurrentCompanyState(null)
            setAllowedCompanies([])
            setUserRole(null)
            setError(null)  // não é erro de UI — usuário simplesmente não está logado
            return
          }
          throw new Error(`Falha ao carregar empresa (HTTP ${r.status})`)
        }
        return r.json() as Promise<{ company: CompanyInfo | null; allowed: CompanyInfo[]; role: string }>
      })
      .then(data => {
        if (!data || version !== fetchVersion.current) return
        setCurrentCompanyState(data.company)
        setAllowedCompanies(data.allowed ?? [])
        setUserRole(data.role ?? "viewer")
        setError(null)
      })
      .catch((err: Error) => {
        if (version !== fetchVersion.current) return
        console.error("[CompanyProvider] fetch error:", err.message)

        // Retry com backoff simples
        if (attempt < MAX_RETRIES) {
          setTimeout(() => fetchData(attempt + 1), RETRY_DELAY_MS * (attempt + 1))
        } else {
          // Esgotou as tentativas — exposição controlada do erro
          setError("Não foi possível carregar as permissões. Recarregue a página.")
        }
      })
      .finally(() => {
        if (version === fetchVersion.current) setLoading(false)
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const setCurrentCompany = useCallback(async (slug: string): Promise<boolean> => {
    const prev  = currentCompany
    const found = allowedCompanies.find(c => c.slug === slug)
    if (found) setCurrentCompanyState(found)

    const res = await fetch("/api/current-company", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ company_id: slug }),
    })
    if (!res.ok) {
      setCurrentCompanyState(prev)
      return false
    }
    return true
  }, [allowedCompanies, currentCompany])

  return (
    <CompanyContext.Provider value={{
      currentCompany,
      allowedCompanies,
      loading,
      error,
      userRole,
      isAdmin: userRole === "admin",
      setCurrentCompany,
      refresh: () => fetchData(0),
    }}>
      {children}
    </CompanyContext.Provider>
  )
}
