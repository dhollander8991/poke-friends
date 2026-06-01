import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { getStripe } from '../payments/stripeClient.js';
import { config } from '../config.js';
import { CHIP_BUNDLES, type BundleId } from '../payments/chipBundles.js';
import { sessionStore } from '../store/SessionStore.js';
import { roomManager } from '../game/roomManagerInstance.js';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig || !config.stripeWebhookSecret) {
    res.status(400).json({ error: 'Missing stripe-signature header or webhook secret' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, config.stripeWebhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature invalid' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const playerId = session.metadata?.playerId;
    const bundleId = session.metadata?.bundleId as BundleId | undefined;

    if (!playerId || !bundleId || !(bundleId in CHIP_BUNDLES)) {
      res.json({ received: true });
      return;
    }

    const bundle = CHIP_BUNDLES[bundleId];

    if (bundle.isSubscription) {
      sessionStore.setTier(playerId, 'vip');
    }

    const credited = roomManager.creditChips(playerId, bundle.chips);
    if (!credited) {
      sessionStore.addPendingChips(playerId, bundle.chips);
    }

    console.log(`[webhook] Credited ${bundle.chips} chips to player ${playerId} (bundle: ${bundleId})`);
  }

  res.json({ received: true });
}
