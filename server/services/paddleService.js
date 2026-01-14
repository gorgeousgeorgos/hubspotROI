// Basic Paddle webhook handler stub
async function handlePaddleWebhook(payload) {
  // TODO: validate signature using Paddle vendor public key and verify payload
  console.log('Received Paddle webhook payload:', payload);
  // TODO: update subscription records in DB based on event type
  return { ok: true };
}

module.exports = { handlePaddleWebhook };
