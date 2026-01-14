/**
 * Extract campaign tracking_id from HubSpot deal description or other free-form fields.
 * Supports patterns like `fnd_source=abc123`, `fnd_source: abc123`, `fnd=abc123`, `tracking_id=ABC123`.
 */
export function getCampaignIdFromFnd(description?: string): string | null {
  if (!description) return null;
  const patterns = [
    /fnd_source\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
    /fnd\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
    /fnd_source\s+([A-Za-z0-9\-_]+)/i,
    /tracking_id\s*[:=]\s*([A-Za-z0-9\-_]+)/i,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}
