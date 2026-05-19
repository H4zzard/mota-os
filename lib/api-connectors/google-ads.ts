/**
 * Google Ads connector — Mota OS
 * Credenciais em .env.local:
 *   GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxx
 *   GOOGLE_ADS_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
 *   GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
 *   GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxx
 *   GOOGLE_ADS_CUSTOMER_ID=xxxxxxxxxx    (sem traços)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID=xxxxxxxxxx  (MCC, se aplicável)
 * Usar apenas em Server Components, Route Handlers ou Server Actions.
 */

import { GoogleAdsApi } from "google-ads-api"

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GoogleAdsConfig {
  developerToken:   string
  clientId:         string
  clientSecret:     string
  refreshToken:     string
  customerId:       string
  loginCustomerId?: string
}

function getConfig(): GoogleAdsConfig {
  return {
    developerToken:   process.env.GOOGLE_ADS_DEVELOPER_TOKEN   ?? "",
    clientId:         process.env.GOOGLE_ADS_CLIENT_ID         ?? "",
    clientSecret:     process.env.GOOGLE_ADS_CLIENT_SECRET     ?? "",
    refreshToken:     process.env.GOOGLE_ADS_REFRESH_TOKEN     ?? "",
    customerId:       process.env.GOOGLE_ADS_CUSTOMER_ID       ?? "",
    loginCustomerId:  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type GAdsStatus = "ENABLED" | "PAUSED" | "REMOVED"

export interface GAdsDateRange {
  since: string  // YYYY-MM-DD
  until: string
}

export interface GAdsCampaign {
  id:                     string
  name:                   string
  status:                 GAdsStatus
  advertisingChannelType: string
  biddingStrategyType:    string
}

export interface GAdsCampaignMetrics {
  campaignId:   string
  campaignName: string
  impressions:  number
  clicks:       number
  costMicros:   number
  conversions:  number
  ctr:          number
  avgCpc:       number
  cpa:          number
}

export interface GAdsSearchTermRow {
  searchTerm:  string
  impressions: number
  clicks:      number
  costMicros:  number
  conversions: number
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class GoogleAdsClient {
  constructor(private config: GoogleAdsConfig) {}

  private getCustomer() {
    const api = new GoogleAdsApi({
      client_id:        this.config.clientId,
      client_secret:    this.config.clientSecret,
      developer_token:  this.config.developerToken,
    })
    return api.Customer({
      customer_id:       this.config.customerId,
      refresh_token:     this.config.refreshToken,
      login_customer_id: this.config.loginCustomerId,
    })
  }

  async getCampaigns(status?: GAdsStatus): Promise<GAdsCampaign[]> {
    const customer = this.getCustomer()
    const whereClause = status ? `WHERE campaign.status = '${status}'` : ""
    const rows = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type
      FROM campaign
      ${whereClause}
    `)
    return (rows as unknown as Record<string, unknown>[]).map((r) => {
      const c = r.campaign as Record<string, unknown>
      return {
        id:                     String(c.id ?? ""),
        name:                   String(c.name ?? ""),
        status:                 String(c.status ?? "") as GAdsStatus,
        advertisingChannelType: String(c.advertising_channel_type ?? ""),
        biddingStrategyType:    String(c.bidding_strategy_type ?? ""),
      }
    })
  }

  async getCampaignMetrics(dateRange: GAdsDateRange, campaignIds?: string[]): Promise<GAdsCampaignMetrics[]> {
    const customer  = this.getCustomer()
    const whereId   = campaignIds?.length ? `AND campaign.id IN (${campaignIds.join(",")})` : ""
    const rows      = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        AND campaign.status != 'REMOVED'
        ${whereId}
    `)
    return (rows as unknown as Record<string, unknown>[]).map((r) => {
      const c = r.campaign as Record<string, unknown>
      const m = r.metrics  as Record<string, unknown>
      return {
        campaignId:   String(c.id ?? ""),
        campaignName: String(c.name ?? ""),
        impressions:  Number(m.impressions ?? 0),
        clicks:       Number(m.clicks ?? 0),
        costMicros:   Number(m.cost_micros ?? 0),
        conversions:  Number(m.conversions ?? 0),
        ctr:          Number(m.ctr ?? 0),
        avgCpc:       Number(m.average_cpc ?? 0),
        cpa:          Number(m.cost_per_conversion ?? 0),
      }
    })
  }

  async getSearchTerms(dateRange: GAdsDateRange, limit = 50): Promise<GAdsSearchTermRow[]> {
    const customer = this.getCustomer()
    const rows     = await customer.query(`
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
      ORDER BY metrics.clicks DESC
      LIMIT ${limit}
    `)
    return (rows as unknown as Record<string, unknown>[]).map((r) => {
      const s = r.search_term_view as Record<string, unknown>
      const m = r.metrics          as Record<string, unknown>
      return {
        searchTerm:  String(s.search_term ?? ""),
        impressions: Number(m.impressions ?? 0),
        clicks:      Number(m.clicks ?? 0),
        costMicros:  Number(m.cost_micros ?? 0),
        conversions: Number(m.conversions ?? 0),
      }
    })
  }
}

export function createGoogleAdsClient(config = getConfig()): GoogleAdsClient {
  return new GoogleAdsClient(config)
}
