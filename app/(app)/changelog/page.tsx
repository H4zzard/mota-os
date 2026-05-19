import { createClient }   from '@/lib/supabase-server'
import { isGlobalAdmin }  from '@/lib/company-scope'
import { ChangelogClient } from './ChangelogClient'

export default async function ChangelogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = user ? await isGlobalAdmin(user.id) : false
  return <ChangelogClient isAdmin={admin} />
}
