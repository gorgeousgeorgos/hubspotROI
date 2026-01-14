
import { GoogleGenAI, Type } from "@google/genai";
import { CampaignWithStats } from "../types";

export const getIntelligenceReport = async (campaigns: CampaignWithStats[]) => {
  // Use the API key exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = campaigns.map(c => ({
    name: c.name,
    trueRoi: (c.trueRoi * 100).toFixed(0) + "%",
    revenue: c.totalRevenue,
    conversions: c.totalConversions,
    adSpend: c.totalAdSpend,
    productionCost: c.totalProductionCost,
    utmSource: c.utm_source,
    utmMedium: c.utm_medium,
    assetCount: c.asset_ids.length
  }));

  const prompt = `Act as a world-class Growth Director. Analyze these campaigns using "True ROI" (Revenue vs Ad Spend + Production Cost).
  
  Data Summary: ${JSON.stringify(dataSummary)}

  Provide a sophisticated response following this logic:
  1. Summary: A punchy 2-sentence executive summary on overall health.
  2. Priorities: Identify EXACTLY 3 highest-leverage actions.
  3. Asset Advice: Identify specific creative types (e.g., Ebooks vs Banners) that are "DRAINERS" (high production, low ROI) or "WINNERS".
  4. Platform Advice: Give specific feedback on channel mix (e.g., "Facebook CPA is high, consider shifting creative production to LinkedIn components").
  5. Holistic Advice: Is the creative strategy matching the spend velocity?`;

  // Upgrade to gemini-3-pro-preview for complex reasoning on strategic marketing data
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          topPriorities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 3 critical items for the user."
          },
          assetStrategy: {
            type: Type.OBJECT,
            properties: {
              refresh: { type: Type.ARRAY, items: { type: Type.STRING } },
              scale: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          channelInsights: { type: Type.STRING },
          campaignAdvice: { type: Type.STRING, description: "Holistic advice on campaign performance and creative/channel sync." }
        },
        required: ["summary", "topPriorities", "assetStrategy", "channelInsights", "campaignAdvice"]
      }
    }
  });

  // Correctly extract the text property from the response object
  const text = response.text;
  if (!text) throw new Error("Intelligence engine timeout.");
  return JSON.parse(text);
};
