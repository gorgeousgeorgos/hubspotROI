
import { CampaignWithStats } from "../types";

// Client-side proxy to server intelligence API
export const getIntelligenceReport = async (campaigns: CampaignWithStats[], token?: string) => {
  if (!token) throw new Error('Auth token required for server-side intelligence');
  const res = await fetch('/api/advisor/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ campaigns })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch intelligence');
  }

  return await res.json();
};
