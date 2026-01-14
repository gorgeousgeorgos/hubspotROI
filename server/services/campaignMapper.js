// Server-side helper to extract campaign tracking id from HubSpot free-form fields
module.exports.getCampaignIdFromFnd = function(description) {
  if (!description) return null;
  const patterns = [
    /fnd_source\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
    /fnd\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
    /fnd_source\s+([A-Za-z0-9\-_]+)/i,
    /tracking_id\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
    /fnd=([A-Za-z0-9\-_]+)/i
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
};
