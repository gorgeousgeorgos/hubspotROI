const { GoogleGenerativeAI } = (() => {
  try {
    return require('@google/generative-ai');
  } catch (e) {
    return {};
  }
})();

if (!GoogleGenerativeAI) {
  console.warn('server/services/geminiService: @google/generative-ai not installed — install in server to enable intelligence reports');
}

const getIntelligenceReport = async (campaigns = []) => {
  if (!GoogleGenerativeAI) throw new Error('Missing @google/generative-ai - install on the server to enable intelligence reports');

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');

  const client = new GoogleGenerativeAI({ apiKey });
  const model = client.getGenerativeModel({ model: 'gemini-2.0-pro-exp-02-05' });

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
5. Holistic Advice: Is the creative strategy matching the spend velocity?

Return ONLY valid JSON matching this schema:
{
  "summary": string,
  "topPriorities": [string, string, string],
  "assetStrategy": { "refresh": [string], "scale": [string] },
  "channelInsights": string,
  "campaignAdvice": string
}`;

  try {
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
            topPriorities: { type: 'ARRAY', items: { type: 'STRING' } },
            assetStrategy: {
              type: 'OBJECT',
              properties: {
                refresh: { type: 'ARRAY', items: { type: 'STRING' } },
                scale: { type: 'ARRAY', items: { type: 'STRING' } }
              }
            },
            channelInsights: { type: 'STRING' },
            campaignAdvice: { type: 'STRING' }
          },
          required: ['summary', 'topPriorities', 'assetStrategy', 'channelInsights', 'campaignAdvice']
        }
      }
    });

    const text = response.response.text();
    if (!text) throw new Error('Intelligence engine timeout.');
    return JSON.parse(text);
  } catch (err) {
    console.error('Gemini API error:', err?.message || err);
    throw new Error(`Intelligence generation failed: ${err?.message || err}`);
  }
};

module.exports = { getIntelligenceReport };