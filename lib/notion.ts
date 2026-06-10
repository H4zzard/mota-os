import { Client } from "@notionhq/client"
import { createAdminClient } from "@/lib/supabase-admin"

// ─── Config check ─────────────────────────────────────────────────────────────

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET)
}

// ─── Token storage ────────────────────────────────────────────────────────────

export async function getNotionToken(companyId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("notion_integrations")
    .select("access_token")
    .eq("company_id", companyId)
    .single()
  return data?.access_token ?? null
}

export async function getNotionIntegration(companyId: string): Promise<{
  access_token: string
  workspace_name: string | null
  workspace_icon: string | null
  workspace_id: string | null
  connected_at: string | null
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("notion_integrations")
    .select("access_token, workspace_name, workspace_icon, workspace_id, connected_at")
    .eq("company_id", companyId)
    .single()
  return data ?? null
}

// ─── Client factory ───────────────────────────────────────────────────────────

export async function getNotionClientForCompany(companyId: string): Promise<Client | null> {
  const token = await getNotionToken(companyId)
  if (!token) return null
  return new Client({ auth: token })
}

// ─── Block → texto ────────────────────────────────────────────────────────────

type RichTextItem = { plain_text?: string }

function extractRichText(richText: unknown): string {
  if (!Array.isArray(richText)) return ""
  return (richText as RichTextItem[]).map(t => t.plain_text ?? "").join("")
}

type NotionBlock = { type: string; id: string; has_children?: boolean; [key: string]: unknown }

function blockToText(block: NotionBlock, depth = 0): string {
  const indent = "  ".repeat(depth)
  type Prop = { rich_text: unknown }

  switch (block.type) {
    case "paragraph":
      return extractRichText((block.paragraph as Prop).rich_text)
    case "heading_1":
      return `# ${extractRichText((block.heading_1 as Prop).rich_text)}`
    case "heading_2":
      return `## ${extractRichText((block.heading_2 as Prop).rich_text)}`
    case "heading_3":
      return `### ${extractRichText((block.heading_3 as Prop).rich_text)}`
    case "bulleted_list_item":
      return `${indent}- ${extractRichText((block.bulleted_list_item as Prop).rich_text)}`
    case "numbered_list_item":
      return `${indent}1. ${extractRichText((block.numbered_list_item as Prop).rich_text)}`
    case "to_do": {
      const b = block.to_do as Prop & { checked: boolean }
      return `${indent}${b.checked ? "[x]" : "[ ]"} ${extractRichText(b.rich_text)}`
    }
    case "toggle":
      return `${indent}▶ ${extractRichText((block.toggle as Prop).rich_text)}`
    case "quote":
      return `> ${extractRichText((block.quote as Prop).rich_text)}`
    case "callout": {
      const b = block.callout as Prop & { icon?: { emoji?: string } }
      const emoji = b.icon?.emoji ? `${b.icon.emoji} ` : ""
      return `${emoji}${extractRichText(b.rich_text)}`
    }
    case "code": {
      const b = block.code as Prop & { language?: string }
      return `\`\`\`${b.language ?? ""}\n${extractRichText(b.rich_text)}\n\`\`\``
    }
    case "divider":
      return "---"
    case "image": {
      const b = block.image as { type: string; external?: { url: string }; file?: { url: string }; caption?: unknown }
      const url = b.type === "external" ? b.external?.url : b.file?.url
      const cap = b.caption ? extractRichText(b.caption) : ""
      return `![${cap}](${url ?? ""})`
    }
    case "child_page":
      return `📄 [Subpágina: ${(block.child_page as { title: string }).title}]`
    case "child_database":
      return `🗄️ [Database: ${(block.child_database as { title: string }).title}]`
    case "table_row": {
      const cells = (block.table_row as { cells: unknown[][] }).cells
      return cells.map(cell => extractRichText(cell)).join(" | ")
    }
    default:
      return ""
  }
}

// ─── Fetch page content ───────────────────────────────────────────────────────

export async function fetchPageContent(
  notion: Client,
  pageId: string,
): Promise<{ title: string; content: string }> {
  const page = await notion.pages.retrieve({ page_id: pageId })
  const props = (page as { properties?: Record<string, unknown> }).properties

  let title = "Sem título"
  if (props) {
    const titleProp = Object.values(props).find(
      p => (p as { type?: string }).type === "title",
    ) as { title?: unknown } | undefined
    if (titleProp?.title) title = extractRichText(titleProp.title) || "Sem título"
  }

  const lines: string[] = []

  async function processBlocks(blockId: string, depth = 0) {
    let cursor: string | undefined
    do {
      const res = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      })
      for (const block of res.results) {
        const b = block as NotionBlock
        const text = blockToText(b, depth)
        if (text.trim()) lines.push(text)
        if (b.has_children && depth < 3) await processBlocks(b.id, depth + 1)
      }
      cursor = res.next_cursor ?? undefined
    } while (cursor)
  }

  await processBlocks(pageId)

  return { title, content: lines.join("\n") }
}

// ─── Search pages ─────────────────────────────────────────────────────────────

export interface NotionPage {
  id:               string
  title:            string
  type:             "page" | "database"
  url:              string
  icon:             string | null
  last_edited_time: string
}

export async function searchPages(notion: Client, query?: string): Promise<NotionPage[]> {
  const response = await notion.search({
    query:  query ?? "",
    sort:   { direction: "descending", timestamp: "last_edited_time" },
    page_size: 50,
  })

  return response.results
    .map(result => {
      const r = result as {
        id: string
        object: string
        url: string
        icon?: { type: string; emoji?: string; external?: { url: string } } | null
        last_edited_time: string
        properties?: Record<string, unknown>
        title?:  unknown[]
      }

      let title = "Sem título"
      if (r.object === "page" && r.properties) {
        const tp = Object.values(r.properties).find(
          p => (p as { type?: string }).type === "title",
        ) as { title?: unknown } | undefined
        if (tp?.title) title = extractRichText(tp.title) || "Sem título"
      } else if (r.title) {
        title = extractRichText(r.title) || "Sem título"
      }

      let icon: string | null = null
      if (r.icon?.type === "emoji")    icon = r.icon.emoji    ?? null
      if (r.icon?.type === "external") icon = r.icon.external?.url ?? null

      return {
        id:               r.id,
        title,
        type:             r.object as "page" | "database",
        url:              r.url,
        icon,
        last_edited_time: r.last_edited_time,
      }
    })
}
