import React, { useEffect, useState } from 'react';
import { ViewTab } from '../types/photobooth';
import {
  BillingCycle,
  FREE_MONTHLY_CREDITS,
  PlanTier,
  UserPlanState,
  generateUpgradeReferenceCode,
  getPlanMeta,
  getPlanPriceInfo,
  isPaidPlan
} from '../utils/subscription';
import { UpgradeRequestRecord } from '../firebase';

import { POSARA_OFFICIAL_MERCHANT } from '../utils/qris';
import {
  OrderInvoiceData,
  buildOrderInvoiceData,
  generateOrderInvoiceNumber
} from '../utils/invoice';
import { TransactionFlowBlueprint } from './TransactionFlowBlueprint';
import { OrderInvoiceModal } from './OrderInvoiceModal';

interface DynamicQrisResponse {
  configured: boolean;
  tier?: string;
  billingCycle?: string;
  amountIdr?: number;
  referenceCode?: string;
  merchantName?: string;
  merchantCity?: string;
  nmid?: string;
  acquirerDomain?: string;
  qrDataUrl?: string;
  message?: string;
  error?: string;
}

interface SubscriptionViewProps {
  userPlan: UserPlanState;
  isOwnerAuthenticated: boolean;
  isComplimentaryVip?: boolean;
  previewPlanOverride: PlanTier | null;
  onSetPreviewPlanOverride: (tier: PlanTier | null) => void;
  userEmail: string | null;
  userDisplayName: string | null;
  isSignedIn: boolean;
  userRequests: UpgradeRequestRecord[];
  publicQrisMerchantString?: string;
  onSignInVisitor: () => Promise<void>;
  onSignOutVisitor: () => Promise<void>;
  onSubmitUpgradeRequest: (payload: {
    requestedPlan: Exclude<PlanTier, 'free'>;
    billingCycle: BillingCycle;
    amountIdr: number;
    invoiceNumber: string;
    referenceCode: string;
    paymentNote: string;
  }) => Promise<void>;
  onNavigate: (tab: ViewTab) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  userPlan,
  isOwnerAuthenticated,
  isComplimentaryVip = false,
  previewPlanOverride,
  onSetPreviewPlanOverride,
  userEmail,
  userDisplayName,
  isSignedIn,
  userRequests,
  publicQrisMerchantString,
  onSignInVisitor,
  onSignOutVisitor,
  onSubmitUpgradeRequest,
  onNavigate
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [modalAuthError, setModalAuthError] = useState<string | null>(null);

  // Interactive Checkout Modal State
  const [checkoutTier, setCheckoutTier] = useState<Exclude<PlanTier, 'free'> | null>(null);
  const [checkoutInvoiceNo, setCheckoutInvoiceNo] = useState<string>('');
  const [checkoutRefCode, setCheckoutRefCode] = useState<string>('');
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('');
  const [transferConfirmed, setTransferConfirmed] = useState<boolean>(false);
  const [showStaticQrisCard, setShowStaticQrisCard] = useState<boolean>(false);
  const [submittingUpgrade, setSubmittingUpgrade] = useState<boolean>(false);
  const [qrisLoading, setQrisLoading] = useState<boolean>(false);
  const [qrisResponse, setQrisResponse] = useState<DynamicQrisResponse | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderInvoiceData | null>(null);

  const pendingUpgradeRequest = userRequests.find((r) => r.status === 'pending') || null;

  useEffect(() => {
    if (!checkoutTier || !checkoutRefCode) {
      setQrisResponse(null);
      setQrisLoading(false);
      return;
    }

    const priceInfo = getPlanPriceInfo(checkoutTier, billingCycle);
    const controller = new AbortController();
    setQrisLoading(true);

    fetch('/api/qris/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tier: checkoutTier,
        billingCycle: priceInfo.billingCycle,
        referenceCode: checkoutRefCode,
        merchantQrisString: publicQrisMerchantString || ''
      })
    })
      .then(async (res) => {
        const data = (await res.json()) as DynamicQrisResponse;
        setQrisResponse(data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setQrisResponse({
          configured: false,
          message: 'Tidak dapat memuat QRIS otomatis. Gunakan konfirmasi manual di bawah.'
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setQrisLoading(false);
        }
      });

    return () => controller.abort();
  }, [checkoutTier, billingCycle, checkoutRefCode, publicQrisMerchantString]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const planMeta = getPlanMeta(userPlan.plan);
  const isPaid = isPaidPlan(userPlan.plan);
  const isUnlimited = planMeta.isUnlimited;

  const pctRemaining = isUnlimited
    ? 1
    : userPlan.creditsTotal > 0
    ? Math.max(0, Math.min(1, userPlan.creditsRemaining / userPlan.creditsTotal))
    : 0;
  const circumference = 301.59;
  const dashOffset = circumference * (1 - pctRemaining);

  const creatorPrice = getPlanPriceInfo('creator', billingCycle);
  const studioPrice = getPlanPriceInfo('studio', billingCycle);

  const creatorPriceLabel = `Rp ${creatorPrice.monthlyEquivalentIdr.toLocaleString('id-ID')}`;
  const studioPriceLabel = `Rp ${studioPrice.monthlyEquivalentIdr.toLocaleString('id-ID')}`;

  const handleOpenUpgradeCheckout = (tier: Exclude<PlanTier, 'free'>) => {
    setCheckoutTier(tier);
    setCheckoutInvoiceNo(generateOrderInvoiceNumber(tier));
    setCheckoutRefCode(generateUpgradeReferenceCode(tier));
    setPaymentNoteInput('');
    setTransferConfirmed(false);
    setShowStaticQrisCard(false);
    setModalAuthError(null);
  };

  const handlePrimaryPlanAction = () => {
    if (isPaid) {
      const target = document.getElementById('pilihan-paket');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    handleOpenUpgradeCheckout('creator');
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setModalAuthError(null);
    try {
      await onSignInVisitor();
      showToast('Akun Google terhubung! Kuota & status paket tersinkron ke cloud.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        return;
      }
      let friendlyMsg = 'Gagal masuk dengan akun Google. Silakan coba lagi.';
      if (msg.includes('popup-blocked')) {
        friendlyMsg = 'Popup login Google diblokir browser. Izinkan popup lalu coba lagi.';
      } else if (msg.includes('unauthorized-domain')) {
        friendlyMsg = 'Domain ini belum diizinkan di Firebase Auth Authorized Domains.';
      }
      if (checkoutTier) {
        setModalAuthError(friendlyMsg);
      }
      showToast(friendlyMsg);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleLogout = async () => {
    setAuthBusy(true);
    try {
      await onSignOutVisitor();
      showToast('Berhasil keluar dari akun. Beralih ke sesi tamu lokal.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTier || !isSignedIn) return;
    if (pendingUpgradeRequest) {
      showToast(
        `Pengajuan ${pendingUpgradeRequest.referenceCode} masih menunggu verifikasi Owner.`
      );
      return;
    }
    const cleanNote = paymentNoteInput.trim();
    if (cleanNote.length < 4) {
      showToast('Isi nama pengirim & e-wallet/bank (min. 4 karakter) untuk pencocokan mutasi.');
      return;
    }
    if (!transferConfirmed) {
      showToast('Centang konfirmasi transfer terlebih dahulu sebelum mengirim.');
      return;
    }
    const priceInfo = getPlanPriceInfo(checkoutTier, billingCycle);
    setSubmittingUpgrade(true);
    try {
      await onSubmitUpgradeRequest({
        requestedPlan: checkoutTier,
        billingCycle: priceInfo.billingCycle,
        amountIdr: priceInfo.amountIdr,
        invoiceNumber: checkoutInvoiceNo,
        referenceCode: checkoutRefCode,
        paymentNote: cleanNote
      });
      setCheckoutTier(null);
      setPaymentNoteInput('');
      setTransferConfirmed(false);
      showToast(
        `Invoice ${checkoutInvoiceNo} untuk ${priceInfo.label} (${checkoutRefCode}) terkirim ke Owner untuk verifikasi mutasi!`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        showToast('Tunggu 60 detik sebelum mengirim konfirmasi baru.');
      } else {
        showToast('Gagal mengirim permintaan upgrade. Pastikan koneksi stabil lalu coba lagi.');
      }
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const activeCheckoutPrice = checkoutTier ? getPlanPriceInfo(checkoutTier, billingCycle) : null;

  return (
    <div className="flex flex-col w-full pb-32 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="w-full max-w-xl mx-auto flex flex-col">
      {/* 1. Header & Context Intro */}
      <div className="pt-2 pb-3 flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold w-fit">
          <span
            className="material-symbols-outlined text-[15px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            stars
          </span>
          <span>POSARA Membership & Kuota</span>
        </div>
        <h1 className="font-headline text-[26px] font-black text-[#001632] tracking-tight leading-tight mt-1">
          Langganan & Kuota Foto
        </h1>
        <p className="text-[13px] text-[#516070] leading-relaxed">
          Kelola akun, pantau kuota unduhan, buka template & filter bertanda gembok, serta akses resolusi cetak HD.
        </p>
      </div>

      {/* Visitor Cloud Account Card */}
      <div className="my-2 p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#f0f3ff] text-[#142b4a] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">
              {isSignedIn ? 'verified_user' : 'account_circle'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#001632] truncate">
              {isSignedIn ? userDisplayName || 'Pengguna POSARA' : 'Tamu Browser Lokal'}
            </p>
            <p className="text-[11px] text-[#516070] leading-snug">
              {isSignedIn
                ? `${userEmail} · ${
                    isComplimentaryVip
                      ? 'Studio Pro Gratis Selamanya (Tanpa Tagihan Bulanan)'
                      : 'Sinkron Cloud Aktif'
                  }`
                : 'Masuk Google agar paket & riwayat tersinkronisasi.'}
            </p>
          </div>
        </div>
        {isSignedIn ? (
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleLogout}
            className="shrink-0 px-3 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11.5px] font-bold cursor-pointer disabled:opacity-60"
          >
            {authBusy ? 'Proses...' : 'Keluar'}
          </button>
        ) : (
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleLogin}
            data-testid="visitor-google-signin-btn"
            className="shrink-0 px-3.5 py-2 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[11.5px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            <span>{authBusy ? 'Membuka...' : 'Masuk Google'}</span>
          </button>
        )}
      </div>

      {/* Owner-only Preview Switcher Banner */}
      {isOwnerAuthenticated && (
        <div className="my-2 p-3.5 rounded-2xl bg-[#f0f3ff] border border-[#d5e4f8] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#142b4a] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Simulasi Tampilan Owner</span>
            </span>
            <span className="text-[10px] font-mono text-[#516070]">
              Aktif: {previewPlanOverride ? previewPlanOverride.toUpperCase() : 'BAWAAN'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: null, label: 'Bawaan' },
                { id: 'free', label: 'Free' },
                { id: 'creator', label: 'Creator' },
                { id: 'studio', label: 'Studio' }
              ] as const
            ).map((item) => {
              const active = previewPlanOverride === item.id;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSetPreviewPlanOverride(item.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#142b4a] text-white'
                      : 'bg-white text-[#142b4a] border border-[#e2e8f0] hover:bg-[#d5e4f8]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Toast Feedback */}
      {toastMessage && (
        <div className="my-2 px-4 py-2.5 rounded-2xl bg-[#142b4a] text-white text-[12px] font-bold flex items-center justify-between shadow-md">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 2. Active Plan & Real Credits Donut Card */}
      <div className="bg-[#ffffff] rounded-3xl p-5 border border-[#e2e8f0] shadow-sm space-y-4 my-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#f0f3ff]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#516070] bg-[#f0f3ff] px-2.5 py-1 rounded-full">
            <span
              className={`w-2 h-2 rounded-full ${
                isPaid ? 'bg-emerald-500' : userPlan.creditsRemaining > 0 ? 'bg-[#142b4a]' : 'bg-red-500'
              }`}
            ></span>
            Paket Saat Ini
          </span>
          <span className="text-[13px] font-headline font-bold text-[#142b4a]">{planMeta.label}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* SVG Donut Progress Indicator */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" fill="none" r="48" stroke="#E7EEFF" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="#142B4A"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                data-testid="subscription-credits-remaining"
                className="font-headline text-[24px] font-black text-[#001632] leading-none tabular-nums"
              >
                {isUnlimited ? '∞' : userPlan.creditsRemaining}
              </span>
              <span className="text-[10px] font-semibold text-[#516070] mt-0.5 tabular-nums">
                {isUnlimited ? 'Unlimited cr' : `dari ${userPlan.creditsTotal} cr`}
              </span>
            </div>
          </div>

          <div className="flex flex-col text-center sm:text-left space-y-1.5">
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
              <span className="font-headline text-[20px] font-black text-[#001632]">
                {planMeta.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6dffb] text-[#171328] font-bold">
                {isComplimentaryVip && !previewPlanOverride ? 'Gratis Selamanya' : planMeta.badge}
              </span>
            </div>
            <p className="text-[12px] text-[#516070] leading-snug">
              {isPaid
                ? isUnlimited
                  ? 'Semua template, filter, ekspor ZIP, branding event kustom, dan unduhan studio 600 DPI aktif tanpa batas kuota.'
                  : `Tersisa ${userPlan.creditsRemaining} dari ${userPlan.creditsTotal} kredit HD ${planMeta.shortDpi} untuk periode ${userPlan.cycleKey}.`
                : `Tersisa ${userPlan.creditsRemaining} dari ${FREE_MONTHLY_CREDITS} kredit gratis periode ${userPlan.cycleKey}. Hasil foto tetap bersih tanpa watermark; sebagian template & filter premium terkunci.`}
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5 justify-center sm:justify-start">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dee9ff] text-[#142b4a]">
                {isPaid ? 'Semua Template Terbuka' : 'Bebas Watermark'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dee9ff] text-[#142b4a]">
                {isPaid ? `Cetak HD ${planMeta.shortDpi}` : '72 DPI Web'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dee9ff] text-[#142b4a]">
                {planMeta.allowZipExport ? 'ZIP Terbuka' : 'ZIP Terkunci 🔒'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#f0f3ff] rounded-2xl p-3 space-y-1 border border-[#e2e8f0]/60">
          <div className="flex items-center justify-between text-[12px] text-[#516070]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#142b4a]">calendar_month</span>
              <span>Siklus Kuota: <strong>{userPlan.cycleKey}</strong></span>
            </span>
            <span className="text-[11px] font-mono text-[#142b4a]">
              {userEmail || 'Sesi Lokal'}
            </span>
          </div>
          <p className="text-[11px] text-[#516070]">
            {isPaid
              ? 'Seluruh 22 template, 17 filter, 20 motif frame, dan ekspor Foto ZIP sudah terbuka.'
              : 'Kuota akun Free diperbarui otomatis menjadi 20 kredit setiap pergantian bulan.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onNavigate('pilih-template')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dee9ff] text-[#142b4a] text-[12px] font-bold active:translate-y-[1px] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">style</span>
            <span>Lihat Template</span>
          </button>
          <button
            type="button"
            onClick={handlePrimaryPlanAction}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[12px] font-bold shadow-xs active:translate-y-[1px] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">upgrade</span>
            <span>{isPaid ? 'Kelola Paket' : 'Upgrade Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* 3. Clear Comparison: Free vs Berlangganan */}
      <div className="bg-[#ffffff] rounded-3xl p-5 border border-[#e2e8f0] shadow-sm space-y-3 my-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-[16px] font-bold text-[#001632]">
              Perbedaan Free vs Berlangganan
            </h2>
            <p className="text-[11px] text-[#516070]">
              Manfaat nyata yang langsung aktif begitu paket ditingkatkan
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6dffb] text-[#171328]">
            Mulai Rp 5.000
          </span>
        </div>

        <div className="grid grid-cols-3 text-[11px] font-bold text-[#516070] pb-1.5 border-b border-[#e2e8f0]">
          <span>Fitur Utama</span>
          <span className="text-center">Free (Rp 0)</span>
          <span className="text-right text-[#142b4a]">Berlangganan</span>
        </div>

        <div className="space-y-2 text-[12px]">
          {[
            { label: 'Kuota Unduhan / Bln', free: '20 kredit/bln', pro: '50 – Unlimited' },
            { label: 'Template, Filter & Motif', free: 'Sebagian Gembok 🔒', pro: 'Semua Terbuka' },
            { label: 'Ekspor Foto ZIP Satuan', free: 'Terkunci 🔒', pro: 'Tersedia Penuh' },
            { label: 'Resolusi File Unduhan', free: '72 DPI Web', pro: '300 – 600 DPI HD' },
            { label: 'Tampilan Foto Strip', free: 'Bersih (Tanpa WM)', pro: 'Bersih + Custom Event' }
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 items-center py-1.5 border-b border-[#f0f3ff] last:border-none"
            >
              <span className="font-semibold text-[#001632] pr-1">{row.label}</span>
              <span className="text-center text-[#74777e] text-[11px]">{row.free}</span>
              <span className="text-right font-bold text-[#142b4a] text-[11px]">{row.pro}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Subscription Tier Cards */}
      <div id="pilihan-paket" className="space-y-3 my-2 scroll-mt-20">
        <div className="text-center sm:text-left">
          <h2 className="font-headline text-[18px] font-bold text-[#001632]">
            Pilihan Paket POSARA
          </h2>
          <p className="text-[12px] text-[#516070]">
            Pilih paket sesuai frekuensi memotret atau kebutuhan event
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center p-1 bg-[#f0f3ff] rounded-full max-w-xs mx-auto border border-[#e2e8f0]">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-1.5 px-3 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white text-[#142b4a] shadow-xs'
                : 'text-[#516070] hover:text-[#001632]'
            }`}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`flex-1 py-1.5 px-3 rounded-full text-[12px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-white text-[#142b4a] shadow-xs'
                : 'text-[#516070] hover:text-[#001632]'
            }`}
          >
            <span>Tahunan</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#e6dffb] text-[#171328] font-bold">
              Hemat 20%
            </span>
          </button>
        </div>

        {/* Tier Cards Stack */}
        <div className="space-y-3">
          {/* Free Tier */}
          <div
            className={`bg-[#ffffff] rounded-2xl p-4 space-y-2 ${
              userPlan.plan === 'free' ? 'border-2 border-[#142b4a] shadow-sm' : 'border border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-headline text-[15px] font-bold text-[#001632]">Gratis / Free</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  userPlan.plan === 'free'
                    ? 'bg-[#d5e4f8] text-[#142b4a]'
                    : 'bg-[#f0f3ff] text-[#516070]'
                }`}
              >
                {userPlan.plan === 'free' ? 'Paket Aktif' : 'Dasar'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-[22px] font-black text-[#001632]">Rp 0</span>
              <span className="text-[12px] text-[#516070]">/bulan</span>
            </div>
            <ul className="space-y-1.5 py-1 text-[12px] text-[#516070]">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>20 kredit unduhan per bulan (reset tiap bulan)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Sebagian template viral, filter & ekspor ZIP terkunci</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Hasil foto bersih tanpa watermark (72 DPI Web)</span>
              </li>
            </ul>
          </div>

          {/* Weekend Pass */}
          <div
            className={`bg-[#ffffff] rounded-2xl p-4 space-y-2 ${
              userPlan.plan === 'weekend'
                ? 'border-2 border-[#142b4a] shadow-md'
                : 'border border-[#e2e8f0] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline text-[15px] font-bold text-[#001632]">
                  Weekend Pass (Sachet)
                </span>
                {userPlan.plan === 'weekend' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                    Aktif
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Sekali Bayar
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-[22px] font-black text-[#001632]">Rp 5.000</span>
              <span className="text-[12px] text-[#516070]">/paket</span>
            </div>
            <ul className="space-y-1.5 py-1 text-[12px] text-[#001632]">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">check_circle</span>
                <span><strong>50 kredit unduhan HD 300 DPI</strong> super tajam</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">check_circle</span>
                <span>Semua gembok template, filter & Foto ZIP terbuka</span>
              </li>
            </ul>
            <button
              type="button"
              disabled={
                userPlan.plan === 'weekend' ||
                (isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio')
              }
              onClick={() => handleOpenUpgradeCheckout('weekend')}
              className={`w-full py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 ${
                userPlan.plan === 'weekend' ||
                (isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio')
                  ? 'bg-[#dee9ff] text-[#142b4a] cursor-default'
                  : 'bg-[#f0f3ff] hover:bg-[#dee9ff] text-[#142b4a] cursor-pointer'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">local_activity</span>
              <span>
                {userPlan.plan === 'weekend'
                  ? 'Sedang Aktif'
                  : isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio'
                  ? 'Termasuk di Studio Pro Gratis'
                  : 'Pilih Weekend Pass (QRIS Rp 5.000)'}
              </span>
            </button>
          </div>

          {/* Creator Pass */}
          <div
            className={`rounded-2xl p-4 space-y-2 bg-gradient-to-b from-white to-[#f0f3ff] ${
              userPlan.plan === 'creator'
                ? 'border-2 border-[#142b4a] shadow-md'
                : 'border border-[#e2e8f0] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline text-[16px] font-black text-[#001632]">
                  Creator Pass
                </span>
                {userPlan.plan === 'creator' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                    Aktif
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6dffb] text-[#171328]">
                Paling Populer
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-[24px] font-black text-[#001632]">
                {creatorPriceLabel}
              </span>
              <span className="text-[12px] text-[#516070]">
                {billingCycle === 'yearly' ? '/bln (tahunan)' : '/bulan'}
              </span>
            </div>
            <ul className="space-y-1.5 py-1 text-[12px] text-[#001632]">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">check_circle</span>
                <span><strong>500 kredit</strong> cetak HD 300 DPI siap cetak</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">check_circle</span>
                <span>Akses penuh seluruh 22 template, 17 filter, 20 motif & ZIP</span>
              </li>
            </ul>
            <button
              type="button"
              disabled={
                userPlan.plan === 'creator' ||
                (isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio')
              }
              onClick={() => handleOpenUpgradeCheckout('creator')}
              className={`w-full py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 ${
                userPlan.plan === 'creator' ||
                (isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio')
                  ? 'bg-[#dee9ff] text-[#142b4a] cursor-default'
                  : 'bg-[#142b4a] hover:bg-[#001632] text-white cursor-pointer'
              }`}
            >
              <span>
                {userPlan.plan === 'creator'
                  ? 'Paket Saat Ini'
                  : isComplimentaryVip && !previewPlanOverride && userPlan.plan === 'studio'
                  ? 'Termasuk di Studio Pro Gratis'
                  : 'Pilih Creator Pass'}
              </span>
            </button>
          </div>

          {/* Studio Pro */}
          <div
            className={`rounded-2xl p-4 space-y-2 bg-gradient-to-br from-white to-[#d5e4f8]/30 ${
              userPlan.plan === 'studio'
                ? 'border-2 border-[#142b4a] shadow-md'
                : 'border border-[#e2e8f0] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline text-[15px] font-bold text-[#001632]">
                  Studio Pro / Unlimited
                </span>
                {userPlan.plan === 'studio' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                    Aktif
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#142b4a] text-white">
                Unlimited
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-[22px] font-black text-[#001632]">
                {studioPriceLabel}
              </span>
              <span className="text-[12px] text-[#516070]">
                {billingCycle === 'yearly' ? '/bln (tahunan)' : '/bulan'}
              </span>
            </div>
            <ul className="space-y-1.5 py-1 text-[12px] text-[#001632]">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">all_inclusive</span>
                <span><strong>Kredit Sesi Tanpa Batas (Unlimited)</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#142b4a]">check_circle</span>
                <span>Custom branding event & hasil studio hingga 600 DPI</span>
              </li>
            </ul>
            <button
              type="button"
              disabled={userPlan.plan === 'studio'}
              onClick={() => handleOpenUpgradeCheckout('studio')}
              className={`w-full py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                userPlan.plan === 'studio'
                  ? 'bg-[#dee9ff] text-[#142b4a] cursor-default'
                  : 'bg-[#142b4a] hover:bg-[#001632] text-white shadow-sm cursor-pointer'
              }`}
            >
              <span>
                {userPlan.plan === 'studio'
                  ? isComplimentaryVip && !previewPlanOverride
                    ? 'Aktif Gratis Selamanya · Publik Rp 15.000/bln'
                    : 'Paket Saat Ini'
                  : billingCycle === 'yearly'
                  ? 'Pilih Studio Pro (Tahunan)'
                  : 'Pilih Studio Pro (QRIS Rp 15.000/bln)'}
              </span>
              {userPlan.plan !== 'studio' && (
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Payment Channels & Real Upgrade Request History */}
      <div className="bg-[#ffffff] rounded-3xl p-5 border border-[#e2e8f0] shadow-sm space-y-3 my-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-[16px] font-bold text-[#001632]">
              Metode Pembayaran & Riwayat Pengajuan
            </h2>
            <p className="text-[12px] text-[#516070]">
              Mendukung QRIS Nasional, GoPay, Dana & ShopeePay
            </p>
          </div>
          <span className="material-symbols-outlined text-[#516070] text-[22px]">qr_code_2</span>
        </div>

        <div className="p-3 rounded-xl bg-[#f0f3ff] flex items-center justify-between border border-[#e2e8f0]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#142b4a] shadow-xs">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#001632]">
                QRIS Nasional & E-Wallet
              </p>
              <p className="text-[11px] text-[#516070]">
                Aktivasi diverifikasi oleh Owner setelah konfirmasi kode referensi
              </p>
            </div>
          </div>
        </div>

        {userRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] text-center space-y-1">
            <span className="material-symbols-outlined text-[22px] text-[#74777e]">receipt_long</span>
            <p className="text-[12px] font-bold text-[#001632]">
              Belum ada riwayat transaksi langganan
            </p>
            <p className="text-[11px] text-[#516070]">
              Pengajuan upgrade QRIS dan status verifikasinya akan tampil otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-[#001632] truncate">
                      {getPlanMeta(req.requestedPlan).label} · Rp {req.amountIdr.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-[#142b4a] truncate">
                      {req.invoiceNumber}
                    </p>
                    <p className="text-[10.5px] font-mono text-[#516070]">
                      Ref: {req.referenceCode} ({req.billingCycle})
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {req.status === 'approved'
                      ? 'Lunas / Aktif'
                      : req.status === 'rejected'
                      ? 'Ditolak'
                      : 'Menunggu Verifikasi'}
                  </span>
                </div>

                <div className="flex items-center justify-end pt-1 border-t border-[#e2e8f0]/80">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInvoice(
                        buildOrderInvoiceData({
                          invoiceNumber: req.invoiceNumber,
                          referenceCode: req.referenceCode,
                          requestId: req.requestId,
                          createdAtMs: req.createdAtMs,
                          customerName: req.displayName,
                          customerEmail: req.email,
                          requestedPlan: req.requestedPlan,
                          billingCycle: req.billingCycle,
                          amountIdr: req.amountIdr,
                          paymentNote: req.paymentNote,
                          reviewedByEmail: req.reviewedByEmail,
                          status: req.status
                        })
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] hover:bg-[#f0f3ff] text-[#142b4a] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                    <span>Lihat Invoice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* 6. Visual Entity & 7-Stage Transaction Flow Blueprint */}
      <TransactionFlowBlueprint />

      {/* Modal Konfirmasi QRIS & Pengajuan Aktivasi Paket */}
      {checkoutTier && activeCheckoutPrice && (
        <div className="fixed inset-0 z-50 bg-[#001632]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#142b4a] bg-[#d5e4f8] px-2.5 py-0.5 rounded-full">
                  Konfirmasi QRIS POSARA
                </span>
                <h3 id="checkout-modal-title" className="font-headline text-[19px] font-black text-[#001632] mt-1">
                  Aktivasi {activeCheckoutPrice.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutTier(null)}
                aria-label="Tutup modal aktivasi"
                className="w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee9ff] flex items-center justify-center text-[#516070] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0f3ff] border border-[#d5e4f8] space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-[#516070] font-semibold">Total Pembayaran</span>
                <span className="font-headline text-[24px] font-black text-[#001632] tabular-nums">
                  Rp {activeCheckoutPrice.amountIdr.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-[11px] text-[#516070]">{activeCheckoutPrice.billingDescription}</p>
              <div className="pt-1.5 border-t border-[#d5e4f8] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#516070]">No. Order Invoice:</span>
                  <span className="font-mono font-black text-[#142b4a] bg-white px-2 py-0.5 rounded">
                    {checkoutInvoiceNo}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#516070]">Kode Referensi QRIS:</span>
                  <span className="font-mono font-bold text-[#142b4a] bg-white px-2 py-0.5 rounded">
                    {checkoutRefCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedInvoice(
                    buildOrderInvoiceData({
                      invoiceNumber: checkoutInvoiceNo,
                      referenceCode: checkoutRefCode,
                      createdAtMs: Date.now(),
                      customerName: userDisplayName || 'Pelanggan POSARA',
                      customerEmail: userEmail || 'Belum login Google',
                      requestedPlan: checkoutTier,
                      billingCycle: activeCheckoutPrice.billingCycle,
                      amountIdr: activeCheckoutPrice.amountIdr,
                      paymentNote: paymentNoteInput.trim() || 'Menunggu pembayaran QRIS',
                      status: 'unpaid'
                    })
                  )
                }
                className="w-full py-1.5 px-3 rounded-xl bg-white border border-[#d5e4f8] hover:bg-[#e7eeff] text-[#142b4a] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Lihat Preview Invoice</span>
              </button>
            </div>

            {qrisLoading ? (
              <div className="p-5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-center space-y-2">
                <span className="material-symbols-outlined text-[24px] text-[#142b4a] animate-spin">
                  progress_activity
                </span>
                <p className="text-[11.5px] font-semibold text-[#516070]">
                  Menyiapkan QRIS dinamis sesuai nominal paket...
                </p>
              </div>
            ) : qrisResponse?.configured && qrisResponse.qrDataUrl ? (
              <div className="p-4 rounded-2xl bg-white border border-[#d5e4f8] flex flex-col items-center text-center gap-2 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  QRIS Dinamis · Nominal Terkunci
                </span>
                <img
                  src={qrisResponse.qrDataUrl}
                  alt={`QRIS Pembayaran ${activeCheckoutPrice.label}`}
                  className="w-48 h-48 rounded-xl border border-[#e2e8f0]"
                />
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-extrabold text-[#001632]">
                    {qrisResponse.merchantName || POSARA_OFFICIAL_MERCHANT.name}
                  </p>
                  <p className="text-[10.5px] font-mono text-[#142b4a]">
                    NMID: {qrisResponse.nmid || POSARA_OFFICIAL_MERCHANT.nmid} ·{' '}
                    {qrisResponse.merchantCity || POSARA_OFFICIAL_MERCHANT.city}
                  </p>
                  <p className="text-[10.5px] text-[#516070]">
                    Scan via GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Pastikan nama tujuan tampil{' '}
                    <strong>{qrisResponse.merchantName || POSARA_OFFICIAL_MERCHANT.name}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStaticQrisCard((prev) => !prev)}
                  className="text-[11px] font-bold text-[#142b4a] hover:underline cursor-pointer pt-1"
                >
                  {showStaticQrisCard ? 'Sembunyikan Kartu QRIS Resmi' : 'Lihat Kartu QRIS Resmi POSARA'}
                </button>

                {showStaticQrisCard && (
                  <div className="w-full pt-2 border-t border-[#e2e8f0] flex flex-col items-center gap-1.5">
                    <img
                      src="/assets/aistudio/Kode_Qris_POSARA_4126714f.jpeg"
                      alt="Kartu Resmi QRIS POSARA DIGITAL BOOTH"
                      className="w-44 rounded-xl border border-[#e2e8f0] shadow-xs"
                    />
                    <span className="text-[10px] text-[#516070]">
                      Kartu resmi A01 · Isi nominal exact Rp{' '}
                      {activeCheckoutPrice.amountIdr.toLocaleString('id-ID')} jika scan kartu statis.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] text-[11px] text-[#516070] leading-relaxed">
                <p className="font-bold text-[#001632] mb-0.5">QRIS Resmi {POSARA_OFFICIAL_MERCHANT.name}</p>
                <p>
                  {qrisResponse?.error ||
                    qrisResponse?.message ||
                    'Lakukan pembayaran QRIS sesuai nominal di atas, lalu kirim konfirmasi dengan kode referensi transaksi agar Owner segera mengaktifkan paketmu.'}
                </p>
              </div>
            )}

            {!isSignedIn ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-center">
                <p className="text-[12px] font-bold text-amber-950">
                  Masuk dengan Google terlebih dahulu agar paket terikat ke akun pribadimu.
                </p>
                {modalAuthError && (
                  <p className="text-[11px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {modalAuthError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[12px] font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">login</span>
                  <span>{authBusy ? 'Membuka Google Login...' : 'Masuk Google & Lanjutkan'}</span>
                </button>
              </div>
            ) : pendingUpgradeRequest ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-center">
                <p className="text-[12px] font-bold text-amber-950">
                  Kamu masih memiliki pengajuan yang menunggu verifikasi Owner
                </p>
                <p className="text-[11px] text-amber-900 leading-snug">
                  Ref <strong className="font-mono">{pendingUpgradeRequest.referenceCode}</strong> (
                  {getPlanMeta(pendingUpgradeRequest.requestedPlan).label} · Rp{' '}
                  {pendingUpgradeRequest.amountIdr.toLocaleString('id-ID')}) sedang dicek di mutasi QRIS.
                </p>
                <button
                  type="button"
                  onClick={() => setCheckoutTier(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#142b4a] text-white text-[12px] font-bold cursor-pointer"
                >
                  Mengerti, Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitCheckout} className="space-y-3">
                <div className="text-[11.5px] text-[#516070] leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                  <p className="font-bold text-[#001632] mb-1">Langkah Aktivasi Aman:</p>
                  <p>
                    1. Scan QRIS dinamis di atas (tujuan{' '}
                    <strong>{POSARA_OFFICIAL_MERCHANT.name}</strong>) dengan nominal terkunci{' '}
                    <strong>Rp {activeCheckoutPrice.amountIdr.toLocaleString('id-ID')}</strong>.
                  </p>
                  <p>
                    2. Tuliskan nama pengirim & aplikasi bayar agar Owner mencocokkan mutasi untuk akun{' '}
                    <strong>{userEmail}</strong>.
                  </p>
                </div>

                <div>
                  <label htmlFor="upgrade-payment-note" className="block text-[11.5px] font-bold text-[#001632] mb-1">
                    Nama Pengirim, E-Wallet/Bank & Jam Transfer <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="upgrade-payment-note"
                    type="text"
                    required
                    minLength={4}
                    maxLength={160}
                    value={paymentNoteInput}
                    onChange={(e) => setPaymentNoteInput(e.target.value)}
                    placeholder="Contoh: ShopeePay a.n. Siti, jam 19.30"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#001632] focus:outline-none focus:border-[#142b4a]"
                  />
                </div>

                <label className="flex items-start gap-2 text-[11px] text-[#001632] cursor-pointer select-none bg-[#f0f3ff] p-2.5 rounded-xl border border-[#d5e4f8]">
                  <input
                    type="checkbox"
                    checked={transferConfirmed}
                    onChange={(e) => setTransferConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-[#142b4a]"
                  />
                  <span>
                    Saya sudah benar-benar mentransfer{' '}
                    <strong>Rp {activeCheckoutPrice.amountIdr.toLocaleString('id-ID')}</strong> ke{' '}
                    <strong>{POSARA_OFFICIAL_MERCHANT.name}</strong> (Ref{' '}
                    <span className="font-mono font-bold">{checkoutRefCode}</span>).
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCheckoutTier(null)}
                    className="py-2.5 px-3 rounded-xl bg-[#f0f3ff] text-[#516070] font-bold text-[12px] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingUpgrade || !transferConfirmed || paymentNoteInput.trim().length < 4}
                    className="py-2.5 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[12px] shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submittingUpgrade ? 'Mengirim...' : 'Kirim Konfirmasi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Order Invoice Detail Modal */}
      <OrderInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
};
