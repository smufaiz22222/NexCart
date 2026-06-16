import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import { app } from '../app.js';

const signPayload = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

test('POST /api/orders/razorpay/webhook accepts a signed webhook without authentication', async () => {
  const secret = 'webhook-secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = secret;

  const payload = JSON.stringify({
    event: 'subscription.paused',
    payload: {},
  });

  const response = await request(app)
    .post('/api/orders/razorpay/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', signPayload(payload, secret))
    .send(payload);

  assert.equal(response.status, 200);
  assert.equal(response.body.received, true);
  assert.equal(response.body.event, 'subscription.paused');
  assert.equal(response.body.handled, false);
});
