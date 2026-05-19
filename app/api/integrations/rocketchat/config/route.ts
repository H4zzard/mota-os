import { NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Retorna apenas campos não-sensíveis do Rocket.Chat para o cliente
// NUNCA expõe url, user_id ou auth_token

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: row } = await admin
    .from('api_connections')
    .select('config, status')
    .eq('provider', 'rocketchat')
    .maybeSingle()

  if (!row) {
    return NextResponse.json({
      configured:      false,
      mode:            'rest',
      default_channel: null,
      bot_username:    null,
      alias:           null,
      status:          'not_configured',
    })
  }

  const config = (row.config ?? {}) as Record<string, string>
  const mode = config.mode ?? 'rest'

  const configured = mode === 'webhook'
    ? !!config.webhook_url
    : !!(config.url && config.user_id && config.auth_token)

  return NextResponse.json({
    configured,
    mode,
    default_channel: config.default_channel ?? null,
    bot_username:    config.bot_username    ?? null,
    alias:           config.alias           ?? null,
    status:          row.status,
  })
}
