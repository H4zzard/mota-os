import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { getAllowedCompanyIds, isGlobalAdmin } from "@/lib/company-scope"
import { extractMemories, saveMemories } from "@/lib/jarvis-memory"

export const dynamic = "force-dynamic"

// Chamado pelo front ao fim de cada resposta. Destila memórias duráveis da
// troca e as salva no escopo da empresa. Fire-and-forget — não bloqueia o chat.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    company_id?:        string
    session_id?:        string | null
    user_message?:      string
    assistant_message?: string
  }

  const companyId = body.company_id
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const [isAdmin, allowed] = await Promise.all([
    isGlobalAdmin(user.id),
    getAllowedCompanyIds(user.id),
  ])
  if (!isAdmin && !(allowed as string[]).includes(companyId)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 })
  }

  const exchange: { role: "user" | "assistant"; content: string }[] = []
  if (body.user_message?.trim())      exchange.push({ role: "user", content: body.user_message })
  if (body.assistant_message?.trim()) exchange.push({ role: "assistant", content: body.assistant_message })
  if (exchange.length === 0) return NextResponse.json({ ok: true, saved: 0 })

  try {
    const memories = await extractMemories(exchange)
    const saved = await saveMemories(companyId, memories, {
      sessionId: body.session_id ?? null,
      userId:    user.id,
    })
    return NextResponse.json({ ok: true, saved })
  } catch (err) {
    console.error("[jarvis/memory/extract]", err)
    return NextResponse.json({ ok: false, saved: 0 })
  }
}
