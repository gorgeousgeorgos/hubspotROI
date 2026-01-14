
import { Campaign, Stat, MarketingAsset, Deal, Settings } from '../types';

/**
 * Foundry Native Storage Service
 * Namespaced by userId to ensure multi-tenancy.
 */

const getKeys = (userId: string) => ({
  CAMPAIGNS: `fnd_${userId}_campaigns`,
  STATS: `fnd_${userId}_stats`,
  ASSETS: `fnd_${userId}_assets`,
  DEALS: `fnd_${userId}_deals`,
  SETTINGS: `fnd_${userId}_settings`
});

export const nativeStorage = {
  saveCampaigns: (userId: string, data: Campaign[]) => {
    localStorage.setItem(getKeys(userId).CAMPAIGNS, JSON.stringify(data));
  },
  getCampaigns: (userId: string): Campaign[] | null => {
    const data = localStorage.getItem(getKeys(userId).CAMPAIGNS);
    return data ? JSON.parse(data) : null;
  },

  saveStats: (userId: string, data: Stat[]) => {
    localStorage.setItem(getKeys(userId).STATS, JSON.stringify(data));
  },
  getStats: (userId: string): Stat[] | null => {
    const data = localStorage.getItem(getKeys(userId).STATS);
    return data ? JSON.parse(data) : null;
  },

  saveAssets: (userId: string, data: MarketingAsset[]) => {
    localStorage.setItem(getKeys(userId).ASSETS, JSON.stringify(data));
  },
  getAssets: (userId: string): MarketingAsset[] | null => {
    const data = localStorage.getItem(getKeys(userId).ASSETS);
    return data ? JSON.parse(data) : null;
  },

  saveDeals: (userId: string, data: Deal[]) => {
    localStorage.setItem(getKeys(userId).DEALS, JSON.stringify(data));
  },
  getDeals: (userId: string): Deal[] | null => {
    const data = localStorage.getItem(getKeys(userId).DEALS);
    return data ? JSON.parse(data) : null;
  },

  saveSettings: (userId: string, data: Settings) => {
    localStorage.setItem(getKeys(userId).SETTINGS, JSON.stringify(data));
  },
  getSettings: (userId: string): Settings | null => {
    const data = localStorage.getItem(getKeys(userId).SETTINGS);
    return data ? JSON.parse(data) : null;
  }
};
