/**
 * Google Analytics 4 (Data API) connector — Jarvis
 * Credenciais em .env.local:
 *   GA4_PROPERTY_ID=xxxxxxxxx          (numérico, sem "properties/")
 *   GOOGLE_SERVICE_ACCOUNT_JSON='{...}'  (JSON da service account)
 * Usar apenas em Server Components, Route Handlers ou Server Actions.
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data"

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GA4Config {
  propertyId:          string
  serviceAccountJson?: string
}

function getConfig(): GA4Config {
  return {
    propertyId:         process.env.GA4_PROPERTY_ID            ?? "",
    serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type GA4DateRange = { startDate: string; endDate: string }

export interface GA4ReportRequest {
  dateRanges: GA4DateRange[]
  dimensions: string[]
  metrics:    string[]
  limit?:     number
  orderBys?:  { fieldName: string; descending?: boolean }[]
}

export interface GA4Row {
  dimensions: string[]
  metrics:    string[]
}

export interface GA4ReportResponse {
  rows:             GA4Row[]
  rowCount:         number
  dimensionHeaders: string[]
  metricHeaders:    string[]
}

export interface GA4RealtimeMetrics {
  activeUsers:     number
  screenPageViews: number
  topPages:        { pagePath: string; activeUsers: number }[]
}

export interface GA4ConversionSummary {
  dateRange:          GA4DateRange
  totalSessions:      number
  totalConversions:   number
  conversionRate:     number
  topConversionPaths: { source: string; conversions: number }[]
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class GA4Client {
  constructor(private config: GA4Config) {}

  private get propertyPath() {
    return `properties/${this.config.propertyId}`
  }

  private getClient(): BetaAnalyticsDataClient {
    const credentials = this.config.serviceAccountJson
      ? JSON.parse(this.config.serviceAccountJson)
      : undefined
    return new BetaAnalyticsDataClient({ credentials })
  }

  async runReport(request: GA4ReportRequest): Promise<GA4ReportResponse> {
    const client     = this.getClient()
    const [response] = await client.runReport({
      property:   this.propertyPath,
      dateRanges: request.dateRanges,
      dimensions: request.dimensions.map((name) => ({ name })),
      metrics:    request.metrics.map((name) => ({ name })),
      limit:      request.limit,
      orderBys:   request.orderBys?.map((o) => ({
        dimension: { dimensionName: o.fieldName },
        desc:      o.descending ?? false,
      })),
    })

    return {
      rows:             (response.rows ?? []).map((r) => ({
        dimensions: r.dimensionValues?.map((d) => d.value ?? "") ?? [],
        metrics:    r.metricValues?.map((m) => m.value ?? "")    ?? [],
      })),
      rowCount:         response.rowCount ?? 0,
      dimensionHeaders: response.dimensionHeaders?.map((h) => h.name ?? "") ?? [],
      metricHeaders:    response.metricHeaders?.map((h) => h.name ?? "")    ?? [],
    }
  }

  async getRealtimeMetrics(): Promise<GA4RealtimeMetrics> {
    const client     = this.getClient()
    const [response] = await client.runRealtimeReport({
      property:   this.propertyPath,
      dimensions: [{ name: "pagePath" }],
      metrics:    [{ name: "activeUsers" }, { name: "screenPageViews" }],
    })

    const totalActive = response.rows?.reduce(
      (sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0), 0
    ) ?? 0
    const totalViews = response.rows?.reduce(
      (sum, r) => sum + Number(r.metricValues?.[1]?.value ?? 0), 0
    ) ?? 0

    const topPages = (response.rows ?? [])
      .map((r) => ({
        pagePath:    r.dimensionValues?.[0]?.value ?? "",
        activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      }))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10)

    return { activeUsers: totalActive, screenPageViews: totalViews, topPages }
  }

  async getConversionSummary(dateRange: GA4DateRange): Promise<GA4ConversionSummary> {
    const report = await this.runReport({
      dateRanges: [dateRange],
      dimensions: ["sessionDefaultChannelGroup"],
      metrics:    ["sessions", "conversions"],
      orderBys:   [{ fieldName: "conversions", descending: true }],
    })

    const totalSessions    = report.rows.reduce((s, r) => s + Number(r.metrics[0]), 0)
    const totalConversions = report.rows.reduce((s, r) => s + Number(r.metrics[1]), 0)

    return {
      dateRange,
      totalSessions,
      totalConversions,
      conversionRate:     totalSessions > 0 ? totalConversions / totalSessions : 0,
      topConversionPaths: report.rows.map((r) => ({
        source:      r.dimensions[0],
        conversions: Number(r.metrics[1]),
      })),
    }
  }

  async getSessionsByDay(days = 30): Promise<{ date: string; sessions: number }[]> {
    const report = await this.runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: ["date"],
      metrics:    ["sessions"],
      orderBys:   [{ fieldName: "date" }],
    })
    return report.rows.map((r) => ({
      date:     r.dimensions[0],
      sessions: Number(r.metrics[0]),
    }))
  }
}

export function createGA4Client(config = getConfig()): GA4Client {
  return new GA4Client(config)
}
