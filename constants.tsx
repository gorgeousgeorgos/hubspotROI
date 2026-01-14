
import { Campaign, Stat, Settings, MarketingAsset, Deal } from './types';

export const INITIAL_ASSETS: MarketingAsset[] = [
  {
    id: 'a1',
    name: 'High-Convert E-book',
    type: 'EBOOK',
    cost_amount: 500,
    cost_type: 'ONE_OFF',
    hubspot_id: 'hs_123',
    created_at: new Date('2023-10-01').toISOString()
  },
  {
    id: 'a2',
    name: 'LinkedIn Ad Set v2',
    type: 'BANNER',
    cost_amount: 1200,
    cost_type: 'ONE_OFF',
    hubspot_id: 'hs_456',
    created_at: new Date('2023-10-05').toISOString()
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    user_id: 'default',
    name: 'Q1 Facebook Push',
    destination_url: 'https://foundry.io/demo',
    generated_utm_url: 'https://foundry.io/demo?utm_source=facebook&utm_medium=paid&utm_campaign=retargeting&fnd=xct5g',
    utm_source: 'facebook',
    utm_medium: 'paid',
    utm_campaign: 'retargeting',
    tracking_id: 'xct5g',
    target_roi: 2.5,
    asset_ids: ['a2'],
    created_at: new Date('2023-11-15').toISOString()
  },
  {
    id: '2',
    user_id: 'default',
    name: 'Lead Gen E-book Campaign',
    destination_url: 'https://foundry.io/ebook',
    generated_utm_url: 'https://foundry.io/ebook?utm_source=linkedin&utm_medium=cpc&utm_campaign=ebook_downloads&fnd=lnd9k',
    utm_source: 'linkedin',
    utm_medium: 'cpc',
    utm_campaign: 'ebook_downloads',
    tracking_id: 'lnd9k',
    target_roi: 3.0,
    asset_ids: ['a1'],
    created_at: new Date('2023-12-10').toISOString()
  }
];

export const INITIAL_STATS: Stat[] = [
  { id: 's1', campaign_id: '1', revenue: 8000, conversions: 45, ad_spend: 1500, date: '2023-12-01' },
  { id: 's2', campaign_id: '2', revenue: 15000, conversions: 120, ad_spend: 4000, date: '2023-12-01' }
];

export const INITIAL_DEALS: Deal[] = [
  { id: 'd1', name: 'Enterprise SaaS Deal', amount: 5000, status: 'Closed Won', fnd_source: 'xct5g', closed_date: '2023-12-05' },
  { id: 'd2', name: 'Growth Plan Sub', amount: 1500, status: 'Closed Won', fnd_source: 'lnd9k', closed_date: '2023-12-06' }
];

export const INITIAL_SETTINGS: Settings = {
  report_email: 'growth@founder.io',
  is_hubspot_connected: false,
  is_ga4_connected: false,
  subscription: {
    plan: 'FREE',
    status: 'active',
    next_billing_date: '2025-12-01'
  },
  integrations: {
    hubspot: {},
    ga4: {}
  }
};
