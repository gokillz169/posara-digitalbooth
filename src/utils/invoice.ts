import { BillingCycle, PlanTier, getPlanMeta, getPlanPriceInfo } from './subscription';
import { POSARA_OFFICIAL_MERCHANT } from './qris';

export type InvoiceStatus = 'unpaid' | 'pending' | 'approved' | 'rejected' | 'paid';

export interface OrderInvoiceData {
  invoiceNumber: string;
  referenceCode: string;
  issuedAtLabel: string;
  customerName: string;
  customerEmail: string;
  planTier: Exclude<PlanTier, 'free'>;
  planLabel: string;
  planBenefitsLabel: string;
  billingCycle: BillingCycle;
  billingLabel: string;
  subtotalIdr: number;
  adminFeeIdr: number;
  totalIdr: number;
  merchantName: string;
  merchantNmid: string;
  paymentMethod: string;
  paymentNote: string;
  reviewedByEmail: string;
  status: InvoiceStatus;
  statusLabel: string;
}

export function generateOrderInvoiceNumber(
  tier: Exclude<PlanTier, 'free'>,
  date: Date = new Date()
): string {
  const code = tier === 'weekend' ? 'WKD' : tier === 'studio' ? 'STD' : 'CRT';
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand = Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, '7');
  return `INV-${code}-${yy}${mm}${dd}-${rand}`;
}

export function deriveFallbackInvoiceNumber(referenceCode: string, requestId: string): string {
  const cleanRef = referenceCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (cleanRef.startsWith('PSR-')) {
    return `INV-${cleanRef.slice(4)}`.slice(0, 32);
  }
  if (cleanRef.length >= 4) {
    return `INV-${cleanRef}`.slice(0, 32);
  }
  const cleanId = requestId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8) || 'POSARA';
  return `INV-PSR-${cleanId}`.slice(0, 32);
}

export function formatInvoiceTimestampWib(timestampMs: number): string {
  const date = new Date(timestampMs);
  const parts = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).formatToParts(date);

  const map = new Map(parts.map((p) => [p.type, p.value]));
  const day = map.get('day') || '01';
  const month = map.get('month') || 'Jan';
  const year = map.get('year') || '2026';
  const hour = map.get('hour') || '00';
  const minute = map.get('minute') || '00';
  return `${day} ${month} ${year} · ${hour}:${minute} WIB`;
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'LUNAS · PAKET AKTIF';
    case 'rejected':
      return 'DITOLAK';
    case 'pending':
      return 'MENUNGGU VERIFIKASI MUTASI';
    default:
      return 'MENUNGGU PEMBAYARAN QRIS';
  }
}

export function buildOrderInvoiceData(params: {
  invoiceNumber?: string;
  referenceCode: string;
  requestId?: string;
  createdAtMs: number;
  customerName: string;
  customerEmail: string;
  requestedPlan: Exclude<PlanTier, 'free'>;
  billingCycle: BillingCycle;
  amountIdr: number;
  paymentNote?: string;
  reviewedByEmail?: string;
  status: InvoiceStatus;
}): OrderInvoiceData {
  const meta = getPlanMeta(params.requestedPlan);
  const priceInfo = getPlanPriceInfo(
    params.requestedPlan,
    params.billingCycle === 'yearly' ? 'yearly' : 'monthly'
  );
  const cleanInvoice =
    params.invoiceNumber && params.invoiceNumber.trim().length >= 6
      ? params.invoiceNumber.trim().toUpperCase()
      : deriveFallbackInvoiceNumber(params.referenceCode, params.requestId || 'POSARA');

  const billingLabel =
    params.billingCycle === 'once'
      ? 'Sekali Bayar (Sachet Pass)'
      : params.billingCycle === 'yearly'
      ? 'Langganan Tahunan (Hemat 20%)'
      : 'Langganan Bulanan';

  const benefitsLabel = meta.isUnlimited
    ? `Kredit Unlimited · ${meta.shortDpi} · Custom Branding & ZIP`
    : `${meta.creditsTotal} Kredit HD · ${meta.shortDpi} · Semua Template & ZIP`;

  const resolvedAmount = Number.isFinite(params.amountIdr) && params.amountIdr > 0
    ? Math.round(params.amountIdr)
    : priceInfo.amountIdr;

  return {
    invoiceNumber: cleanInvoice,
    referenceCode: params.referenceCode,
    issuedAtLabel: formatInvoiceTimestampWib(params.createdAtMs),
    customerName: params.customerName || 'Pengguna POSARA',
    customerEmail: params.customerEmail || '-',
    planTier: params.requestedPlan,
    planLabel: meta.label,
    planBenefitsLabel: benefitsLabel,
    billingCycle: params.billingCycle,
    billingLabel,
    subtotalIdr: resolvedAmount,
    adminFeeIdr: 0,
    totalIdr: resolvedAmount,
    merchantName: POSARA_OFFICIAL_MERCHANT.name,
    merchantNmid: POSARA_OFFICIAL_MERCHANT.nmid,
    paymentMethod: 'QRIS Nasional Dinamis',
    paymentNote: params.paymentNote?.trim() || '-',
    reviewedByEmail: params.reviewedByEmail?.trim() || '',
    status: params.status,
    statusLabel: getInvoiceStatusLabel(params.status)
  };
}

export function formatInvoiceSummaryText(invoice: OrderInvoiceData): string {
  return [
    `ORDER INVOICE — ${invoice.merchantName}`,
    `No. Invoice : ${invoice.invoiceNumber}`,
    `Kode Ref QR : ${invoice.referenceCode}`,
    `Tanggal     : ${invoice.issuedAtLabel}`,
    `Status      : ${invoice.statusLabel}`,
    `Pelanggan   : ${invoice.customerName} (${invoice.customerEmail})`,
    `Paket       : ${invoice.planLabel} (${invoice.billingLabel})`,
    `Manfaat     : ${invoice.planBenefitsLabel}`,
    `Metode      : ${invoice.paymentMethod} · NMID ${invoice.merchantNmid}`,
    `Total Bayar : Rp ${invoice.totalIdr.toLocaleString('id-ID')}`,
    `Catatan     : ${invoice.paymentNote}`
  ].join('\n');
}
