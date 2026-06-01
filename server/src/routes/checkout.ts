import type { Request, Response } from 'express';
import { CHIP_BUNDLES, type BundleId } from '../payments/chipBundles.js';
import { getStripe } from '../payments/stripeClient.js';
import { config } from '../config.js';
import { requireAuth, type AuthRequest } from '../auth/middleware.js';

export { requireAuth }; // re-export for convenience

export async function handleCheckout(req: Request, res: Response) {
  const { bundleId } = req.body as { bundleId?: string };
  const { player } = req as AuthRequest;

  if (!bundleId || !(bundleId in CHIP_BUNDLES)) {
    res.status(400).json({ error: 'Invalid bundleId' });
    return;
  }

  const bundle = CHIP_BUNDLES[bundleId as BundleId];
  const stripe = getStripe();

  const successUrl = `${config.clientOrigin}?checkout=success&bundle=${bundleId}`;
  const cancelUrl  = `${config.clientOrigin}?checkout=cancel`;

  try {
    if (bundle.isSubscription) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: bundle.label, description: `${bundle.chips.toLocaleString()} chips/month + VIP perks` },
            unit_amount: bundle.priceCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: { playerId: player.playerId, bundleId },
        success_url: successUrl,
        cancel_url:  cancelUrl,
      });
      res.json({ url: session.url });
    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: bundle.label, description: `${bundle.chips.toLocaleString()} poker chips` },
            unit_amount: bundle.priceCents,
          },
          quantity: 1,
        }],
        metadata: { playerId: player.playerId, bundleId },
        success_url: successUrl,
        cancel_url:  cancelUrl,
      });
      res.json({ url: session.url });
    }
  } catch (err) {
    console.error('[checkout] Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
