import { supabase } from './supabase';
import type { BoothSettingsData, PublicBoothConfigData } from './utils/adminAccess';
import {
  DEFAULT_KIOSK_PIN,
  INITIAL_BOOTH_SETTINGS,
  INITIAL_PUBLIC_BOOTH_CONFIG,
  OWNER_EMAIL,
  isAuthorizedAdminEmail,
  isComplimentaryStudioEmail,
  normalizeQrisMerchantString,
  normalizeWatermarkText
} from './utils/adminAccess';
import type { BillingCycle, PlanTier, UserPlanState } from './utils/subscription';
import {
  FREE_MONTHLY_CREDITS,
  createInitialFreePlanState,
  createPlanStateForTier,
  getCurrentCycleKey,
  normalizeMonthlyPlanState
} from './utils/subscription';
import { deriveFallbackInvoiceNumber, generateOrderInvoiceNumber } from './utils/invoice';

export type UpgradeRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface UpgradeRequestRecord {
  requestId: string;
  uid: string;
  email: string;
  displayName: string;
  requestedPlan: Exclude<PlanTier, 'free'>;
  billingCycle: BillingCycle;
  amountIdr: number;
  referenceCode: string;
  invoiceNumber: string;
  paymentNote: string;
  status: UpgradeRequestStatus;
  reviewedByEmail: string;
  createdAtMs: number;
}

export interface AppUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export function mapSupabaseUser(rawUser: any): AppUser | null {
  if (!rawUser) return null;
  return {
    uid: rawUser.id,
    id: rawUser.id,
    email: rawUser.email || null,
    displayName:
      rawUser.user_metadata?.full_name ||
      rawUser.user_metadata?.name ||
      rawUser.email?.split('@')[0] ||
      'Pengguna POSARA',
    photoURL: rawUser.user_metadata?.avatar_url || null,
    emailVerified: Boolean(rawUser.email_confirmed_at || rawUser.email)
  };
}

// ==============================================================================
// AUTHENTICATION (SUPABASE AUTH)
// ==============================================================================

export function onSupabaseAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  const client = supabase;
  if (!client) {
    callback(null);
    return () => {};
  }

  void client.auth.getUser().then(({ data }) => {
    callback(mapSupabaseUser(data.user));
  });

  const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
    callback(mapSupabaseUser(session?.user || null));
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

export async function signInWithGoogleSupabase(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client belum terkonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }

  // Keep callback on current app route. This must also exist in Supabase
  // Dashboard > Authentication > URL Configuration > Redirect URLs.
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });

  if (error) {
    const errorMessage = `${error.message || ''} ${error.code || ''}`.toLowerCase();
    if (
      errorMessage.includes('unsupported provider') ||
      errorMessage.includes('provider is not enabled') ||
      errorMessage.includes('google provider')
    ) {
      throw new Error(
        'Login Google belum aktif. Aktifkan Google di Supabase Authentication > Providers, lalu isi Client ID dan Client Secret.'
      );
    }
    if (errorMessage.includes('redirect') || errorMessage.includes('url not allowed')) {
      throw new Error(
        `URL callback belum diizinkan Supabase: ${redirectTo}. Tambahkan URL ini di Authentication > URL Configuration > Redirect URLs.`
      );
    }
    throw error;
  }
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ==============================================================================
// BOOTH SETTINGS (KIOSK & WATERMARK)
// ==============================================================================

export async function loadBoothSettingsSupabase(): Promise<{ settings: BoothSettingsData; exists: boolean }> {
  if (!supabase) {
    return { settings: INITIAL_BOOTH_SETTINGS, exists: false };
  }

  try {
    const { data, error } = await supabase
      .from('booth_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error || !data) {
      return { settings: INITIAL_BOOTH_SETTINGS, exists: false };
    }

    return {
      exists: true,
      settings: {
        autoResetEnabled: Boolean(data.auto_reset_enabled),
        customWatermarkEnabled: Boolean(data.custom_watermark_enabled),
        watermarkText: normalizeWatermarkText(data.watermark_text || ''),
        kioskPin: data.kiosk_pin || DEFAULT_KIOSK_PIN,
        qrisMerchantString: normalizeQrisMerchantString(data.qris_merchant_string || '')
      }
    };
  } catch (err) {
    console.warn('Fallback loadBoothSettings:', err);
    return { settings: INITIAL_BOOTH_SETTINGS, exists: false };
  }
}

export async function saveBoothSettingsSupabase(settings: BoothSettingsData): Promise<void> {
  if (!supabase) return;

  const safeWatermark = normalizeWatermarkText(settings.watermarkText || '');
  const safeQris = normalizeQrisMerchantString(settings.qrisMerchantString || '');

  const { error } = await supabase.from('booth_settings').upsert({
    id: 'main',
    auto_reset_enabled: Boolean(settings.autoResetEnabled),
    custom_watermark_enabled: Boolean(settings.customWatermarkEnabled),
    watermark_text: safeWatermark,
    kiosk_pin: settings.kioskPin.trim() || DEFAULT_KIOSK_PIN,
    qris_merchant_string: safeQris,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
}

export function subscribePublicBoothConfigSupabase(
  onUpdate: (config: PublicBoothConfigData) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  // Initial fetch
  void loadBoothSettingsSupabase().then((res) => {
    onUpdate({
      autoResetEnabled: res.settings.autoResetEnabled,
      customWatermarkEnabled: res.settings.customWatermarkEnabled,
      watermarkText: res.settings.watermarkText,
      qrisMerchantString: res.settings.qrisMerchantString || ''
    });
  });

  // Realtime subscription
  const channel = client
    .channel('public_booth_config_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'booth_settings', filter: 'id=eq.main' },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row) {
          onUpdate({
            autoResetEnabled: Boolean(row.auto_reset_enabled),
            customWatermarkEnabled: Boolean(row.custom_watermark_enabled),
            watermarkText: normalizeWatermarkText((row.watermark_text as string) || ''),
            qrisMerchantString: normalizeQrisMerchantString((row.qris_merchant_string as string) || '')
          });
        }
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ==============================================================================
// USER PLANS & CREDITS (SUPABASE)
// ==============================================================================

export async function loadOrCreateUserPlanSupabase(
  userId: string,
  email: string
): Promise<UserPlanState> {
  if (!supabase || !userId) {
    return createInitialFreePlanState();
  }

  const currentCycle = getCurrentCycleKey();
  const isVip = isComplimentaryStudioEmail(email, true);

  if (isVip) {
    return createPlanStateForTier('studio', currentCycle);
  }

  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      const initial = createInitialFreePlanState();
      await supabase.from('user_plans').upsert({
        id: userId,
        user_id: userId,
        email,
        plan: initial.plan,
        credits_total: initial.creditsTotal,
        credits_remaining: initial.creditsRemaining,
        cycle_key: currentCycle,
        updated_at: new Date().toISOString()
      });
      return initial;
    }

    const rawPlan: PlanTier =
      data.plan === 'weekend' || data.plan === 'creator' || data.plan === 'studio'
        ? data.plan
        : 'free';

    const loadedState: UserPlanState = {
      plan: rawPlan,
      creditsTotal: typeof data.credits_total === 'number' ? data.credits_total : FREE_MONTHLY_CREDITS,
      creditsRemaining:
        typeof data.credits_remaining === 'number' ? data.credits_remaining : FREE_MONTHLY_CREDITS,
      cycleKey: data.cycle_key || currentCycle
    };

    const normalized = normalizeMonthlyPlanState(loadedState, currentCycle);
    if (normalized.cycleKey !== loadedState.cycleKey) {
      await supabase
        .from('user_plans')
        .update({
          credits_remaining: normalized.creditsRemaining,
          cycle_key: normalized.cycleKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    return normalized;
  } catch (err) {
    console.warn('Fallback loadOrCreateUserPlan:', err);
    return createInitialFreePlanState();
  }
}

export async function persistUserPlanCreditsSupabase(
  userId: string,
  nextState: UserPlanState
): Promise<void> {
  if (!supabase || !userId || nextState.plan === 'studio') {
    return;
  }

  await supabase
    .from('user_plans')
    .update({
      credits_remaining: Math.max(0, Math.floor(nextState.creditsRemaining)),
      cycle_key: nextState.cycleKey || getCurrentCycleKey(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

export function subscribeUserPlanSupabase(
  userId: string,
  onUpdate: (planState: UserPlanState) => void
): () => void {
  const client = supabase;
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`user_plan_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_plans', filter: `id=eq.${userId}` },
      (payload) => {
        const data = payload.new as Record<string, unknown>;
        if (data) {
          const rawPlan: PlanTier =
            data.plan === 'weekend' || data.plan === 'creator' || data.plan === 'studio'
              ? (data.plan as PlanTier)
              : 'free';
          const loadedState: UserPlanState = {
            plan: rawPlan,
            creditsTotal: typeof data.credits_total === 'number' ? data.credits_total : FREE_MONTHLY_CREDITS,
            creditsRemaining:
              typeof data.credits_remaining === 'number' ? data.credits_remaining : FREE_MONTHLY_CREDITS,
            cycleKey: (data.cycle_key as string) || getCurrentCycleKey()
          };
          onUpdate(normalizeMonthlyPlanState(loadedState));
        }
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ==============================================================================
// UPGRADE REQUESTS & TRANSACTIONS (SUPABASE)
// ==============================================================================

export async function submitUpgradeRequestSupabase(payload: {
  uid: string;
  email: string;
  displayName: string;
  requestedPlan: Exclude<PlanTier, 'free'>;
  billingCycle: BillingCycle;
  amountIdr: number;
  referenceCode: string;
  invoiceNumber?: string;
  paymentNote: string;
}): Promise<UpgradeRequestRecord> {
  if (!supabase) throw new Error('Supabase client belum aktif.');

  const requestId = `req_${payload.uid.slice(0, 8)}_${Date.now()}`;
  const rawInv = (payload.invoiceNumber || generateOrderInvoiceNumber(payload.requestedPlan))
    .trim()
    .toUpperCase();
  const safeInvoiceNumber = rawInv.length >= 6 ? rawInv : deriveFallbackInvoiceNumber(payload.referenceCode, requestId);

  const row = {
    request_id: requestId,
    uid: payload.uid,
    email: payload.email,
    display_name: payload.displayName || 'Pengguna POSARA',
    requested_plan: payload.requestedPlan,
    billing_cycle: payload.billingCycle,
    amount_idr: Math.round(payload.amountIdr),
    reference_code: payload.referenceCode,
    invoice_number: safeInvoiceNumber,
    payment_note: payload.paymentNote,
    status: 'pending',
    reviewed_by_email: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('upgrade_requests').insert(row);
  if (error) throw error;

  return {
    requestId,
    uid: payload.uid,
    email: payload.email,
    displayName: row.display_name,
    requestedPlan: payload.requestedPlan,
    billingCycle: payload.billingCycle,
    amountIdr: row.amount_idr,
    referenceCode: payload.referenceCode,
    invoiceNumber: safeInvoiceNumber,
    paymentNote: payload.paymentNote,
    status: 'pending',
    reviewedByEmail: '',
    createdAtMs: Date.now()
  };
}

export async function loadUserUpgradeRequestsSupabase(userId: string): Promise<UpgradeRequestRecord[]> {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('upgrade_requests')
    .select('*')
    .eq('uid', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((d) => ({
    requestId: d.request_id,
    uid: d.uid,
    email: d.email,
    displayName: d.display_name,
    requestedPlan: d.requested_plan,
    billingCycle: d.billing_cycle,
    amountIdr: d.amount_idr,
    referenceCode: d.reference_code,
    invoiceNumber: d.invoice_number,
    paymentNote: d.payment_note || '',
    status: d.status,
    reviewedByEmail: d.reviewed_by_email || '',
    createdAtMs: new Date(d.created_at).getTime()
  }));
}

export async function loadAllUpgradeRequestsForAdminSupabase(): Promise<UpgradeRequestRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('upgrade_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map((d) => ({
    requestId: d.request_id,
    uid: d.uid,
    email: d.email,
    displayName: d.display_name,
    requestedPlan: d.requested_plan,
    billingCycle: d.billing_cycle,
    amountIdr: d.amount_idr,
    referenceCode: d.reference_code,
    invoiceNumber: d.invoice_number,
    paymentNote: d.payment_note || '',
    status: d.status,
    reviewedByEmail: d.reviewed_by_email || '',
    createdAtMs: new Date(d.created_at).getTime()
  }));
}

export async function reviewUpgradeRequestSupabase(
  request: UpgradeRequestRecord,
  decision: 'approved' | 'rejected',
  adminEmail: string
): Promise<void> {
  if (!supabase) return;

  // 1. Update request status
  await supabase
    .from('upgrade_requests')
    .update({
      status: decision,
      reviewed_by_email: adminEmail,
      updated_at: new Date().toISOString()
    })
    .eq('request_id', request.requestId);

  // 2. If approved, upgrade user's plan immediately
  if (decision === 'approved') {
    const nextPlan = createPlanStateForTier(request.requestedPlan, getCurrentCycleKey());
    await supabase.from('user_plans').upsert({
      id: request.uid,
      user_id: request.uid,
      email: request.email,
      plan: nextPlan.plan,
      credits_total: nextPlan.creditsTotal,
      credits_remaining: nextPlan.creditsRemaining,
      cycle_key: nextPlan.cycleKey,
      updated_at: new Date().toISOString()
    });
  }
}

export function subscribeAdminUpgradeRequestsSupabase(
  onUpdate: (requests: UpgradeRequestRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  void loadAllUpgradeRequestsForAdminSupabase().then(onUpdate);

  const channel = client
    .channel('admin_upgrade_requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'upgrade_requests' },
      () => {
        void loadAllUpgradeRequestsForAdminSupabase().then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeUserUpgradeRequestsSupabase(
  userId: string,
  onUpdate: (requests: UpgradeRequestRecord[]) => void
): () => void {
  const client = supabase;
  if (!client || !userId) return () => {};

  void loadUserUpgradeRequestsSupabase(userId).then(onUpdate);

  const channel = client
    .channel(`user_requests_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'upgrade_requests', filter: `uid=eq.${userId}` },
      () => {
        void loadUserUpgradeRequestsSupabase(userId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
