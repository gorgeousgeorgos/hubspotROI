
import { Campaign, Stat, MarketingAsset, Deal, Settings } from '../types';
import { supabase } from '../src/services/supabaseClient';

/**
 * Supabase-backed storage service (replaces localStorage)
 * All functions are async and require a userId for multi-tenancy.
 */

export const nativeStorage = {
  saveCampaigns: async (userId: string, data: Campaign[]) => {
    // upsert campaigns, ensure user_id is set
    const payload = data.map(d => ({ ...d, user_id: userId }));
    await supabase.from('campaigns').upsert(payload, { onConflict: 'id' });
  },
  getCampaigns: async (userId: string): Promise<Campaign[] | null> => {
    const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Campaign[]) || null;
  },

  saveStats: async (userId: string, data: Stat[]) => {
    const payload = data.map(d => ({ ...d, user_id: userId }));
    await supabase.from('stats').upsert(payload, { onConflict: 'id' });
  },
  getStats: async (userId: string): Promise<Stat[] | null> => {
    const { data, error } = await supabase.from('stats').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as Stat[]) || null;
  },

  saveAssets: async (userId: string, data: MarketingAsset[]) => {
    const payload = data.map(d => ({ ...d, user_id: userId }));
    await supabase.from('assets').upsert(payload, { onConflict: 'id' });
  },
  getAssets: async (userId: string): Promise<MarketingAsset[] | null> => {
    const { data, error } = await supabase.from('assets').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as MarketingAsset[]) || null;
  },

  saveDeals: async (userId: string, data: Deal[]) => {
    const payload = data.map(d => ({ ...d, user_id: userId }));
    await supabase.from('deals').upsert(payload, { onConflict: 'id' });
  },
  getDeals: async (userId: string): Promise<Deal[] | null> => {
    const { data, error } = await supabase.from('deals').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as Deal[]) || null;
  },

  saveSettings: async (userId: string, data: Settings) => {
    const payload = { ...data, user_id: userId } as any;
    await supabase.from('settings').upsert(payload, { onConflict: 'user_id' });
  },
  getSettings: async (userId: string): Promise<Settings | null> => {
    const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error; // not found
    return (data as Settings) || null;
  }
};
