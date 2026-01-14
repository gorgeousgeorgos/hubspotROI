const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

async function readRaw() {
  try {
    await fs.access(DATA_FILE);
  } catch (e) {
    // ensure customers array is present for pixel tracking
    await fs.writeFile(DATA_FILE, JSON.stringify({ users: [], campaigns: [], deals: [], customers: [] }, null, 2));
  }
  const txt = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(txt || '{}');
}

async function writeRaw(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function getCampaigns() {
  const d = await readRaw();
  return d.campaigns || [];
}

async function getCampaignById(id) {
  const camps = await getCampaigns();
  return camps.find(c => c.id === id) || null;
}

async function getCampaignByTrackingId(trackingId) {
  const camps = await getCampaigns();
  return camps.find(c => c.tracking_id === trackingId) || null;
}

function generateTrackingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function ensureUniqueTrackingId() {
  const d = await readRaw();
  d.campaigns = d.campaigns || [];
  let tries = 0;
  while (tries < 10) {
    const tid = generateTrackingId();
    if (!d.campaigns.some(c => c.tracking_id === tid)) return tid;
    tries++;
  }
  // fallback to UUID substring
  return randomUUID().slice(0, 6).toUpperCase();
}

async function updateCampaign(id, updates) {
  const d = await readRaw();
  d.campaigns = d.campaigns || [];
  const idx = d.campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  d.campaigns[idx] = { ...d.campaigns[idx], ...updates };
  await writeRaw(d);
  return d.campaigns[idx];
}

async function getDealsByCampaign(campaignId) {
  const d = await readRaw();
  return (d.deals || []).filter(r => r.campaign_id === campaignId);
}

async function upsertDeal(deal) {
  const d = await readRaw();
  d.deals = d.deals || [];
  const existing = d.deals.find(x => x.hubspot_deal_id === deal.hubspot_deal_id);
  if (existing) {
    Object.assign(existing, deal, { updated_at: new Date().toISOString() });
  } else {
    const newDeal = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...deal
    };
    d.deals.push(newDeal);
  }
  await writeRaw(d);
}

async function upsertCampaign(camp) {
  const d = await readRaw();
  d.campaigns = d.campaigns || [];
  if (!camp.id) camp.id = randomUUID();

  // Ensure a tracking_id exists and is unique
  if (!camp.tracking_id) {
    camp.tracking_id = await ensureUniqueTrackingId();
  }

  // Initialize metrics if missing
  camp.clicks = camp.clicks || 0;
  camp.conversions = camp.conversions || 0;

  const idx = d.campaigns.findIndex(c => c.id === camp.id);
  if (idx === -1) {
    const newCamp = { ...camp, created_at: new Date().toISOString() };
    d.campaigns.push(newCamp);
    await writeRaw(d);
    return newCamp;
  } else {
    d.campaigns[idx] = { ...d.campaigns[idx], ...camp, updated_at: new Date().toISOString() };
    await writeRaw(d);
    return d.campaigns[idx];
  }
}

async function incrementClicks(campaignId) {
  const d = await readRaw();
  const idx = (d.campaigns || []).findIndex(c => c.id === campaignId);
  if (idx === -1) return null;
  d.campaigns[idx].clicks = (d.campaigns[idx].clicks || 0) + 1;
  d.campaigns[idx].updated_at = new Date().toISOString();
  await writeRaw(d);
  return d.campaigns[idx];
}

async function incrementConversions(campaignId) {
  const d = await readRaw();
  const idx = (d.campaigns || []).findIndex(c => c.id === campaignId);
  if (idx === -1) return null;
  d.campaigns[idx].conversions = (d.campaigns[idx].conversions || 0) + 1;
  d.campaigns[idx].updated_at = new Date().toISOString();
  await writeRaw(d);
  return d.campaigns[idx];
}

async function addCustomer({ email, campaign_id }) {
  const d = await readRaw();
  d.customers = d.customers || [];
  const customer = {
    id: randomUUID(),
    email,
    campaign_id: campaign_id || null,
    status: 'LEAD',
    created_at: new Date().toISOString()
  };
  d.customers.push(customer);
  await writeRaw(d);
  return customer;
}

module.exports = {
  readRaw,
  writeRaw,
  getCampaigns,
  getCampaignById,
  getCampaignByTrackingId,
  updateCampaign,
  getDealsByCampaign,
  upsertDeal,
  upsertCampaign,
  incrementClicks,
  incrementConversions,
  addCustomer
};
