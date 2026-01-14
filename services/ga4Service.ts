
import { Stat, IntegrationCredentials } from "../types";

/**
 * GA4 Native Reporting & Tracking Engine
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

export const fetchGa4Metrics = async (creds: IntegrationCredentials): Promise<Stat[]> => {
  if (!creds.accessToken || !creds.propertyId) throw new Error("GA4 Credentials incomplete.");

  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [
          { name: 'date' },
          { name: 'sessionCampaign' }
        ],
        metrics: [
          { name: 'conversions' },
          { name: 'totalRevenue' },
          { name: 'advertiserAdSpend' }
        ],
        keepEmptyRows: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GA4 Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return (data.rows || []).map((row: any, idx: number) => ({
      id: `ga_sig_${idx}`,
      campaign_id: row.dimensionValues[1].value,
      date: row.dimensionValues[0].value,
      revenue: parseFloat(row.metricValues[1].value) || 0,
      conversions: parseInt(row.metricValues[0].value) || 0,
      ad_spend: parseFloat(row.metricValues[2].value) || 0
    }));
  } catch (error) {
    console.error("Native GA4 Engine Failure:", error);
    throw error;
  }
};
