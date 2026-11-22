import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_MONTHLY_CREDITS,
  consumePlanCredit,
  createInitialFreePlanState,
  createPlanStateForTier,
  generateUpgradeReferenceCode,
  getPlanMeta,
  getPlanPriceInfo,
  hasAvailableCredits,
  isFilterLocked,
  isPaidPlan,
  isPatternLocked,
  isTemplateLocked,
  normalizeMonthlyPlanState
} from './subscription.ts';
import { FILTER_OPTIONS, FRAME_PATTERN_OPTIONS, PHOTO_TEMPLATES } from '../data/mockData.ts';

test('free plan starts with 20 credits, no forced watermark, and zip disabled', () => {
  const freeState = createInitialFreePlanState(new Date('2026-11-13T10:00:00Z'));
  assert.equal(freeState.plan, 'free');
  assert.equal(freeState.creditsTotal, FREE_MONTHLY_CREDITS);
  assert.equal(freeState.creditsRemaining, 20);
  assert.equal(freeState.cycleKey, '2026-11');

  const meta = getPlanMeta('free');
  assert.equal(meta.hasWatermark, false);
  assert.equal(meta.allowZipExport, false);
  assert.equal(meta.shortDpi, '72 DPI');
  assert.equal(isPaidPlan('free'), false);
});

test('paid plans keep watermark-free exports, unlock ZIP, and differentiate Studio 600 DPI scale', () => {
  for (const tier of ['weekend', 'creator', 'studio'] as const) {
    const meta = getPlanMeta(tier);
    assert.equal(isPaidPlan(tier), true);
    assert.equal(meta.hasWatermark, false);
    assert.equal(meta.allowZipExport, true);
    assert.equal(meta.exportScale, tier === 'studio' ? 1.5 : 1);
    assert.equal(meta.shortDpi, tier === 'studio' ? '600 DPI' : '300 DPI');
  }
});

test('getPlanPriceInfo and generateUpgradeReferenceCode compute valid IDR totals and rule-safe codes', () => {
  const weekend = getPlanPriceInfo('weekend', 'yearly');
  assert.equal(weekend.billingCycle, 'once');
  assert.equal(weekend.amountIdr, 5000);

  const creatorMonthly = getPlanPriceInfo('creator', 'monthly');
  assert.equal(creatorMonthly.amountIdr, 15000);
  const creatorYearly = getPlanPriceInfo('creator', 'yearly');
  assert.equal(creatorYearly.monthlyEquivalentIdr, 12000);
  assert.equal(creatorYearly.amountIdr, 144000);

  const studioMonthly = getPlanPriceInfo('studio', 'monthly');
  assert.equal(studioMonthly.billingCycle, 'monthly');
  assert.equal(studioMonthly.amountIdr, 15000);
  assert.equal(studioMonthly.monthlyEquivalentIdr, 15000);

  const studioYearly = getPlanPriceInfo('studio', 'yearly');
  assert.equal(studioYearly.monthlyEquivalentIdr, 12000);
  assert.equal(studioYearly.amountIdr, 144000);

  const code = generateUpgradeReferenceCode('studio', new Date('2026-11-14T00:00:00Z'));
  assert.match(code, /^PSR-STD-1114-[A-Z0-9]{4}$/);
  assert.ok(code.length >= 4 && code.length <= 32);
});

test('consumePlanCredit deducts 1 credit until 0 and blocks when exhausted', () => {
  let state = {
    plan: 'free' as const,
    creditsTotal: 20,
    creditsRemaining: 1,
    cycleKey: '2026-11'
  };
  assert.equal(hasAvailableCredits(state), true);

  const first = consumePlanCredit(state);
  assert.equal(first.allowed, true);
  assert.equal(first.nextState.creditsRemaining, 0);
  assert.equal(hasAvailableCredits(first.nextState), false);

  const second = consumePlanCredit(first.nextState);
  assert.equal(second.allowed, false);
  assert.equal(second.nextState.creditsRemaining, 0);
});

test('studio unlimited plan never runs out of credits and survives month rollovers', () => {
  const studio = createPlanStateForTier('studio', '2026-11');
  assert.equal(hasAvailableCredits(studio), true);
  assert.equal(studio.creditsTotal, 999999);
  const res = consumePlanCredit(studio);
  assert.equal(res.allowed, true);
  assert.equal(res.nextState.creditsRemaining, studio.creditsRemaining);

  const rolledOver = normalizeMonthlyPlanState(res.nextState, '2027-01');
  assert.equal(rolledOver.plan, 'studio');
  assert.equal(rolledOver.creditsTotal, 999999);
  assert.equal(rolledOver.creditsRemaining, 999999);
});

test('normalizeMonthlyPlanState resets free monthly credits when month rolls over', () => {
  const exhaustedPrevMonth = {
    plan: 'free' as const,
    creditsTotal: 20,
    creditsRemaining: 0,
    cycleKey: '2026-10'
  };
  const refreshed = normalizeMonthlyPlanState(exhaustedPrevMonth, '2026-11');
  assert.equal(refreshed.creditsRemaining, 20);
  assert.equal(refreshed.cycleKey, '2026-11');
});

test('templates, filters, and frame patterns lock premium items for free users only', () => {
  const lockedTemplates = PHOTO_TEMPLATES.filter((t) => isTemplateLocked(t, 'free'));
  const freeTemplates = PHOTO_TEMPLATES.filter((t) => !isTemplateLocked(t, 'free'));
  assert.ok(lockedTemplates.length >= 6, 'should have locked premium templates');
  assert.ok(freeTemplates.length >= 10, 'should keep free templates accessible');
  assert.equal(PHOTO_TEMPLATES.filter((t) => isTemplateLocked(t, 'creator')).length, 0);

  const lockedFilters = FILTER_OPTIONS.filter((f) => isFilterLocked(f, 'free'));
  assert.ok(lockedFilters.length >= 5, 'should have locked premium filters');
  assert.equal(FILTER_OPTIONS.filter((f) => isFilterLocked(f, 'weekend')).length, 0);

  const lockedPatterns = FRAME_PATTERN_OPTIONS.filter((p) => isPatternLocked(p, 'free'));
  assert.ok(lockedPatterns.length >= 5, 'should have locked premium frame patterns');
  assert.equal(FRAME_PATTERN_OPTIONS.filter((p) => isPatternLocked(p, 'studio')).length, 0);
});
