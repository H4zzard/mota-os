"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Star, Wrench, AlertTriangle, Bell, RefreshCw,
  Settings2, CheckCircle2, Circle, Plus, X, Loader2,
  Shield, Building2, Tag, Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { useCompany }  from "@/components/providers/CompanyProvider"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnouncementType = 'update' | 'feature' | 'fix' | 'warning' | 'announcement' | 'maintenance'
type AnnouncementStatus = 'draft' | 'published' | 'archived'
type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent'
type Filter = 'all' | 'unread' | AnnouncementType

type Announcement = {
  id:           string
  title:        string
  content:      string
  type:         AnnouncementType
  status:       AnnouncementStatus
  version:      string | null
  company_id:   string | null
  audience:     string
  priority:     AnnouncementPriority
  published_at: string | null
  created_at:   string
  is_read:      boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_INFO: Record<AnnouncementType, { label: string; icon: React.ElementType; color: string }> = {
  update:       { label: 'Atualização', icon: RefreshCw,     color: '#3b82f6' },
  feature:      { label: 'Feature',     icon: Star,          color: '#8b5cf6' },
  fix:          { label: 'Correção',    icon: Wrench,        color: '#16a34a' },
  warning:      { label: 'Aviso',       icon: AlertTriangle, color: '#f59e0b' },
  announcement: { label: 'Comunicado', icon: Bell,          color: '#6366f1' },
  maintenance:  { label: 'Manutenção', icon: Settings2,     color: '#f97316' },
}

const PRIORITY_COLOR: Record<AnnouncementPriority, string> = {
  low:    '#94a3b8',
  normal: 'transparent',
  high:   '#f97316',
  urgent: '#ef4444',
}

const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  low:    'Baixa',
  normal: 'Normal',
  high:   'Alta',
  urgent: 'Urgente',
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',          label: 'Todas'       },
  { id: 'unread',       label: 'Não lidas'   },
  { id: 'feature',      label: 'Features'    },
  { id: 'update',       label: 'Atualizações'},
  { id: 'fix',          label: 'Correções'   },
  { id: 'warning',      label: 'Avisos'      },
  { id: 'announcement', label: 'Comunicados' },
  { id: 'maintenance',  label: 'Manutenção'  },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function AnnouncementModal({
  initial, onClose, onSave,
}: {
  initial?:  Partial<Announcement>
  onClose:   () => void
  onSave:    (data: Record<string, unknown>) => Promise<void>
}) {
  const { allowedCompanies } = useCompany()
  const [title,       setTitle]    = useState(initial?.title       ?? '')
  const [content,     setContent]  = useState(initial?.content     ?? '')
  const [type,        setType]     = useState<AnnouncementType>(initial?.type        ?? 'update')
  const [status,      setStatus]   = useState<AnnouncementStatus>(initial?.status    ?? 'published')
  const [version,     setVersion]  = useState(initial?.version     ?? '')
  const [companyId,   setCompany]  = useState(initial?.company_id  ?? '')
  const [priority,    setPriority] = useState<AnnouncementPriority>(initial?.priority ?? 'normal')
  const [saving,      setSaving]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await onSave({
      title: title.trim(), content: content.trim(),
      type, status, priority,
      version:    version.trim() || null,
      company_id: companyId || null,
    })
    setSaving(false)
  }

  const inputCls   = "w-full text-sm px-3 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-mota-500/40 transition-all"
  const inputStyle = { background: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-primary)" }
  const isEdit     = !!initial?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {isEdit ? 'Editar novidade' : 'Nova novidade'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors" style={{ color: "var(--text-muted)" }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Novos filtros em Projetos" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Conteúdo *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={5}
              placeholder="Descreva a novidade em detalhes..." className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as AnnouncementType)} className={inputCls} style={inputStyle}>
                {Object.entries(TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AnnouncementStatus)} className={inputCls} style={inputStyle}>
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Versão (opcional)</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="Ex: v1.3" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Prioridade</label>
              <select value={priority} onChange={e => setPriority(e.target.value as AnnouncementPriority)} className={inputCls} style={inputStyle}>
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Empresa (vazio = global)</label>
            <select value={companyId} onChange={e => setCompany(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Global — todos</option>
              {allowedCompanies.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 text-sm py-2.5 rounded-xl border transition-colors hover:bg-[var(--bg-hover)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Cancelar</button>
            <button type="submit" disabled={saving || !title.trim() || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-mota-600 hover:bg-mota-700 text-white transition-colors disabled:opacity-50">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Publicar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  ann, isAdmin, onRead, onUnread, onEdit, onDelete,
}: {
  ann:      Announcement
  isAdmin:  boolean
  onRead:   (id: string) => void
  onUnread: (id: string) => void
  onEdit:   (a: Announcement) => void
  onDelete: (id: string) => void
}) {
  const typeInfo    = TYPE_INFO[ann.type] ?? TYPE_INFO.announcement
  const Icon        = typeInfo.icon
  const priorityColor = PRIORITY_COLOR[ann.priority]
  const showPriority  = ann.priority !== 'normal'

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn("rounded-2xl border p-5 transition-colors", !ann.is_read && "ring-1 ring-mota-500/20")}
      style={{ background: "var(--bg-card)", borderColor: ann.is_read ? "var(--border-color)" : "rgba(139,92,246,0.15)" }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${typeInfo.color}15` }}>
          <Icon size={18} style={{ color: typeInfo.color }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
              {typeInfo.label}
            </span>
            {showPriority && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: `${priorityColor}15`, color: priorityColor }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: priorityColor }} />
                {PRIORITY_LABEL[ann.priority]}
              </span>
            )}
            {ann.version && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                <Tag size={9} /> {ann.version}
              </span>
            )}
            {ann.company_id && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                <Building2 size={9} /> {ann.company_id}
              </span>
            )}
            {ann.status === 'draft' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                Rascunho
              </span>
            )}
            {!ann.is_read && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
                Novo
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{ann.title}</h3>

          {/* Content */}
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>{ann.content}</p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-2" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Calendar size={11} />
              <span className="text-[11px]">{fmtDate(ann.published_at ?? ann.created_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button onClick={() => onEdit(ann)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                    Editar
                  </button>
                  <button onClick={() => onDelete(ann.id)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                    style={{ color: "var(--text-muted)" }}>
                    Remover
                  </button>
                </>
              )}
              {ann.is_read ? (
                <button onClick={() => onUnread(ann.id)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-muted)" }}>
                  <CheckCircle2 size={12} className="text-mota-500" /> Lida
                </button>
              ) : (
                <button onClick={() => onRead(ann.id)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-mota-600 hover:bg-mota-700 text-white transition-colors">
                  <Circle size={12} /> Marcar como lida
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChangelogClient({ isAdmin }: { isAdmin: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filter,        setFilter]        = useState<Filter>('all')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [editTarget,    setEditTarget]    = useState<Announcement | null>(null)

  const load = useCallback(async (activeFilter: Filter = filter) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeFilter === 'unread') params.set('unread_only', 'true')
      else if (activeFilter !== 'all') params.set('type', activeFilter)
      // Admin não envia status param — a API retorna draft+published+archived por padrão

      const res  = await fetch(`/api/announcements?${params}`)
      const data = await res.json() as Announcement[]
      if (!res.ok) throw new Error((data as unknown as { error: string }).error)
      setAnnouncements(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar novidades')
    } finally {
      setLoading(false)
    }
  }, [filter, isAdmin])

  useEffect(() => { load(filter) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAsRead(id: string) {
    const res = await fetch(`/api/announcements/${id}/read`, { method: 'POST' })
    if (res.ok) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
      window.dispatchEvent(new CustomEvent('announcements-read'))
    }
  }

  async function markAsUnread(id: string) {
    const res = await fetch(`/api/announcements/${id}/read`, { method: 'DELETE' })
    if (res.ok) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: false } : a))
      window.dispatchEvent(new CustomEvent('announcements-read'))
    }
  }

  async function saveAnnouncement(data: Record<string, unknown>) {
    const isEdit = !!editTarget?.id
    const url    = isEdit ? `/api/announcements/${editTarget!.id}` : '/api/announcements'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    const body = await res.json() as Announcement & { error?: string }
    if (!res.ok) { alert(body.error ?? 'Erro ao salvar'); return }

    if (isEdit) {
      setAnnouncements(prev => prev.map(a => a.id === body.id ? { ...body, is_read: a.is_read } : a))
    } else {
      setAnnouncements(prev => [{ ...body, is_read: false }, ...prev])
    }
    setShowModal(false)
    setEditTarget(null)
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Remover esta novidade?')) return
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const unreadCount = announcements.filter(a => !a.is_read && a.status === 'published').length

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Novidades"
          subtitle={unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
          actions={isAdmin ? (
            <button onClick={() => { setEditTarget(null); setShowModal(true) }}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-mota-600 hover:bg-mota-700 text-white transition-colors">
              <Plus size={13} /> Nova novidade
            </button>
          ) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium",
                    filter === f.id ? "bg-mota-600 text-white border-mota-600" : "hover:bg-[var(--bg-hover)]")}
                  style={filter === f.id ? undefined : { borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  {f.label}
                  {f.id === 'unread' && unreadCount > 0 && (
                    <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20">{unreadCount}</span>
                  )}
                </button>
              ))}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <Shield size={11} /> Admin
                </div>
              )}
            </div>

            {/* Content */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle size={28} style={{ color: "#f59e0b" }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
                <button onClick={() => load(filter)} className="text-xs px-4 py-2 rounded-xl bg-mota-600 text-white hover:bg-mota-700">
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !error && announcements.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-3">
                <Sparkles size={32} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {filter === 'unread' ? 'Nenhuma novidade não lida' : 'Nenhuma novidade encontrada'}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {filter === 'unread' ? 'Você está em dia com todas as novidades.' : 'Volte em breve para ver atualizações.'}
                </p>
              </motion.div>
            )}

            {!loading && !error && announcements.length > 0 && (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {announcements.map(ann => (
                    <AnnouncementCard
                      key={ann.id}
                      ann={ann}
                      isAdmin={isAdmin}
                      onRead={markAsRead}
                      onUnread={markAsUnread}
                      onEdit={a => { setEditTarget(a); setShowModal(true) }}
                      onDelete={deleteAnnouncement}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}

          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AnnouncementModal
            key="modal"
            initial={editTarget ?? undefined}
            onClose={() => { setShowModal(false); setEditTarget(null) }}
            onSave={saveAnnouncement}
          />
        )}
      </AnimatePresence>
    </>
  )
}
