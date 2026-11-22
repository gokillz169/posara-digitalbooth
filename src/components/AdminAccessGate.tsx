import React, { useState } from 'react';
import { BoothSettingsData, OWNER_EMAIL, isAuthorizedAdminEmail } from '../utils/adminAccess';
import { AdminDashboard } from './AdminDashboard';
import { ViewTab } from '../types/photobooth';
import { PlanTier } from '../utils/subscription';
import { AppUser, UpgradeRequestRecord } from '../supabaseDb';

interface AdminAccessGateProps {
  user: AppUser | null;
  authLoading: boolean;
  kioskLocked: boolean;
  boothSettings: BoothSettingsData;
  isSavingSettings: boolean;
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
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateBoothSettings: (next: BoothSettingsData) => Promise<void>;
  onSetKioskLocked: (locked: boolean) => void;
  onNavigate: (tab: ViewTab) => void;
  onExitToVisitor: () => void;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({
  user,
  authLoading,
  kioskLocked,
  boothSettings,
  isSavingSettings,
  previewPlanOverride,
  onSetPreviewPlanOverride,
  upgradeRequests,
  isLoadingRequests,
  onRefreshUpgradeRequests,
  onReviewUpgradeRequest,
  hasCapturedDraft,
  onClearCapturedDraft,
  onSignIn,
  onSignOut,
  onUpdateBoothSettings,
  onSetKioskLocked,
  onNavigate,
  onExitToVisitor
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isOwner = isAuthorizedAdminEmail(user?.email, user?.emailVerified);

  const handleLoginClick = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await onSignIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('cancelled-popup-request')) {
        return;
      }
      if (message.includes('popup-closed-by-user')) {
        setAuthError('Jendela login Google ditutup sebelum selesai.');
      } else if (message.includes('popup-blocked')) {
        setAuthError('Popup login diblokir browser. Izinkan popup lalu coba lagi.');
      } else if (message.includes('unauthorized-domain')) {
        setAuthError('Domain ini belum terdaftar di daftar redirect URL Supabase Auth.');
      } else {
        setAuthError('Gagal masuk dengan akun Google. Silakan coba lagi.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await onSignOut();
      await onSignIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('popup-closed-by-user') && !message.includes('cancelled-popup-request')) {
        setAuthError(
          message.includes('popup-blocked')
            ? 'Popup login diblokir browser. Izinkan popup lalu coba lagi.'
            : 'Gagal mengganti akun Google. Silakan coba lagi.'
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#f0f3ff] border border-[#e2e8f0] flex items-center justify-center text-[#142b4a] mb-3 animate-pulse">
          <span className="material-symbols-outlined text-[24px]">verified_user</span>
        </div>
        <p className="text-[14px] font-bold text-[#001632]">Memeriksa Sesi Owner...</p>
        <p className="text-[12px] text-[#516070] mt-1">
          Memastikan izin akses halaman admin.
        </p>
      </div>
    );
  }

  // Case 1: Not signed in yet
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 pb-28">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-[#e2e8f0] shadow-[0_14px_40px_rgba(20,43,74,0.08)] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#142b4a] text-white flex items-center justify-center shadow-md mb-4">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#f0f3ff] text-[#142b4a] text-[11px] font-bold uppercase tracking-wider mb-2">
            Area Terproteksi
          </span>

          <h1 className="font-headline text-[22px] font-black text-[#001632] leading-tight">
            Login Khusus Owner POSARA
          </h1>

          <p className="text-[13px] text-[#516070] mt-2 leading-relaxed">
            Halaman pengelolaan ini hanya dapat dibuka oleh akun Owner terdaftar. Pengunjung biasa tidak memiliki akses ke dashboard admin.
          </p>

          {authError && (
            <div className="w-full mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[12px] font-semibold">
              {authError}
            </div>
          )}

          <div className="w-full flex flex-col gap-2.5 mt-6">
            <button
              type="button"
              onClick={handleLoginClick}
              disabled={signingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#142b4a] hover:bg-[#001632] disabled:opacity-60 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>{signingIn ? 'Membuka Login Google...' : 'Masuk dengan Google (Owner)'}</span>
            </button>

            <button
              type="button"
              onClick={onExitToVisitor}
              className="w-full py-3 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] font-bold text-[13px] transition-colors cursor-pointer"
            >
              Kembali ke Halaman Pengunjung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Signed in, but NOT the registered Owner
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 pb-28">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-red-200 shadow-[0_14px_40px_rgba(20,43,74,0.08)] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-900 flex items-center justify-center shadow-xs mb-4">
            <span className="material-symbols-outlined text-[28px]">gpp_bad</span>
          </div>

          <span className="px-3 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            Akses Ditolak
          </span>

          <h1 className="font-headline text-[21px] font-black text-[#001632] leading-tight">
            Bukan Akun Owner
          </h1>

          <p className="text-[13px] text-[#516070] mt-2 leading-relaxed">
            Akun <strong className="text-[#001632]">{user.email || 'tidak dikenal'}</strong> tercatat sebagai pengguna biasa dan tidak memiliki izin membuka Dashboard Admin.
          </p>

          <p className="text-[11px] text-[#74777e] mt-1.5">
            Hanya akun Google Owner yang terdaftar di sistem yang dapat mengakses panel ini.
          </p>

          {authError && (
            <div className="w-full mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[12px] font-semibold">
              {authError}
            </div>
          )}

          <div className="w-full flex flex-col gap-2.5 mt-6">
            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={signingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#142b4a] hover:bg-[#001632] disabled:opacity-60 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">switch_account</span>
              <span>{signingIn ? 'Mengganti Akun...' : 'Ganti ke Akun Google Owner'}</span>
            </button>

            <button
              type="button"
              onClick={onExitToVisitor}
              className="w-full py-3 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#142b4a] font-bold text-[13px] transition-colors cursor-pointer"
            >
              Kembali ke Halaman Pengunjung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Verified Owner
  return (
    <AdminDashboard
      ownerEmail={user.email || OWNER_EMAIL}
      onNavigate={onNavigate}
      kioskLocked={kioskLocked}
      onSetKioskLocked={onSetKioskLocked}
      boothSettings={boothSettings}
      isSavingSettings={isSavingSettings}
      onUpdateBoothSettings={onUpdateBoothSettings}
      onSignOut={onSignOut}
      previewPlanOverride={previewPlanOverride}
      onSetPreviewPlanOverride={onSetPreviewPlanOverride}
      upgradeRequests={upgradeRequests}
      isLoadingRequests={isLoadingRequests}
      onRefreshUpgradeRequests={onRefreshUpgradeRequests}
      onReviewUpgradeRequest={onReviewUpgradeRequest}
      hasCapturedDraft={hasCapturedDraft}
      onClearCapturedDraft={onClearCapturedDraft}
    />
  );
};
