// Validate Paddle webhook signature using Paddle vendor ID and public key
// For production, implement proper HMAC-SHA256 verification
async function validatePaddleSignature(payload, signature) {
  // TODO: Implement using Paddle's public key from environment
  // Verify HMAC-SHA256(payload, secret) === signature
  // For now, accept if signature is present (sandbox mode)
  return !!signature;
}

// Process Paddle webhook events
async function handlePaddleWebhook(payload, signature) {
  if (!await validatePaddleSignature(payload, signature)) {
    throw new Error('Invalid Paddle webhook signature');
  }

  const eventType = payload.alert_type || payload.event_type;
  console.log(`Paddle webhook event: ${eventType}`, payload);

  switch (eventType) {
    case 'subscription.created':
    case 'subscription.updated':
      // Update user subscription in DB
      // payload.user_id, payload.subscription_id, payload.status
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
