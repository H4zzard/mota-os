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

// ─── Rich text extractor ──────────────────────────────────────────────────────

type RichTextItem = { plain_text?: string }

export function extractRichText(richText: unknown): string {
  if (!Array.isArray(richText)) return ""
  return (richText as RichTextItem[]).map(t => t.plain_text ?? "").join("")
}

// ─── Property extractor (para linhas de database) ─────────────────────────────

type PropValue = {
  type?: string
  title?:        unknown[]
  rich_text?:    unknown[]
  select?:       { name: string } | null
  multi_select?: { name: string }[]
  url?:          string | null
  email?:        string | null
  phone_number?: string | null
  number?:       number | null
  checkbox?:     boolean
  date?:         { start: string; end?: string | null } | null
  formula?:      { type: string; string?: string | null; number?: number | null; boolean?: boolean | null }
  status?:       { name: string } | null
}

function extractProperties(properties: Record<string, PropValue>): string[] {
  const rows: string[] = []
  let rowTitle = ""

  for (const [name, prop] of Object.entries(properties)) {
    switch (prop.type) {
      case "title": {
        const t = extractRichText(prop.title)
        if (t) rowTitle = t
        break
      }
      case "rich_text": {
        const t = extractRichText(prop.rich_text)
        if (t) rows.push(`${name}: ${t}`)
        break
      }
      case "select":
        if (prop.select) rows.push(`${name}: ${prop.select.name}`)
        break
      case "status":
        if (prop.status) rows.push(`${name}: ${prop.status.name}`)
        break
      case "multi_select":
        if (prop.multi_select?.length)
          rows.push(`${name}: ${prop.multi_select.map(s => s.name).join(", ")}`)
        break
      case "url":
        if (prop.url) rows.push(`${name}: ${prop.url}`)
        break
      case "email":
        if (prop.email) rows.push(`${name}: ${prop.email}`)
        break
      case "phone_number":
        if (prop.phone_number) rows.push(`${name}: ${prop.phone_number}`)
        break
      case "number":
        if (prop.number !== null && prop.number !== undefined) rows.push(`${name}: ${prop.number}`)
        break
      case "checkbox":
        rows.push(`${name}: ${prop.checkbox ? "Sim" : "Não"}`)
        break
      case "date":
        if (prop.date) {
          const range = prop.date.end
            ? `${prop.date.start} → ${prop.date.end}`
            : prop.date.start
          rows.push(`${name}: ${range}`)
        }
        break
      case "formula": {
        const f = prop.formula
        if (f?.string) rows.push(`${name}: ${f.string}`)
        else if (f?.number !== null && f?.number !== undefined) rows.push(`${name}: ${f.number}`)
        break
      }
    }
  }

  // Título sempre primeiro
  return rowTitle ? [rowTitle, ...rows] : rows
}

// ─── Block → texto (blocos simples de página) ─────────────────────────────────

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
      return cap ? `[Imagem: ${cap}]` : url ? `[Imagem: ${url}]` : ""
    }
    case "table_row": {
      const cells = (block.table_row as { cells: unknown[][] }).cells
      return cells.map(cell => extractRichText(cell)).join(" | ")
    }
    // child_page e child_database são tratados diretamente em processBlocks
    default:
      return ""
  }
}

// ─── Fetch page content ───────────────────────────────────────────────────────

export async function fetchPageContent(
  notion: Client,
  pageId: string,
): Promise<{ title: string; content: string }> {
  let title = "Sem título"

  // Determina o título: tenta como página, depois como database
  try {
    const page = await notion.pages.retrieve({ page_id: pageId })
    const props = (page as { properties?: Record<string, unknown> }).properties
    if (props) {
      const tp = Object.values(props).find(
        p => (p as { type?: string }).type === "title",
      ) as { title?: unknown } | undefined
      if (tp?.title) title = extractRichText(tp.title) || "Sem título"
    }
  } catch {
    try {
      const db = await notion.databases.retrieve({ database_id: pageId })
      title = extractRichText((db as { title?: unknown }).title) || "Sem título"
    } catch { /* usa "Sem título" */ }
  }

  const lines: string[] = []

  // Processa um database: busca todas as linhas via dataSources.query (SDK v5)
  async function processDatabase(databaseId: string, dbTitle: string, depth: number) {
    if (depth > 4) return
    lines.push(`\n## ${dbTitle}`)

    let cursor: string | undefined
    let rowCount = 0

    do {
      const res = await notion.dataSources.query({
        data_source_id: databaseId,
        start_cursor:   cursor,
        page_size:      100,
      })

      for (const row of res.results) {
        if (rowCount >= 300) break
        const p = row as { id: string; properties?: Record<string, unknown>; has_children?: boolean; object?: string }

        // Só processa linhas que são páginas (não sub-databases)
        if (p.object !== "page") { rowCount++; continue }

        if (p.properties) {
          const propLines = extractProperties(p.properties as Record<string, PropValue>)
          if (propLines.length > 0) {
            lines.push(propLines.join(" | "))
          }
        }

        // Lê blocos internos da linha se houver
        if (p.has_children && depth < 4) {
          try { await processBlocks(p.id, depth + 1) } catch { /* ignora linha sem acesso */ }
        }

        rowCount++
      }

      cursor = res.next_cursor ?? undefined
    } while (cursor && rowCount < 300)
  }

  // Processa blocos de uma página (recursivo)
  async function processBlocks(blockId: string, depth: number) {
    if (depth > 4) return
    let cursor: string | undefined

    do {
      const res = await notion.blocks.children.list({
        block_id:     blockId,
        start_cursor: cursor,
        page_size:    100,
      })

      for (const block of res.results) {
        const b = block as NotionBlock

        // Database filho: usa query() em vez de blocks.children.list()
        if (b.type === "child_database") {
          const dbTitle = (b.child_database as { title: string }).title || "Database"
          try { await processDatabase(b.id, dbTitle, depth + 1) } catch { /* sem acesso */ }
          continue
        }

        // Subpágina: adiciona título e recursiona nos blocos internos
        if (b.type === "child_page") {
          const pgTitle = (b.child_page as { title: string }).title || "Subpágina"
          lines.push(`\n### ${pgTitle}`)
          if (depth < 4) {
            try { await processBlocks(b.id, depth + 1) } catch { /* sem acesso */ }
          }
          continue
        }

        const text = blockToText(b, depth)
        if (text.trim()) lines.push(text)

        // Recursiona em blocos com filhos (toggles, callouts, etc.)
        if (b.has_children && depth < 4) {
          try { await processBlocks(b.id, depth + 1) } catch { /* ignora */ }
        }
      }

      cursor = res.next_cursor ?? undefined
    } while (cursor)
  }

  await processBlocks(pageId, 0)

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
    query:     query ?? "",
    sort:      { direction: "descending", timestamp: "last_edited_time" },
    page_size: 50,
  })

  return response.results.map(result => {
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
