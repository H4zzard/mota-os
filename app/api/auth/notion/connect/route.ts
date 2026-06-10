import { NextRequest, NextResponse } from "next/server"
import { createClient }   from "@/lib/supabase-server"
import { isGlobalAdmin }  from "@/lib/company-scope"
import crypto from "node:crypto"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))

  const isAdmin = await isGlobalAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const clientId = process.env.NOTION_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: "NOTION_CLIENT_ID não configurado" }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("company_id")
  if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const state = crypto.randomBytes(16).toString("hex")
  const origin = process.env.APP_URL ?? new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/notion/callback`

  const authUrl = new URL("https://api.notion.com/v1/oauth/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("owner", "user")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authUrl.toString())
  const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" }
  response.cookies.set("notion_oauth_state",   state,     cookieOpts)
  response.cookies.set("notion_oauth_company", companyId, cookieOpts)
  return response
}
