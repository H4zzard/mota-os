import { NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAllowedCompanyIds, isGlobalAdmin } from '@/lib/company-scope'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 })

    const isAdmin = await isGlobalAdmin(user.id)
    const allowed = isAdmin ? null : await getAllowedCompanyIds(user.id)
    const admin   = createAdminClient()

    // Novidades publicadas visíveis ao usuário
    let q = admin
      .from('announcements')
      .select('id')
      .eq('status', 'published')
      .is('deleted_at', null)

    if (!isAdmin) {
      if (allowed && allowed.length > 0) {
        q = q.or(`company_id.is.null,company_id.in.(${allowed.join(',')})`)
      } else {
        q = q.is('company_id', null)
      }
    }

    const { data: visible } = await q
    const visibleIds = new Set((visible ?? []).map(r => r.id as string))

    if (visibleIds.size === 0) return NextResponse.json({ count: 0 })

    // IDs que o usuário já leu
    const { data: readRows } = await admin
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)

    const readSet = new Set((readRows ?? []).map(r => r.announcement_id as string))

    // Contar não lidas
    let count = 0
    for (const id of visibleIds) {
      if (!readSet.has(id)) count++
    }

    return NextResponse.json({ count })
  } catch {
    // Nunca quebrar a sidebar
    return NextResponse.json({ count: 0 })
  }
}
