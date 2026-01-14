
export interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  campaign_id: string;
  revenue_generated: number;
  status: 'ACTIVE' | 'CHURNED' | 'LEAD' | string;
}

export type PlanType = 'FREE' | 'PRO';

export interface Subscription {
  plan: PlanType;
  status: 'active' | 'past_due' | 'canceled';
  next_billing_date?: string;
}

export type AssetType = 'EBOOK' | 'BANNER' | 'VIDEO' | 'WHITEPAPER' | 'AD_COPY' | 'LANDING_PAGE';
export type CostType = 'ONE_OFF' | 'MONTHLY_RECURRING';

export interface SmartMapConfig {
  selector?: string;
  path?: string;
  isActive: boolean;
}

export interface MarketingAsset {
  id: string;
  name: string;
  type: AssetType;
  cost_amount: number;
  cost_type: CostType;
  hubspot_id?: string;
  created_at: string;
  smart_map?: SmartMapConfig;
}

// Added AssetPerformance interface to track per-asset ROI and campaign usage
export interface AssetPerformance extends MarketingAsset {
  campaignCount: number;
  attributedRevenue: number;
  lifetimeRoi: number;
}

export interface Campaign {
  id: string;
  user_id: string; // Added for multi-tenancy
  name: string;
  destination_url: string;
  generated_utm_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  tracking_id: string; 
  target_roi: number;
  asset_ids: string[];
  created_at: string;
  tags?: string[];
}

export interface Stat {
  id: string;
  campaign_id: string;
  revenue: number;
  conversions: number;
  ad_spend: number;
  date: string;
  is_manual_override?: boolean;
}

export interface Deal {
  id: string;
  name: string;
  amount: number;
  status: string;
  fnd_source: string;
  closed_date: string;
}

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  propertyId?: string;
  measurementId?: string;
  apiSecret?: string;
}

export interface Settings {
  report_email: string;
  is_hubspot_connected: boolean;
  is_ga4_connected: boolean;
  custom_domain?: string;
  subscription: Subscription;
  integrations: {
    hubspot: IntegrationCredentials;
    ga4: IntegrationCredentials;
  };
  last_report_generated?: string;
}

export interface CampaignWithStats extends Campaign {
  totalRevenue: number;
  totalConversions: number;
  totalAdSpend: number;
  totalProductionCost: number;
  totalTrueCost: number;
  trueRoi: number;
}

export interface IntelligenceReport {
  summary: string;
  topPriorities: string[];
  assetStrategy: {
    refresh: string[];
    scale: string[];
  };
  channelInsights: string;
  campaignAdvice: string;
  generated_at: string;
}