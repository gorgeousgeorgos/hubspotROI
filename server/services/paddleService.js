// Validate Paddle webhook signature using Paddle vendor ID and public key
// For production, implement proper HMAC-SHA256 verification
async function validatePaddleSignature(payload, signature) {
  // TODO: Implement using Paddle's public key from environment
  // Verify HMAC-SHA256(payload, secret) === signature
  // For now, accept if signature is present (sandbox mode)
  return !!signature;
}

// Process Paddle webhook events
async function handlePaddleWebhook(payload, signature, client = null) {
  if (!await validatePaddleSignature(payload, signature)) {
    throw new Error('Invalid Paddle webhook signature');
  }

  const eventType = payload.alert_type || payload.event_type;
  console.log(`Paddle webhook event: ${eventType}`, payload);

  // Lazy-load notificationService to avoid circular dependencies
  let notificationService;
  try {
    notificationService = require('./notificationService');
  } catch (err) {
    console.warn('notificationService not available for Paddle events');
  }

  switch (eventType) {
    case 'subscription.created':
      // New subscription - send Slack alert if available
      if (notificationService && payload.user_id) {
        try {
          await notificationService.sendSlackAlert('new_pro_signup', {
            email: payload.email || 'unknown',
            plan: payload.product_name || 'PRO'
          });
        } catch (err) {
          console.warn('Failed to send Slack alert for new subscription', err?.message || err);
        }
      }
      // Update user subscription in DB
      // payload.user_id, payload.subscription_id, payload.status
      return { status: 'processed', event: eventType };

    case 'subscription.updated':
      // Subscription updated - send alert if plan changed to PRO
      if (notificationService && payload.user_id && (payload.product_name === 'PRO' || payload.new_plan === 'PRO')) {
        try {
          await notificationService.sendSlackAlert('upgrade_to_pro', {
            email: payload.email || 'unknown',
            from_plan: payload.old_plan || 'FREE',
            to_plan: payload.product_name || 'PRO'
          });
        } catch (err) {
          console.warn('Failed to send Slack alert for upgrade', err?.message || err);
        }
      }
      return { status: 'processed', event: eventType };

    case 'subscription.cancelled':
      // Mark subscription as cancelled
      return { status: 'processed', event: eventType };

    case 'payment.succeeded':
      // Log successful payment
      return { status: 'processed', event: eventType };

    case 'payment.failed':
      // Alert user of payment failure
      return { status: 'processed', event: eventType };

    default:
      console.warn(`Unknown Paddle event: ${eventType}`);
      return { status: 'ignored', event: eventType };
  }
}

module.exports = { handlePaddleWebhook, validatePaddleSignature };
