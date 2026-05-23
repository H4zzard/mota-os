/**
 * Reportei connector — Jarvis
 *
 * HOW TO ACTIVATE:
 *   1. No package needed — Reportei exposes a REST API.
 *   2. Add to .env.local:
 *        REPORTEI_API_KEY=rpt_xxxxxxxxxx
 *        REPORTEI_WORKSPACE_ID=xxxxxxxxxx   (optional — for multi-workspace accounts)
 *   3. Uncomment the real implementation blocks and delete the stubs.
 *
 * Docs: https://reportei.com/docs/api   (check for latest endpoint versions)
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ReporteiConfig {
  /** env: REPORTEI_API_KEY */
  apiKey:       string
  workspaceId?: string
  baseUrl:      string
}

function getConfig(): ReporteiConfig {
  return {
    apiKey:       process.env.REPORTEI_API_KEY        ?? "",
    workspaceId:  process.env.REPORTEI_WORKSPACE_ID,
    baseUrl:      "https://api.reportei.com/v1",
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReporteiChannel =
  | "facebook_ads"
  | "google_ads"
  | "google_analytics"
  | "instagram"
  | "linkedin_ads"
  | "tiktok_ads"

export interface ReporteiReport {
  id:         string
  title:      string
  channels:   ReporteiChannel[]
  dateFrom:   string
  dateTo:     string
  status:     "processing" | "ready" | "error"
  createdAt:  string
  url?:       string   // public share link once ready
}

export interface ReporteiMetricRow {
  channel:    ReporteiChannel
  metric:     string
  value:      number
  unit:       string
  dateFrom:   string
  dateTo:     string
}

export interface ReporteiCreateParams {
  title:      string
  channels:   ReporteiChannel[]
  dateFrom:   string            // YYYY-MM-DD
  dateTo:     string
  clients?:   string[]
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class ReporteiClient {
  constructor(private config: ReporteiConfig) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  async listReports(): Promise<ReporteiReport[]> {
    // TODO:
    // const res = await fetch(`${this.config.baseUrl}/reports`, { headers: this.headers() })
    // if (!res.ok) throw new Error(`Reportei ${res.status}: ${await res.text()}`)
    // return (await res.json()).data
    throw new Error("[reportei] listReports() — TODO: uncomment fetch implementation")
  }

  async getReport(reportId: string): Promise<ReporteiReport> {
    // TODO:
    // const res = await fetch(`${this.config.baseUrl}/reports/${reportId}`, { headers: this.headers() })
    // if (!res.ok) throw new Error(`Reportei ${res.status}: ${await res.text()}`)
    // return res.json()
    throw new Error("[reportei] getReport() — TODO")
  }

  async createReport(params: ReporteiCreateParams): Promise<ReporteiReport> {
    // TODO:
    // const res = await fetch(`${this.config.baseUrl}/reports`, {
    //   method:  "POST",
    //   headers: this.headers(),
    //   body:    JSON.stringify(params),
    // })
    // if (!res.ok) throw new Error(`Reportei ${res.status}: ${await res.text()}`)
    // return res.json()
    throw new Error("[reportei] createReport() — TODO")
  }

  async getMetrics(params: {
    channel:  ReporteiChannel
    dateFrom: string
    dateTo:   string
    metrics?: string[]
  }): Promise<ReporteiMetricRow[]> {
    // TODO:
    // const qs  = new URLSearchParams({ channel: params.channel, date_from: params.dateFrom, date_to: params.dateTo })
    // if (params.metrics) qs.set("metrics", params.metrics.join(","))
    // const res = await fetch(`${this.config.baseUrl}/metrics?${qs}`, { headers: this.headers() })
    // if (!res.ok) throw new Error(`Reportei ${res.status}: ${await res.text()}`)
    // return (await res.json()).data
    throw new Error("[reportei] getMetrics() — TODO")
  }

  /** Poll until report status is "ready" (max attempts × interval). */
  async waitForReport(reportId: string, maxAttempts = 20, intervalMs = 3_000): Promise<ReporteiReport> {
    // TODO:
    // for (let i = 0; i < maxAttempts; i++) {
    //   const report = await this.getReport(reportId)
    //   if (report.status === "ready")  return report
    //   if (report.status === "error")  throw new Error(`Reportei report ${reportId} failed`)
    //   await new Promise(r => setTimeout(r, intervalMs))
    // }
    // throw new Error(`Reportei report ${reportId} timed out`)
    throw new Error("[reportei] waitForReport() — TODO")
  }
}

export function createReporteiClient(config = getConfig()): ReporteiClient {
  return new ReporteiClient(config)
}
