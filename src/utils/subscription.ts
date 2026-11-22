import type { FilterOption, FramePatternOption, PhotoTemplate } from '../types/photobooth';

export type PlanTier = 'free' | 'weekend' | 'creator' | 'studio';

export interface UserPlanState {
  plan: PlanTier;
  creditsTotal: number;
  creditsRemaining: number;
  cycleKey: string;
}

export type BillingCycle = 'once' | 'monthly' | 'yearly';

export interface PlanTierMeta {
  id: PlanTier;
  label: string;
  badge: string;
  creditsTotal: number;
  isUnlimited: boolean;
  hasWatermark: boolean;
  allowZipExport: boolean;
  exportScale: number;
  shortDpi: string;
  dpiLabel: string;
}

export interface PlanPriceInfo {
  tier: Exclude<PlanTier, 'free'>;
  label: string;
  billingCycle: BillingCycle;
  amountIdr: number;
  monthlyEquivalentIdr: number;
  billingDescription: string;
}

export const FREE_MONTHLY_CREDITS = 20;
export const UNLIMITED_CREDITS_SENTINEL = 999999;

export const PLAN_META: Record<PlanTier, PlanTierMeta> = {
  free: {
    id: 'free',
    label: 'Gratis / Free',
    badge: 'Dasar',
    creditsTotal: FREE_MONTHLY_CREDITS,
    isUnlimited: false,
    hasWatermark: false,
    allowZipExport: false,
    exportScale: 0.68,
    shortDpi: '72 DPI',
    dpiLabel: '72 DPI Web'
  },
  weekend: {
    id: 'weekend',
    label: 'Weekend Pass',
    badge: 'Sachet Pass',
    creditsTotal: 50,
    isUnlimited: false,
    hasWatermark: false,
    allowZipExport: true,
    exportScale: 1,
    shortDpi: '300 DPI',
    dpiLabel: '300 DPI HD · Bebas Watermark'
  },
  creator: {
    id: 'creator',
    label: 'Creator Pass',
    badge: 'Populer',
    creditsTotal: 500,
    isUnlimited: false,
    hasWatermark: false,
    allowZipExport: true,
    exportScale: 1,
    shortDpi: '300 DPI',
    dpiLabel: '300 DPI HD · Bebas Watermark'
  },
  studio: {
    id: 'studio',
    label: 'Studio Pro',
    badge: 'Unlimited',
    creditsTotal: UNLIMITED_CREDITS_SENTINEL,
    isUnlimited: true,
    hasWatermark: false,
    allowZipExport: true,
    exportScale: 1.5,
    shortDpi: '600 DPI',
    dpiLabel: '600 DPI Studio · Custom Branding'
  }
};

export function getCurrentCycleKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function createInitialFreePlanState(date: Date = new Date()): UserPlanState {
  return {
    plan: 'free',
    creditsTotal: FREE_MONTHLY_CREDITS,
    creditsRemaining: FREE_MONTHLY_CREDITS,
    cycleKey: getCurrentCycleKey(date)
  };
}

export function isPaidPlan(plan: PlanTier): boolean {
  return plan !== 'free';
}

export function getPlanMeta(plan: PlanTier): PlanTierMeta {
  return PLAN_META[plan] || PLAN_META.free;
}

export function isTemplateLocked(
  template: Pick<PhotoTemplate, 'isPremium'>,
  plan: PlanTier
): boolean {
  return Boolean(template.isPremium && !isPaidPlan(plan));
}

export function isFilterLocked(
  filter: Pick<FilterOption, 'isPremium'>,
  plan: PlanTier
): boolean {
  return Boolean(filter.isPremium && !isPaidPlan(plan));
}

export function isPatternLocked(
  pattern: Pick<FramePatternOption, 'isPremium'>,
  plan: PlanTier
): boolean {
  return Boolean(pattern.isPremium && !isPaidPlan(plan));
}

export function normalizeMonthlyPlanState(
  state: UserPlanState,
  currentCycle: string = getCurrentCycleKey()
): UserPlanState {
  if (state.plan === 'free' && currentCycle > state.cycleKey) {
    return {
      plan: 'free',
      creditsTotal: FREE_MONTHLY_CREDITS,
      creditsRemaining: FREE_MONTHLY_CREDITS,
      cycleKey: currentCycle
    };
  }
  return state;
}

export function hasAvailableCredits(state: UserPlanState): boolean {
  if (getPlanMeta(state.plan).isUnlimited) {
    return true;
  }
  return state.creditsRemaining > 0;
}

export function consumePlanCredit(state: UserPlanState): {
  allowed: boolean;
  nextState: UserPlanState;
} {
  if (getPlanMeta(state.plan).isUnlimited) {
    return { allowed: true, nextState: state };
  }
  if (state.creditsRemaining <= 0) {
    return { allowed: false, nextState: state };
  }
  return {
    allowed: true,
    nextState: {
      ...state,
      creditsRemaining: state.creditsRemaining - 1
    }
  };
}

export function createPlanStateForTier(
  tier: PlanTier,
  currentCycle: string = getCurrentCycleKey()
): UserPlanState {
  const meta = getPlanMeta(tier);
  return {
    plan: tier,
    creditsTotal: meta.creditsTotal,
    creditsRemaining: meta.creditsTotal,
    cycleKey: currentCycle
  };
}

export function getPlanPriceInfo(
  tier: Exclude<PlanTier, 'free'>,
  selectedCycle: 'monthly' | 'yearly'
): PlanPriceInfo {
  if (tier === 'weekend') {
    return {
      tier: 'weekend',
      label: PLAN_META.weekend.label,
      billingCycle: 'once',
      amountIdr: 5000,
      monthlyEquivalentIdr: 5000,
      billingDescription: 'Sekali Bayar · 50 Kredit HD 300 DPI'
    };
  }

  const baseMonthly = 15000;
  if (selectedCycle === 'yearly') {
    const monthlyEquivalentIdr = Math.round(baseMonthly * 0.8);
    const amountIdr = monthlyEquivalentIdr * 12;
    return {
      tier,
      label: PLAN_META[tier].label,
      billingCycle: 'yearly',
      amountIdr,
      monthlyEquivalentIdr,
      billingDescription: `Tagihan Tahunan (Hemat 20% · setara Rp ${monthlyEquivalentIdr.toLocaleString('id-ID')}/bln)`
    };
  }

  return {
    tier,
    label: PLAN_META[tier].label,
    billingCycle: 'monthly',
    amountIdr: baseMonthly,
    monthlyEquivalentIdr: baseMonthly,
    billingDescription: 'Tagihan Bulanan Fleksibel'
  };
}

export function generateUpgradeReferenceCode(
  tier: Exclude<PlanTier, 'free'>,
  date: Date = new Date()
): string {
  const prefix = tier === 'weekend' ? 'WKD' : tier === 'studio' ? 'STD' : 'CRT';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `PSR-${prefix}-${month}${day}-${suffix}`;
}
