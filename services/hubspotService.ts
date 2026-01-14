
import { Deal, IntegrationCredentials } from "../types";

/**
 * HubSpot Native Bridge
 * Includes token refreshing and CRM v3 Deal search.
 */

export const refreshHubSpotToken = async (creds: IntegrationCredentials): Promise<IntegrationCredentials> => {
  if (!creds.refreshToken) throw new Error("No refresh token available");

  // In a real Replit environment, this would hit your Node.js backend route
  // that stores the CLIENT_SECRET safely.
  console.log("Refreshing HubSpot Access Token...");
  
  // Placeholder for the actual OAuth2 refresh flow
  return {
    ...creds,
    accessToken: "new_refreshed_access_token_" + Date.now(),
    expiresAt: Date.now() + 3600 * 1000 // 1 hour
  };
};

export const fetchHubSpotDeals = async (creds: IntegrationCredentials): Promise<Deal[]> => {
  let activeCreds = creds;
  
  // Automatic Refresh Check
  if (creds.expiresAt && Date.now() > creds.expiresAt - 60000) {
    activeCreds = await refreshHubSpotToken(creds);
  }

  if (!activeCreds.accessToken) throw new Error("HubSpot Access Token missing");

  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeCreds.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'description',
                operator: 'CONTAINS_TOKEN',
                value: 'fnd='
              }
            ]
          }
        ],
        properties: ['dealname', 'amount', 'closedate', 'dealstage', 'description', 'hs_analytics_latest_source_data_2'],
        limit: 100,
        sorts: [{ propertyName: 'closedate', direction: 'DESCENDING' }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HubSpot Error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map((item: any) => {
      const desc = item.properties.description || '';
      const utmSource2 = item.properties.hs_analytics_latest_source_data_2 || '';
      const fndMatch = desc.match(/fnd=([a-z0-9]+)/) || utmSource2.match(/fnd=([a-z0-9]+)/);
      const fndId = fndMatch ? fndMatch[1] : 'organic';

      return {
        id: item.id,
        name: item.properties.dealname || 'Untitled CRM Deal',
        amount: parseFloat(item.properties.amount) || 0,
        status: item.properties.dealstage,
        fnd_source: fndId,
        closed_date: item.properties.closedate || item.createdAt
      };
    });
  } catch (error) {
    console.error("Native HubSpot Bridge Failure:", error);
    throw error;
  }
};
