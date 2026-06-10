// Extração de texto de arquivos para memória/fontes (txt, md, csv, json, html, pdf).
// Serverless-friendly: unpdf (pdf.js) para PDF, html-to-text para HTML.

export const SUPPORTED_EXTENSIONS = [".md", ".txt", ".csv", ".json", ".html", ".htm", ".pdf"] as const

export interface ExtractResult {
  text:    string | null
  warning: string | null
}

/** Deriva a extensão (com ponto, minúscula) a partir do nome do arquivo. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot !== -1 ? fileName.slice(dot).toLowerCase() : ""
}

/** Converte HTML em texto legível, preservando títulos, listas e links. */
export async function htmlToPlainText(html: string): Promise<string> {
  const { convert } = await import("html-to-text")
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: false } },
      { selector: "table", format: "dataTable" },
    ],
  })
}

/** Extrai texto de um PDF usando unpdf (sem binários nativos). */
export async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join("\n") : text
}

/**
 * Extrai texto de um File com base na extensão.
 * @param maxChars limite de caracteres (trunca se exceder)
 */
export async function extractFileText(
  file: File,
  extension: string,
  maxChars = 200_000,
): Promise<ExtractResult> {
  let text: string | null = null

  try {
    switch (extension) {
      case ".pdf": {
        const buffer = await file.arrayBuffer()
        text = await pdfToText(buffer)
        if (!text?.trim()) {
          return { text: null, warning: "PDF sem texto extraível (pode ser um PDF escaneado/imagem)." }
        }
        break
      }
      case ".html":
      case ".htm": {
        const raw = await file.text()
        text = await htmlToPlainText(raw)
        break
      }
      case ".json": {
        const raw = await file.text()
        try { text = JSON.stringify(JSON.parse(raw), null, 2) }
        catch { text = raw }
        break
      }
      case ".md":
      case ".txt":
      case ".csv": {
        text = await file.text()
        break
      }
      default:
        return { text: null, warning: `Tipo de arquivo não suportado: ${extension}` }
    }
  } catch (err) {
    return { text: null, warning: `Falha ao extrair texto: ${err instanceof Error ? err.message : "erro desconhecido"}` }
  }

  if (text && text.length > maxChars) {
    text = text.slice(0, maxChars)
    return { text, warning: `Conteúdo truncado em ${maxChars.toLocaleString()} caracteres.` }
  }

  return { text, warning: null }
}
