import crypto from 'node:crypto';
import {
  BillingCycle,
  FREE_MONTHLY_CREDITS,
  PLAN_META,
  PlanTier,
  UNLIMITED_CREDITS_SENTINEL,
  createPlanStateForTier,
  getCurrentCycleKey,
  getPlanPriceInfo
} from './subscription';

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  merchantId?: string;
}

export function getMidtransConfig(): MidtransConfig {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || process.env.VITE_MIDTRANS_CLIENT_KEY || '').trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const merchantId = (process.env.MIDTRANS_MERCHANT_ID || '').trim();

  return {
    serverKey,
    clientKey,
    isProduction,
    merchantId
  };
}

export function isMidtransConfigured(): boolean {
  const config = getMidtransConfig();
  return Boolean(config.serverKey && config.serverKey.length > 5);
}

export function getMidtransBaseUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';
}

export function getMidtransApiBaseUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';
}

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  planTier: Exclude<PlanTier, 'free'>;
  billingCycle: BillingCycle;
  customerName: string;
  customerEmail: string;
  appBaseUrl?: string;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

/**
 * Creates a Midtrans Snap transaction for automated checkout (QRIS, GoPay, ShopeePay, VA).
 */
export async function createMidtransSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResult> {
  const config = getMidtransConfig();
  if (!isMidtransConfigured()) {
    throw new Error('Midtrans SERVER_KEY belum dikonfigurasi di environment (.env).');
  }

  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString('base64')}`;
  const snapUrl = `${getMidtransBaseUrl(config.isProduction)}/transactions`;

  const meta = PLAN_META[params.planTier];
  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount)
    },
    item_details: [
      {
        id: params.planTier,
        price: Math.round(params.grossAmount),
        quantity: 1,
        name: `POSARA ${meta.label}`.slice(0, 50)
      }
    ],
    customer_details: {
      first_name: (params.customerName || 'Pelanggan POSARA').slice(0, 50),
      email: params.customerEmail || 'customer@posara.id'
    },
    enabled_payments: [
      'gopay',
      'shopeepay',
      'qris',
      'bca_va',
      'bni_va',
      'bri_va',
      'mandiri_va',
      'permata_va',
      'other_va'
    ],
    callbacks: {
      finish: params.appBaseUrl || 'http://localhost:3000'
    }
  };

  const response = await fetch(snapUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Midtrans Snap Creation Error:', response.status, errorText);
    throw new Error(`Midtrans API Error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { token: string; redirect_url: string };
  return {
    token: data.token,
    redirectUrl: data.redirect_url
  };
}

/**
 * Verifies Midtrans SHA-512 notification signature to block tampering/spoofing.
 * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(body: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}): boolean {
  const config = getMidtransConfig();
  if (!config.serverKey || !body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
    return false;
  }

  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${config.serverKey}`;
  const computedHash = crypto.createHash('sha512').update(raw).digest('hex');

  return computedHash.toLowerCase() === body.signature_key.toLowerCase();
}

/**
 * Computes exact quota credits fulfillment to ensure no existing credits are lost.
 */
export function calculateFulfillmentQuota(
  tier: Exclude<PlanTier, 'free'>,
  currentRemaining: number = 0
): {
  plan: PlanTier;
  creditsTotal: number;
  creditsRemaining: number;
} {
  const meta = PLAN_META[tier];

  if (meta.isUnlimited) {
    return {
      plan: 'studio',
      creditsTotal: UNLIMITED_CREDITS_SENTINEL,
      creditsRemaining: UNLIMITED_CREDITS_SENTINEL
    };
  }

  // Akumulasi kuota agar kuota sisa sebelumnya tidak hangus
  const guaranteedTotal = meta.creditsTotal;
  const nextRemaining = Math.max(guaranteedTotal, currentRemaining + guaranteedTotal);

  return {
    plan: tier,
    creditsTotal: Math.max(guaranteedTotal, nextRemaining),
    creditsRemaining: nextRemaining
  };
}
