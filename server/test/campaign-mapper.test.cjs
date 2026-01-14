const { expect } = require('chai');
const { getCampaignIdFromFnd } = require('../services/campaignMapper');

describe('campaignMapper.getCampaignIdFromFnd', () => {
  it('extracts fnd_source=abc123', () => {
    expect(getCampaignIdFromFnd('source: something; fnd_source=abc123; other')).to.equal('abc123');
  });

  it('extracts fnd token with spaces and colon', () => {
    expect(getCampaignIdFromFnd('fnd_source: ABC-123_def')).to.equal('ABC-123_def');
  });

  it('returns null when not present', () => {
    expect(getCampaignIdFromFnd('no tracking here')).to.equal(null);
  });
});
