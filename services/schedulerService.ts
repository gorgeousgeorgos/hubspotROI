
import { CampaignWithStats, IntelligenceReport } from '../types';
import { getIntelligenceReport } from './geminiService';

/**
 * Foundry Scheduler Service
 * Simulates Sunday 09:00 AM report generation logic.
 */

export const generateWeeklyIntelligence = async (campaigns: CampaignWithStats[]): Promise<IntelligenceReport> => {
  console.log("Foundry Scheduler: Initiating Weekly ROI Audit...");

  // ROI Benchmarks for recommendations
  const winners = campaigns.filter(c => c.trueRoi > 3.0);
  const drainers = campaigns.filter(c => c.trueRoi < 1.2 && c.totalTrueCost > 0);

  // Call the Gemini-powered intelligence engine
  const report = await getIntelligenceReport(campaigns);

  return {
    ...report,
    generated_at: new Date().toISOString()
  };
};

export const checkShouldRunReport = (lastRunDate?: string): boolean => {
  if (!lastRunDate) return true;
  
  const lastRun = new Date(lastRunDate);
  const now = new Date();
  
  // Calculate if a new Sunday has passed since the last run
  const diffTime = Math.abs(now.getTime() - lastRun.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 7;
};
