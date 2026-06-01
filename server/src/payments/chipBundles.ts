export const CHIP_BUNDLES = {
  chips_1000:  { chips: 1000,  priceCents: 99,   label: 'Starter Pack', emoji: '💰', isSubscription: false },
  chips_5000:  { chips: 5000,  priceCents: 399,  label: 'High Roller',  emoji: '💎', isSubscription: false },
  chips_20000: { chips: 20000, priceCents: 1299, label: 'Whale Pack',   emoji: '🐋', isSubscription: false },
  vip_monthly: { chips: 5000,  priceCents: 499,  label: 'VIP Monthly',  emoji: '👑', isSubscription: true  },
} as const;

export type BundleId = keyof typeof CHIP_BUNDLES;

export const FREE_STARTING_CHIPS  = 500;
export const DAILY_BONUS_CHIPS    = 200;
export const DAILY_BONUS_MS       = 24 * 60 * 60 * 1000;
export const FREE_AI_QUERIES      = 3;
export const AI_RATE_LIMIT_MS     = 5_000;
