const { GoogleGenAI, Type } = (() => {
  try {
    return require('@google/genai');
  } catch (e) {
    return {};
  }
})();

if (!GoogleGenAI) {
  console.warn('server/services/geminiService: @google/genai not installed — install in server to enable intelligence reports');
}

const getIntelligenceReport = async (campaigns = []) => {
  if (!GoogleGenAI) throw new Error('Missing @google/genai - install on the server to enable intelligence reports');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

  const dataSummary = campaigns.map((c) => ({
    name: c.name,
    trueRoi: (typeof c.trueRoi === 'number') ? (c.trueRoi * 100).toFixed(0) + '%' : String(c.trueRoi),
    revenue: c.totalRevenue || c.revenue || 0,
    conversions: c.totalConversions || c.conversions || 0,
    adSpend: c.totalAdSpend || c.ad_spend || 0,
    productionCost: c.totalProductionCost || c.estimated_production_cost || 0,
    utmSource: c.utm_source || c.utmSource || null,
    utmMedium: c.utm_medium || c.utmMedium || null,
    assetCount: (c.asset_ids || []).length || 0
  }));

  const prompt = `Act as a world-class Growth Director. Analyze these campaigns using "True ROI" (Revenue vs Ad Spend + Production Cost).

Data Summary: ${JSON.stringify(dataSummary)}

Provide a sophisticated response following this logic:
1. Summary: A punchy 2-sentence executive summary on overall health.
2. Priorities: Identify EXACTLY 3 highest-leverage actions.
3. Asset Advice: Identify specific creative types that are DRAINERS or WINNERS.
4. Platform Advice: Give specific feedback on channel mix.
5. Holistic Advice: Is the creative strategy matching the spend velocity?`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          topPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
          assetStrategy: { type: Type.OBJECT },
          channelInsights: { type: Type.STRING },
          campaignAdvice: { type: Type.STRING }
        },
        required: ['summary', 'topPriorities', 'assetStrategy', 'channelInsights', 'campaignAdvice']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('Intelligence engine timeout.');
  return JSON.parse(text);
};

module.exports = { getIntelligenceReport };