// constants/credits.ts
// Credit system configuration for Defendu pay-per-use module access

import { TopUpPackage } from '../app/_models/Wallet';

// --- Free trial limits per difficulty ---
export const FREE_USAGE_LIMITS: Record<string, number> = {
  basic: 10,
  intermediate: 5,
  advanced: 1,
};

// --- Credits consumed per module use by difficulty ---
export const CREDITS_PER_USE: Record<string, number> = {
  basic: 5,
  intermediate: 15,
  advanced: 30,
};

// --- PHP to Credits conversion rate ---
// 1 PHP = 1 credit (simple 1:1 mapping)
export const PHP_PER_CREDIT = 1;

// --- Top-up packages ---
export const TOP_UP_PACKAGES: TopUpPackage[] = [
  { id: 'starter', credits: 50, pricePHP: 50, label: 'Starter' },
  { id: 'basic', credits: 100, pricePHP: 99, label: 'Basic', popular: false },
  { id: 'standard', credits: 250, pricePHP: 225, label: 'Standard', popular: true },
  { id: 'premium', credits: 500, pricePHP: 399, label: 'Premium' },
  { id: 'pro', credits: 1000, pricePHP: 749, label: 'Pro' },
];

// --- Display helpers ---
export function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} credit${credits === 1 ? '' : 's'}`;
}

export function getDifficultyLabel(level: string): string {
  switch (level) {
    case 'basic': return 'Basic';
    case 'intermediate': return 'Intermediate';
    case 'advanced': return 'Advanced';
    default: return 'Basic';
  }
}

export function getDifficultyColor(level: string): string {
  switch (level) {
    case 'basic': return '#4CAF50';
    case 'intermediate': return '#FF9800';
    case 'advanced': return '#F44336';
    default: return '#4CAF50';
  }
}
