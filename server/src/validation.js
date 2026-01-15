const { z } = require('zod');

// Campaign creation schema
const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name required').max(255),
  destination_url: z.string().url('Invalid destination URL'),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional()
});

// Pixel lead submission schema
const pixelSchema = z.object({
  email: z.string().email('Invalid email address')
});

// Settings update schema
const settingsSchema = z.object({
  report_email: z.string().email('Invalid email address').optional(),
  custom_domain: z.string().optional(),
  integrations: z.object({}).optional()
});

// HubSpot sync schema
const hubspotSyncSchema = z.object({
  creds: z.object({
    access_token: z.string().optional(),
    refreshToken: z.string().optional()
  }).optional(),
  campaignId: z.string().optional()
});

// GA4 metrics schema
const ga4Schema = z.object({
  creds: z.object({
    accessToken: z.string().optional(),
    propertyId: z.string().optional()
  }).optional()
});

// Advisor analyze schema
const advisorSchema = z.object({
  campaigns: z.array(z.any()).min(1, 'At least one campaign required')
});

module.exports = {
  campaignSchema,
  pixelSchema,
  settingsSchema,
  hubspotSyncSchema,
  ga4Schema,
  advisorSchema
};
