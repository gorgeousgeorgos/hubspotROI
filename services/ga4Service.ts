
import { Stat, IntegrationCredentials } from "../types";
import { supabase } from '../src/services/supabaseClient';

export const getGa4Settings = async (userId: string): Promise<IntegrationCredentials | null> => {
  const { data, error } = await supabase.from('settings').select('integrations').eq('user_id', userId).single();
  if (error) {
    console.warn('Failed to fetch settings for user', userId, error.message);
    return null;
  }
  return (data?.integrations?.ga4 as IntegrationCredentials) || null;
};

/**
 * GA4 Native Reporting & Tracking Engine (frontend placeholder)
 * NOTE: When moving to production, proxy GA4 requests through the backend (`/api/ga4/metrics`) to
 * protect tokens. The server has a server/services/ga4Service.js stub ready to be expanded.
 */

export const sendGa4Event = async (creds: IntegrationCredentials, eventName: string, params: any) => {
  if (!creds.measurementId || !creds.apiSecret) return;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${creds.measurementId}&api_secret=${creds.apiSecret}`;
  
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: 'foundry_pixel_user', // This would come from the user's cookie in production
        events: [{
          name: eventName,
          params: params
        }]
      })
    });
  } catch (err) {
    console.error("GA4 Measurement Protocol Error:", err);
  }
};

export const fetchGa4Metrics = async (creds: IntegrationCredentials, token?: string): Promise<Stat[]> => {
  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/ga4/metrics', {
      method: 'POST',
      headers,
      body: JSON.stringify({ creds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'GA4 metrics fetch failed');
    }

    const body = await res.json();
    const metrics = body.metrics || [];

    // Map server response to Stat[] expected by UI
    return metrics.map((m: any, idx: number) => ({
      id: `ga_sig_${idx}`,
      campaign_id: m.campaignId || m.sessionCampaign || m.campaign || '',
      date: m.date || m.startDate || '',
      revenue: parseFloat(m.revenue || m.totalRevenue || 0) || 0,
      conversions: parseInt(m.conversions || 0) || 0,
      ad_spend: parseFloat(m.ad_spend || m.advertiserAdSpend || 0) || 0
    }));
  } catch (err) {
    console.error('GA4 metrics fetch failed', err);
    throw err;
  }
};
