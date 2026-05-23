/**
 * Meta Ads (Facebook Graph API) connector — Jarvis
 *
 * HOW TO ACTIVATE:
 *   1. No package needed — uses the Graph API REST endpoint directly.
 *   2. Add to .env.local:
 *        META_ACCESS_TOKEN=EAAxxxxxxx          (long-lived system user token)
 *        META_AD_ACCOUNT_ID=act_xxxxxxxxxx
 *        META_APP_ID=xxxxxxxxxx
 *        META_APP_SECRET=xxxxxxxxxx
 *   3. Uncomment the real implementation blocks and delete the stubs.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export interface MetaAdsConfig {
  /** env: META_ACCESS_TOKEN */
  accessToken:   string
  /** env: META_AD_ACCOUNT_ID — format: act_xxxxxxxxxx */
  adAccountId:   string
  apiVersion:    string
}

function getConfig(): MetaAdsConfig {
  return {
    accessToken: process.env.META_ACCESS_TOKEN    ?? "",
    adAccountId: process.env.META_AD_ACCOUNT_ID   ?? "",
    apiVersion:  "v20.0",
  }
}

const BASE_URL = "https://graph.facebook.com"

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetaCampaignStatus    = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED"
export type MetaObjective         = "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_AWARENESS" | "OUTCOME_TRAFFIC"
export type MetaInsightDatePreset = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "this_month"

export interface MetaCampaign {
  id:         string
  name:       string
  status:     MetaCampaignStatus
  objective:  MetaObjective
  created_time: string
  start_time?: string
  stop_time?:  string
  daily_budget?: string
  lifetime_budget?: string
}

export interface MetaAdSet {
  id:              string
  campaign_id:     string
  name:            string
  status:          MetaCampaignStatus
  daily_budget?:   string
  lifetime_budget?: string
  targeting:       Record<string, unknown>
}

export interface MetaInsight {
  campaign_id?:   string
  adset_id?:      string
  ad_id?:         string
  impressions:    string
  reach:          string
  clicks:         string
  spend:          string
  cpc:            string
  cpm:            string
  ctr:            string
  date_start:     string
  date_stop:      string
  actions?:       { action_type: string; value: string }[]
  cost_per_action_type?: { action_type: string; value: string }[]
}

export interface MetaCPLSummary {
  totalSpend:  number
  totalLeads:  number
  cpl:         number
  cpc:         number
  ctr:         number
  impressions: number
  clicks:      number
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class MetaAdsClient {
  constructor(private config: MetaAdsConfig) {}

  private url(path: string) {
    return `${BASE_URL}/${this.config.apiVersion}/${path}`
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams({ access_token: this.config.accessToken, ...params })
    // TODO:
    // const res = await fetch(`${this.url(path)}?${qs}`)
    // if (!res.ok) throw new Error(`Meta API error ${res.status}: ${await res.text()}`)
    // return res.json()
    throw new Error("[meta-ads] — TODO: uncomment fetch implementation")
  }

  async getCampaigns(status?: MetaCampaignStatus): Promise<MetaCampaign[]> {
    // TODO:
    // const fields = "id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget"
    // const params: Record<string, string> = { fields }
    // if (status) params.effective_status = JSON.stringify([status])
    // const res = await this.get<{ data: MetaCampaign[] }>(`${this.config.adAccountId}/campaigns`, params)
    // return res.data
    throw new Error("[meta-ads] getCampaigns() — TODO")
  }

  async getAdSets(campaignId?: string): Promise<MetaAdSet[]> {
    // TODO:
    // const path   = campaignId ? `${campaignId}/adsets` : `${this.config.adAccountId}/adsets`
    // const fields = "id,campaign_id,name,status,daily_budget,lifetime_budget,targeting"
    // const res    = await this.get<{ data: MetaAdSet[] }>(path, { fields })
    // return res.data
    throw new Error("[meta-ads] getAdSets() — TODO")
  }

  async getInsights(params: {
    level:        "account" | "campaign" | "adset" | "ad"
    datePreset?:  MetaInsightDatePreset
    since?:       string   // YYYY-MM-DD
    until?:       string
    campaignIds?: string[]
  }): Promise<MetaInsight[]> {
    // TODO:
    // const fields  = "impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type"
    // const qp: Record<string, string> = { fields, level: params.level }
    // if (params.datePreset)  qp.date_preset = params.datePreset
    // if (params.since)       qp.time_range  = JSON.stringify({ since: params.since, until: params.until })
    // if (params.campaignIds) qp.filtering   = JSON.stringify([{ field: "campaign.id", operator: "IN", value: params.campaignIds }])
    // const res = await this.get<{ data: MetaInsight[] }>(`${this.config.adAccountId}/insights`, qp)
    // return res.data
    throw new Error("[meta-ads] getInsights() — TODO")
  }

  /** Convenience: calculate CPL across all campaigns for a date range. */
  async getCPLSummary(datePreset: MetaInsightDatePreset = "last_7d"): Promise<MetaCPLSummary> {
    // TODO:
    // const insights = await this.getInsights({ level: "account", datePreset })
    // const row = insights[0]
    // const leads = row.actions?.find(a => a.action_type === "lead")?.value ?? "0"
    // return { totalSpend: +row.spend, totalLeads: +leads, cpl: +row.spend / +leads, ... }
    throw new Error("[meta-ads] getCPLSummary() — TODO")
  }
}

export function createMetaAdsClient(config = getConfig()): MetaAdsClient {
  return new MetaAdsClient(config)
}
