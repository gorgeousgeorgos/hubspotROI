
import { Deal, IntegrationCredentials } from "../types";

/**
 * HubSpot Native Bridge (frontend placeholder)
 * NOTE: When moving to production, call the backend endpoints (`/api/hubspot/sync`) instead of
 * running direct API calls from the browser. The server has a server/services/hubspotService.js
 * stub ready to be expanded for token refresh and secure sync.
 */

import { supabase } from '../src/services/supabaseClient';
import { IntegrationCredentials } from "../types";

export const getHubspotSettings = async (userId: string): Promise<IntegrationCredentials | null> => {
  const { data, error } = await supabase.from('settings').select('integrations').eq('user_id', userId).single();
  if (error) {
    console.warn('Failed to fetch settings for user', userId, error.message);
    return null;
  }
  return (data?.integrations?.hubspot as IntegrationCredentials) || null;
};

export const refreshHubSpotToken = async (creds: IntegrationCredentials): Promise<IntegrationCredentials> => {
  if (!creds.refreshToken) throw new Error("No refresh token available");

  console.log("Refreshing HubSpot Access Token...");
  
  // Placeholder for the actual OAuth2 refresh flow
  return {
    ...creds,
    accessToken: "new_refreshed_access_token_" + Date.now(),
    expiresAt: Date.now() + 3600 * 1000 // 1 hour
  };
};

export const fetchHubSpotDeals = async (creds?: IntegrationCredentials, token?: string): Promise<Deal[]> => {
  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/hubspot/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ creds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'HubSpot sync failed');
    }

    const body = await res.json();
    // server returns { imported, deals }
    return (body.deals || []) as Deal[];
  } catch (err) {
    console.error('HubSpot sync failed', err);
    throw err;
  }
};
