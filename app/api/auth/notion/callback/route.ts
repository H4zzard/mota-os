import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { logActivity }       from "@/lib/activity-logger"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const origin     = process.env.APP_URL ?? new URL(req.url).origin
  const settingsUrl = new URL("/settings", origin)

  const savedState = req.cookies.get("notion_oauth_state")?.value
  const companyId  = req.cookies.get("notion_oauth_company")?.value

  function redirectWithError(msg: string) {
    settingsUrl.searchParams.set("notion_error", msg)
    const res = NextResponse.redirect(settingsUrl)
    res.cookies.delete("notion_oauth_state")
    res.cookies.delete("notion_oauth_company")
    return res
  }

  if (error)                                         return redirectWithError(error)
  if (!savedState || state !== savedState)           return redirectWithError("invalid_state")
  if (!companyId || !code)                           return redirectWithError("missing_params")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", origin))

  const clientId     = process.env.NOTION_CLIENT_ID!
  const clientSecret = process.env.NOTION_CLIENT_SECRET!
  const redirectUri  = `${origin}/api/auth/notion/callback`

  try {
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        grant_type:   "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error("[notion-callback] token exchange failed:", text)
      return redirectWithError("token_exchange_failed")
    }

    const token = await tokenRes.json() as {
      access_token:   string
      bot_id:         string
      workspace_id:   string
      workspace_name: string
      workspace_icon: string | null
    }

    const admin = createAdminClient()
    await admin.from("notion_integrations").upsert(
      {
        company_id:     companyId,
        access_token:   token.access_token,
        bot_id:         token.bot_id,
        workspace_id:   token.workspace_id,
        workspace_name: token.workspace_name,
        workspace_icon: token.workspace_icon ?? null,
        connected_by:   user.id,
        connected_at:   new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      },
      { onConflict: "company_id" },
    )

    void logActivity({
      userId:    user.id,
      eventType: "settings",
      action:    "notion_connected",
      detail:    token.workspace_name,
      companyId,
    })

    settingsUrl.searchParams.set("notion_connected", "1")
  } catch (err) {
    console.error("[notion-callback] error:", err)
    return redirectWithError("server_error")
  }

  const res = NextResponse.redirect(settingsUrl)
  res.cookies.delete("notion_oauth_state")
  res.cookies.delete("notion_oauth_company")
  return res
}
