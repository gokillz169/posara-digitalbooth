import React, { useState, useEffect } from 'react';
import { ViewTab } from '../types/photobooth';
import {
  BoothSettingsData,
  MAX_QRIS_STRING_LENGTH,
  MAX_WATERMARK_LENGTH,
  isValidKioskPin,
  normalizeQrisMerchantString,
  normalizeWatermarkText
} from '../utils/adminAccess';
import { PlanTier, getPlanMeta } from '../utils/subscription';
import { POSARA_OFFICIAL_MERCHANT } from '../utils/qris';
import { UpgradeRequestRecord } from '../supabaseDb';
import { OrderInvoiceData, buildOrderInvoiceData } from '../utils/invoice';
import { OrderInvoiceModal } from './OrderInvoiceModal';
import { TransactionFlowBlueprint } from './TransactionFlowBlueprint';

interface AdminDashboardProps {
  ownerEmail: string;
  onNavigate: (tab: ViewTab) => void;
  kioskLocked: boolean;
  onSetKioskLocked: (locked: boolean) => void;
  boothSettings: BoothSettingsData;
  isSavingSettings: boolean;
  onUpdateBoothSettings: (next: BoothSettingsData) => Promise<void>;
  onSignOut: () => Promise<void>;
  previewPlanOverride: PlanTier | null;
  onSetPreviewPlanOverride: (tier: PlanTier | null) => void;
  upgradeRequests: UpgradeRequestRecord[];
  isLoadingRequests: boolean;
  onRefreshUpgradeRequests: () => Promise<void>;
  onReviewUpgradeRequest: (
    request: UpgradeRequestRecord,
    decision: 'approved' | 'rejected'
  ) => Promise<void>;
  hasCapturedDraft: boolean;
  onClearCapturedDraft: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  ownerEmail,
  onNavigate,
  kioskLocked,
  onSetKioskLocked,
  boothSettings,
  isSavingSettings,
  onUpdateBoothSettings,
  onSignOut,
  previewPlanOverride,
  onSetPreviewPlanOverride,
  upgradeRequests,
  isLoadingRequests,
  onRefreshUpgradeRequests,
  onReviewUpgradeRequest,
  hasCapturedDraft,
  onClearCapturedDraft
}) => {
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>(boothSettings.kioskPin);
  const [showPinInput, setShowPinInput] = useState<boolean>(false);
  const [showModalPin, setShowModalPin] = useState<boolean>(false);
  const [watermarkInput, setWatermarkInput] = useState<string>(boothSettings.watermarkText);
  const [qrisInput, setQrisInput] = useState<string>(boothSettings.qrisMerchantString || '');
  const [qrisValidation, setQrisValidation] = useState<{
    valid: boolean;
    merchantName?: string;
    merchantCity?: string;
    error?: string;
  } | null>(null);
  const [validatingQris, setValidatingQris] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [cameraStatusText, setCameraStatusText] = useState<string>('Mengikuti Perangkat');
  const [selectedInvoice, setSelectedInvoice] = useState<OrderInvoiceData | null>(null);
  const [showFlowBlueprint, setShowFlowBlueprint] = useState<boolean>(false);

  useEffect(() => {
    setPinInput(boothSettings.kioskPin);
    setWatermarkInput(boothSettings.watermarkText);
    setQrisInput(boothSettings.qrisMerchantString || '');
  }, [boothSettings.kioskPin, boothSettings.watermarkText, boothSettings.qrisMerchantString]);

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 4000);
  };

  const approvedRequests = upgradeRequests.filter((r) => r.status === 'approved');
  const pendingRequests = upgradeRequests.filter((r) => r.status === 'pending');
  const totalRevenueIdr = approvedRequests.reduce((sum, r) => sum + (r.amountIdr || 0), 0);
  const feedbackItems = (() => {
    try {
      return JSON.parse(localStorage.getItem('posara_feedback_v1') || '[]') as Array<{ id: string; name: string; message: string; createdAt: string }>;
    } catch {
      return [];
    }
  })();

  const handleLockKiosk = () => {
    onSetKioskLocked(true);
    setPinModalOpen(false);
    setShowModalPin(false);
    onNavigate('photobooth-kamera');
  };

  const handleToggleAutoReset = async () => {
    try {
      await onUpdateBoothSettings({
        ...boothSettings,
        autoResetEnabled: !boothSettings.autoResetEnabled
      });
      showAdminToast(
        !boothSettings.autoResetEnabled
          ? 'Auto-Reset Sesi 3 menit diaktifkan & tersimpan.'
          : 'Auto-Reset Sesi dinonaktifkan.'
      );
    } catch {
      showAdminToast('Gagal menyimpan perubahan ke server.');
    }
  };

  const handleToggleWatermark = async () => {
    try {
      await onUpdateBoothSettings({
        ...boothSettings,
        customWatermarkEnabled: !boothSettings.customWatermarkEnabled,
        watermarkText: normalizeWatermarkText(watermarkInput)
      });
      showAdminToast(
        !boothSettings.customWatermarkEnabled
          ? 'Branding Event Kustom diaktifkan pada footer hasil strip.'
          : 'Branding Event Kustom dinonaktifkan.'
      );
    } catch {
      showAdminToast('Gagal menyimpan perubahan ke server.');
    }
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPin = pinInput.trim();
    if (!isValidKioskPin(cleanedPin)) {
      showAdminToast('PIN Kiosk harus berupa 4 sampai 6 digit angka.');
      return;
    }
    try {
      await onUpdateBoothSettings({
        ...boothSettings,
        kioskPin: cleanedPin,
        watermarkText: normalizeWatermarkText(watermarkInput)
      });
      showAdminToast('PIN Kiosk & pengaturan owner tersimpan aman!');
    } catch {
      showAdminToast('Gagal menyimpan pengaturan ke server.');
    }
  };

  const handleValidateQris = async () => {
    const trimmed = qrisInput.trim();
    if (!trimmed) {
      setQrisValidation(null);
      showAdminToast('Tempel string QRIS statis terlebih dahulu untuk divalidasi.');
      return;
    }
    setValidatingQris(true);
    try {
      const res = await fetch('/api/qris/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrisString: trimmed })
      });
      const data = (await res.json()) as {
        valid: boolean;
        merchantName?: string;
        merchantCity?: string;
        error?: string;
      };
      setQrisValidation(data);
      if (res.ok && data.valid) {
        showAdminToast(`QRIS valid! Merchant: ${data.merchantName} (${data.merchantCity})`);
      } else {
        showAdminToast(data.error || 'Format string QRIS tidak valid.');
      }
    } catch {
      showAdminToast('Gagal terhubung ke server untuk validasi QRIS.');
    } finally {
      setValidatingQris(false);
    }
  };

  const handleSaveQrisMerchant = async () => {
    const trimmed = normalizeQrisMerchantString(qrisInput);
    if (!trimmed) {
      try {
        await onUpdateBoothSettings({
          ...boothSettings,
          watermarkText: normalizeWatermarkText(watermarkInput),
          qrisMerchantString: ''
        });
        setQrisValidation(null);
        showAdminToast(
          'Catatan QRIS kustom dikosongkan. Checkout tetap memakai QRIS resmi bawaan POSARA.'
        );
      } catch {
        showAdminToast('Gagal menyimpan pengaturan QRIS ke Firestore.');
      }
      return;
    }

    setValidatingQris(true);
    try {
      const res = await fetch('/api/qris/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrisString: trimmed })
      });
      const data = (await res.json()) as {
        valid: boolean;
        merchantName?: string;
        merchantCity?: string;
        error?: string;
      };
      setQrisValidation(data);
      if (!res.ok || !data.valid) {
        showAdminToast(data.error || 'String QRIS tidak valid. Periksa ulang checksum CRC-16.');
        return;
      }

      await onUpdateBoothSettings({
        ...boothSettings,
        watermarkText: normalizeWatermarkText(watermarkInput),
        qrisMerchantString: trimmed
      });
      showAdminToast(`QRIS Dinamis "${data.merchantName}" berhasil disimpan & diaktifkan!`);
    } catch {
      showAdminToast('Gagal menyimpan QRIS ke server.');
    } finally {
      setValidatingQris(false);
    }
  };

  const handleCopyAdminLink = async () => {
    const adminUrl = `${window.location.origin}/?admin=1`;
    try {
      await navigator.clipboard.writeText(adminUrl);
      showAdminToast('Link khusus admin berhasil disalin.');
    } catch {
      showAdminToast(`Link Admin: ${adminUrl}`);
    }
  };

  const handleCheckCameraDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setCameraStatusText('Browser tidak mendukung cek perangkat');
      showAdminToast('Peramban ini tidak menyediakan API cek sensor kamera.');
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      if (videoInputs.length === 0) {
        setCameraStatusText('Tidak ada kamera terdeteksi');
        showAdminToast('Belum ada perangkat kamera terdeteksi di browser ini.');
      } else {
        setCameraStatusText(`${videoInputs.length} Kamera Siap`);
        showAdminToast(
          `Terdeteksi ${videoInputs.length} sensor kamera siap digunakan oleh booth.`
        );
      }
    } catch {
      setCameraStatusText('Izin kamera diperlukan');
      showAdminToast('Gagal membaca daftar kamera. Pastikan izin kamera diizinkan.');
    }
  };

  const handleResetSessionDraft = () => {
    if (!hasCapturedDraft) {
      showAdminToast('Draft foto sementara sudah kosong dan bersih.');
      return;
    }
    onClearCapturedDraft();
    showAdminToast('Draft foto sesi aktif berhasil dikosongkan.');
  };

  const handleReviewDecision = async (
    req: UpgradeRequestRecord,
    decision: 'approved' | 'rejected'
  ) => {
    setProcessingReqId(req.requestId);
    try {
      await onReviewUpgradeRequest(req, decision);
      showAdminToast(
        decision === 'approved'
          ? `Paket ${getPlanMeta(req.requestedPlan).label} untuk ${req.email} berhasil diaktifkan!`
          : `Permintaan dari ${req.email} ditandai ditolak.`
      );
    } catch {
      showAdminToast('Gagal memproses verifikasi permintaan upgrade. Coba ulangi.');
    } finally {
      setProcessingReqId(null);
    }
  };

  return (
    <div className="flex flex-col w-full pb-32 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="w-full max-w-xl mx-auto flex flex-col">
      {adminToast && (
        <div className="mt-2 px-4 py-2.5 rounded-2xl bg-[#142b4a] text-white text-[12px] font-bold flex items-center justify-between shadow-md">
          <span>{adminToast}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="text-white/80 hover:text-white cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Top Greeting, Verified Owner Info & Kiosk Lock Action */}
      <section className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] text-[#516070] font-semibold">
            <span className="inline-flex items-center gap-1 text-[#142b4a]">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              <span>Owner Terverifikasi</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[150px] sm:max-w-none">{ownerEmail}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[12px] font-bold transition-colors cursor-pointer"
              title="Keluar dari sesi Admin agar tombol Admin tersembunyi"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={() => setPinModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-900 text-[12px] font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Kunci Kiosk</span>
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <h1 className="font-headline text-[26px] text-[#001632] font-black tracking-tight leading-tight">
            POSARA Studio
          </h1>
          <span className="text-[12px] text-[#516070] font-medium">
            {kioskLocked ? 'Mode Kiosk Aktif' : 'Siap Kelola'}
          </span>
        </div>
      </section>

      {/* Visitor Feedback */}
      <section className="mt-4 p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline text-[17px] font-bold text-[#001632]">Pesan dan Kesan Pengunjung</h2>
            <p className="text-[12px] text-[#516070]">{feedbackItems.length} masukan tersimpan di browser ini.</p>
          </div>
          <span className="material-symbols-outlined text-[#142b4a]">rate_review</span>
        </div>
        {feedbackItems.length === 0 && <p className="text-sm text-[#516070]">Belum ada pesan masuk.</p>}
        {feedbackItems.length > 0 && <div className="space-y-2 max-h-80 overflow-y-auto">
          {feedbackItems.map((item) => <article key={item.id} className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="flex justify-between gap-2 text-[11px] text-[#516070]"><strong className="text-[#142b4a]">{item.name}</strong><time>{new Date(item.createdAt).toLocaleString('id-ID')}</time></div>
            <p className="text-[13px] text-[#001632] mt-1 whitespace-pre-wrap">{item.message}</p>
          </article>)}
        </div>}
      </section>

      {/* Owner Private Access Guide & Kiosk PIN Settings */}
      <section className="mt-4 p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#142b4a] text-[20px]">shield_lock</span>
            <h2 className="font-headline text-[15px] font-bold text-[#001632]">
              Keamanan Akses Owner
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCopyAdminLink}
            className="px-2.5 py-1 rounded-lg bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            <span>Salin Link Admin</span>
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-[#f0f3ff] text-[12px] text-[#142b4a] space-y-1.5 leading-snug">
          <p className="font-bold text-[#001632]">Cara Membuka Admin (Tersembunyi dari Pengguna Biasa):</p>
          <p>1. Buka URL khusus dengan akhiran <span className="font-mono font-bold">/?admin=1</span> atau <span className="font-mono font-bold">/#admin</span></p>
          <p>2. Ketuk logo <span className="font-bold">POSARA</span> di pojok kiri atas <span className="font-bold">5x cepat</span></p>
          <p>3. Tekan pintasan keyboard <span className="font-mono font-bold">Ctrl + Shift + A</span></p>
          <p className="text-[11px] text-[#516070] pt-1">
            Saat pengunjung memakai web, klik <strong>Keluar</strong> di atas agar tombol Admin hilang sepenuhnya dari header.
          </p>
        </div>

        <form onSubmit={handleSaveSecuritySettings} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1">
            <label htmlFor="owner-kiosk-pin" className="block text-[11px] font-bold text-[#516070] mb-1">
              PIN Buka Kunci Kiosk (4–6 digit angka)
            </label>
            <div className="relative">
              <input
                id="owner-kiosk-pin"
                type={showPinInput ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full px-3 py-2 pr-10 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[13px] font-mono font-bold text-[#001632] focus:outline-none focus:border-[#142b4a]"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowPinInput((prev) => !prev)}
                aria-label={showPinInput ? 'Sembunyikan PIN' : 'Lihat PIN'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#516070] hover:text-[#142b4a] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPinInput ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSavingSettings}
            className="px-4 py-2 rounded-xl bg-[#142b4a] hover:bg-[#001632] disabled:opacity-60 text-white text-[12px] font-bold cursor-pointer transition-colors"
          >
            {isSavingSettings ? 'Menyimpan...' : 'Simpan PIN'}
          </button>
        </form>
      </section>

      {/* Owner Live Preview: Free vs Berlangganan */}
      <section className="mt-4 p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#142b4a] text-[20px]">visibility</span>
            <h2 className="font-headline text-[15px] font-bold text-[#001632]">
              Simulasi Tampilan Free vs Berlangganan
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#142b4a] font-bold">
            {previewPlanOverride ? `Mode: ${previewPlanOverride.toUpperCase()}` : 'Bawaan Akun'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#516070] leading-snug">
          Uji langsung pengalaman pengunjung Free (kuota 20/bln, gembok template/filter, 72 DPI) vs akun Berlangganan (300–600 DPI & ZIP).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: null, label: 'Bawaan Akun' },
              { id: 'free', label: 'Mode Free' },
              { id: 'creator', label: 'Creator Pass' },
              { id: 'studio', label: 'Studio Pro' }
            ] as const
          ).map((mode) => {
            const isSelected = previewPlanOverride === mode.id;
            return (
              <button
                key={mode.label}
                type="button"
                onClick={() => {
                  onSetPreviewPlanOverride(mode.id);
                  showAdminToast(`Pratinjau diubah ke: ${mode.label}`);
                }}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#142b4a] text-white border-[#142b4a]'
                    : 'bg-[#f0f3ff] text-[#142b4a] border-[#e2e8f0] hover:bg-[#d5e4f8]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Customer Subscription Upgrade Approval Queue */}
      <section className="mt-4 p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#142b4a] text-[20px]">receipt_long</span>
            <h2 className="font-headline text-[15px] font-bold text-[#001632]">
              Permintaan Upgrade & Aktivasi Paket
            </h2>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black tabular-nums">
                {pendingRequests.length} Baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowFlowBlueprint((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">account_tree</span>
              <span>{showFlowBlueprint ? 'Tutup Alur' : 'Alur'}</span>
            </button>
            <button
              type="button"
              onClick={() => onRefreshUpgradeRequests()}
              disabled={isLoadingRequests}
              className="px-2.5 py-1 rounded-lg bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>{isLoadingRequests ? 'Memuat...' : 'Segarkan'}</span>
            </button>
          </div>
        </div>

        {upgradeRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] text-center space-y-1">
            <span className="material-symbols-outlined text-[22px] text-[#74777e]">inbox</span>
            <p className="text-[12px] font-bold text-[#001632]">
              Belum ada pengajuan upgrade paket dari pelanggan
            </p>
            <p className="text-[11px] text-[#516070]">
              Saat pelanggan mengirim konfirmasi QRIS dari halaman Langganan, Anda dapat langsung menyetujui atau menolak dari sini.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {upgradeRequests.map((req) => {
              const tierLabel = getPlanMeta(req.requestedPlan).label;
              const isBusy = processingReqId === req.requestId;
              return (
                <div
                  key={req.requestId}
                  className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#001632] truncate">
                          {req.displayName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                          {tierLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#516070] block truncate">{req.email}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {req.status === 'approved'
                        ? 'Aktif / Disetujui'
                        : req.status === 'rejected'
                        ? 'Ditolak'
                        : 'Menunggu Verifikasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#516070] bg-white px-2.5 py-1.5 rounded-xl border border-[#e2e8f0]">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-[#142b4a] block truncate">
                        {req.invoiceNumber}
                      </span>
                      <span className="font-mono text-[10px] text-[#74777e] block truncate">
                        Ref: {req.referenceCode}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#001632] tabular-nums block">
                        Rp {req.amountIdr.toLocaleString('id-ID')} ({req.billingCycle})
                      </span>
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
                        className="text-[10.5px] font-bold text-[#142b4a] hover:underline cursor-pointer"
                      >
                        Lihat Invoice
                      </button>
                    </div>
                  </div>

                  {req.paymentNote && (
                    <p className="text-[11px] text-[#516070] italic">
                      Catatan: &ldquo;{req.paymentNote}&rdquo;
                    </p>
                  )}

                  {req.status === 'pending' && (
                    <div className="space-y-2 pt-1">
                      <div className="px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[10.5px] text-amber-950 leading-snug">
                        <strong>Cek Mutasi Wajib:</strong> Pastikan dana masuk exact{' '}
                        <strong>Rp {req.amountIdr.toLocaleString('id-ID')}</strong> di mutasi QRIS{' '}
                        <strong>{POSARA_OFFICIAL_MERCHANT.name}</strong> sebelum mengaktifkan.
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewDecision(req, 'rejected')}
                          className="py-2 px-3 rounded-xl bg-white border border-red-200 text-red-800 hover:bg-red-50 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewDecision(req, 'approved')}
                          className="py-2 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? 'Memproses...' : 'Konfirmasi Lunas'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Revenue & Performance Overview */}
      <section className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#142b4a] text-[20px]">monitoring</span>
            <h2 className="font-headline text-[17px] font-bold text-[#001632]">Ringkasan Aktivasi</h2>
          </div>
          <span className="text-[11px] font-mono text-[#516070]">
            {approvedRequests.length > 0 ? `${approvedRequests.length} paket aktif` : 'Belum ada transaksi'}
          </span>
        </div>

        {/* Main Revenue Bento Card */}
        <div className="relative overflow-hidden p-5 rounded-3xl bg-[#001632] text-white shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-[#d5e3ff] font-semibold">
              <span>Omzet Paket Disetujui</span>
              <span aria-hidden="true">·</span>
              <span>QRIS</span>
            </div>
            <span className="text-[11px] font-mono text-[#d5e3ff] tabular-nums">
              {pendingRequests.length} pending
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#9fb1cf]">Total Pendapatan Tercatat</span>
            <div className="font-headline text-[32px] font-black tracking-tight text-white leading-tight tabular-nums">
              Rp {totalRevenueIdr.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-[#9fb1cf] block mt-0.5 tabular-nums">
              {approvedRequests.length > 0
                ? `${approvedRequests.length} transaksi aktivasi paket telah disetujui`
                : '0 transaksi tercatat (proyek belum dimulai)'}
            </span>
          </div>
        </div>

        {/* Twin Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#d5e4f8] text-[#142b4a] flex flex-col justify-between gap-2 border border-[#b9c8db]/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#516070]">
                Paket Disetujui
              </span>
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#142b4a] shadow-xs">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </div>
            </div>
            <div>
              <span className="font-headline text-[28px] font-black text-[#001632] leading-none block tabular-nums">
                {approvedRequests.length}
              </span>
              <span className="text-[11px] text-[#516070] mt-0.5 block tabular-nums">
                {pendingRequests.length} menunggu tinjauan
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#e6dffb] text-[#171328] flex flex-col justify-between gap-2 border border-[#c9c3df]/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#48445b]">
                Draft Sesi Booth
              </span>
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#171328] shadow-xs">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              </div>
            </div>
            <div>
              <span className="font-headline text-[20px] font-black text-[#001632] leading-tight block">
                {hasCapturedDraft ? 'Ada Draft' : 'Kosong'}
              </span>
              <span className="text-[11px] text-[#48445b] mt-0.5 block">
                {hasCapturedDraft ? 'Sesi belum direset' : 'Siap untuk tamu baru'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Device Settings & Kiosk Mode */}
      <section className="flex flex-col gap-3 mt-4 p-4 rounded-3xl bg-[#f0f3ff] border border-[#e2e8f0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#142b4a] text-[20px]">tablet_mac</span>
            <h3 className="font-headline text-[15px] font-bold text-[#001632]">
              Pengaturan Perangkat & Event
            </h3>
          </div>
          <span className="text-[11px] text-[#516070] font-semibold">
            {isSavingSettings ? 'Menyimpan...' : 'Siap digunakan'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-[#e2e8f0] flex flex-col gap-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#516070]">Mode Perangkat:</span>
            <span className="font-bold text-[#001632]">Browser Web Lokal</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#516070]">Sensor Kamera:</span>
            <span className="font-bold text-[#001632]">{cameraStatusText}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#516070]">Lighting & Flash:</span>
            <span className="font-bold text-[#001632]">Flash Layar Standar</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#e2e8f0]">
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-[#001632]">
                Auto-Reset Sesi (3 Menit)
              </span>
              <span className="text-[10px] text-[#516070]">
                {boothSettings.autoResetEnabled
                  ? 'Aktif (layar kembali ke Beranda jika booth menganggur 3 menit)'
                  : 'Nonaktif'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={boothSettings.autoResetEnabled}
              aria-label="Toggle Auto-Reset Sesi"
              onClick={handleToggleAutoReset}
              disabled={isSavingSettings}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                boothSettings.autoResetEnabled ? 'bg-[#142b4a]' : 'bg-[#c4c6ce]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  boothSettings.autoResetEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white border border-[#e2e8f0]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-[#001632]">
                  Branding Event Kustom (Footer Strip)
                </span>
                <span className="text-[10px] text-[#516070]">
                  {boothSettings.customWatermarkEnabled
                    ? watermarkInput
                      ? `Aktif di footer bawah: "${watermarkInput}"`
                      : 'Aktif pada footer bawah hasil cetak (tidak menutup foto)'
                    : 'Belum diatur'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={boothSettings.customWatermarkEnabled}
                aria-label="Toggle Branding Event Kustom"
                onClick={handleToggleWatermark}
                disabled={isSavingSettings}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                  boothSettings.customWatermarkEnabled ? 'bg-[#142b4a]' : 'bg-[#c4c6ce]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    boothSettings.customWatermarkEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {boothSettings.customWatermarkEnabled && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  maxLength={MAX_WATERMARK_LENGTH}
                  value={watermarkInput}
                  onChange={(e) => setWatermarkInput(e.target.value)}
                  placeholder="Contoh: Dimas & Sarah Wedding · Jakarta (maks 80 karakter)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#001632] focus:outline-none focus:border-[#142b4a]"
                />
                <button
                  type="button"
                  onClick={handleSaveSecuritySettings}
                  disabled={isSavingSettings}
                  className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            )}
          </div>

          {/* QRIS Merchant Dinamis Configuration & Anti-Fraud Status */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white border border-[#e2e8f0]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-[#001632]">
                  QRIS Resmi POSARA (Dinamis Otomatis)
                </span>
                <span className="text-[10.5px] text-[#516070]">
                  Checkout pelanggan otomatis membuat QRIS dinamis nominal terkunci ke merchant resmi Owner.
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 bg-emerald-100 text-emerald-800">
                Aktif Otomatis
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#f0f3ff] border border-[#d5e4f8] text-[11px] text-[#001632] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#516070]">Merchant Resmi:</span>
                <span className="font-bold">{POSARA_OFFICIAL_MERCHANT.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#516070]">NMID / Kota:</span>
                <span className="font-mono font-bold text-[#142b4a]">
                  {POSARA_OFFICIAL_MERCHANT.nmid} ({POSARA_OFFICIAL_MERCHANT.city})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#516070]">Proteksi Server:</span>
                <span className="font-semibold text-emerald-800">
                  Rate-Limit API · Cooldown Firestore 60 dtk · Anti-Swap
                </span>
              </div>
            </div>

            <textarea
              rows={2}
              maxLength={MAX_QRIS_STRING_LENGTH}
              value={qrisInput}
              onChange={(e) => {
                setQrisInput(e.target.value);
                if (qrisValidation) setQrisValidation(null);
              }}
              placeholder="Uji atau simpan catatan string QRIS statis cadangan (diawali 000201...)"
              className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[11px] font-mono text-[#001632] focus:outline-none focus:border-[#142b4a] resize-none"
            />

            {qrisValidation && (
              <div
                className={`px-3 py-2 rounded-xl text-[11px] font-semibold ${
                  qrisValidation.valid
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                {qrisValidation.valid
                  ? `Valid · Merchant: ${qrisValidation.merchantName} (${qrisValidation.merchantCity})`
                  : qrisValidation.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleValidateQris}
                disabled={validatingQris || isSavingSettings}
                className="py-2 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                {validatingQris ? 'Memeriksa...' : 'Validasi String QRIS'}
              </button>
              <button
                type="button"
                onClick={handleSaveQrisMerchant}
                disabled={validatingQris || isSavingSettings}
                className="py-2 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Catatan QRIS'}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPinModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#142b4a] hover:bg-[#001632] text-white flex items-center justify-center gap-2 text-[13px] font-bold shadow-md active:translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">screen_lock_portrait</span>
          <span>Aktifkan Mode Kiosk Tamu Sekarang</span>
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCheckCameraDevices}
            className="p-3 rounded-xl bg-white text-[#142b4a] text-[12px] font-bold flex flex-col items-center justify-center gap-1 border border-[#e2e8f0] shadow-xs active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-[#516070]">videocam</span>
            <span>Cek Sensor Kamera</span>
          </button>
          <button
            type="button"
            onClick={handleResetSessionDraft}
            className="p-3 rounded-xl bg-white text-[#142b4a] text-[12px] font-bold flex flex-col items-center justify-center gap-1 border border-[#e2e8f0] shadow-xs active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-[#516070]">
              cleaning_services
            </span>
            <span>Reset Draft Sesi</span>
          </button>
        </div>
      </section>

      {/* PIN LOCK CONFIRMATION MODAL */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#001632]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center border border-[#e2e8f0]">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-900 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <div>
              <h4 className="font-headline text-[18px] font-bold text-[#001632]">
                Kunci Kiosk Tamu?
              </h4>
              <p className="text-[12px] text-[#516070] mt-1 leading-relaxed">
                Layar akan terkunci langsung pada antarmuka photobooth. Pengunjung tidak dapat keluar tanpa PIN Owner atau verifikasi akun Google Owner.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#516070] bg-[#f0f3ff] px-3 py-1.5 rounded-lg">
              <span>
                PIN Buka Kunci:{' '}
                <strong>
                  {showModalPin ? boothSettings.kioskPin : '•'.repeat(boothSettings.kioskPin.length)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowModalPin((prev) => !prev)}
                aria-label={showModalPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                className="text-[#142b4a] hover:opacity-80 cursor-pointer flex items-center"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {showModalPin ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  setPinModalOpen(false);
                  setShowModalPin(false);
                }}
                className="py-3 px-4 rounded-xl bg-[#f0f3ff] text-[#516070] font-bold text-[13px] active:scale-95 transition-transform cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLockKiosk}
                className="py-3 px-4 rounded-xl bg-[#142b4a] text-white font-bold text-[13px] shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Kunci Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showFlowBlueprint && (
        <div className="w-full mt-4">
          <TransactionFlowBlueprint compact />
        </div>
      )}

      <OrderInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
};
