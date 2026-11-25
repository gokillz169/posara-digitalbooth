import React, { useRef, useState } from 'react';
import { ViewTab } from '../types/photobooth';
import { PlanTier, getPlanMeta, isPaidPlan } from '../utils/subscription';

interface HeaderProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  kioskLocked?: boolean;
  isOwnerAuthenticated: boolean;
  onSecretAdminTrigger: () => void;
  planTier: PlanTier;
  userPhotoUrl?: string | null;
  userDisplayName?: string | null;
  isSignedIn?: boolean;
}

const PLAN_SHORT_BADGE: Record<PlanTier, string> = {
  free: 'Free',
  weekend: 'Weekend',
  creator: 'Creator',
  studio: 'Studio Pro'
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  kioskLocked,
  isOwnerAuthenticated,
  onSecretAdminTrigger,
  planTier,
  userPhotoUrl,
  userDisplayName,
  isSignedIn
}) => {
  const tapHistoryRef = useRef<number[]>([]);
  const [imgError, setImgError] = useState(false);

  const planMeta = getPlanMeta(planTier);
  const isPaid = isPaidPlan(planTier);

  const getTabLabel = (tab: ViewTab): string => {
    switch (tab) {
      case 'beranda':
        return 'Beranda';
      case 'pilih-template':
        return 'Pilih Template';
      case 'photobooth-kamera':
        return 'Kamera Booth';
      case 'hasil-unduh':
        return 'Hasil & Unduh';
      case 'galeri':
        return 'Galeri Strip';
      case 'langganan':
        return 'Langganan & Kredit';
      case 'admin':
        return isOwnerAuthenticated ? 'POSARA Owner' : 'Verifikasi Owner';
      default:
        return 'POSARA';
    }
  };

  const handleLogoClick = () => {
    if (kioskLocked) return;

    const now = Date.now();
    const recentTaps = tapHistoryRef.current.filter((t) => now - t < 2500);
    recentTaps.push(now);
    tapHistoryRef.current = recentTaps;

    if (recentTaps.length >= 5) {
      tapHistoryRef.current = [];
      onSecretAdminTrigger();
      return;
    }

    onNavigate('beranda');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#ffffff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,43,74,0.06)] border-b border-[#e2e8f0]/60">
      <div className="h-16 px-4 sm:px-6 max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name (5 rapid taps opens hidden Owner Admin Gate) */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 active:scale-95 transition-transform text-left cursor-pointer shrink-0 whitespace-nowrap"
          aria-label="Kembali ke Beranda"
        >
          <div className="w-9 h-9 rounded-xl bg-[#142b4a] text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-extrabold text-[18px] tracking-tight text-[#001632] leading-none">
              POSARA
            </span>
            <span className="text-[10px] font-semibold text-[#516070] tracking-widest uppercase">
              Digital Booth
            </span>
          </div>
        </button>

        {/* Current View Label & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#f0f3ff] text-[#516070] font-semibold text-[11px] tracking-wide uppercase">
            {getTabLabel(currentTab)}
          </span>

          {/* Admin Quick Switcher: ONLY visible when verified Owner is signed in */}
          {!kioskLocked && isOwnerAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate(currentTab === 'admin' ? 'beranda' : 'admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-[#142b4a] text-white shadow-sm'
                  : 'bg-[#f0f3ff] text-[#142b4a] hover:bg-[#d5e4f8]'
              }`}
              title="Dashboard Owner & Pengaturan Kiosk"
              aria-label="Buka Dashboard Admin"
            >
              <span className="material-symbols-outlined text-[16px]">
                {currentTab === 'admin' ? 'grid_view' : 'admin_panel_settings'}
              </span>
              <span className="hidden sm:inline">
                {currentTab === 'admin' ? 'Ke Beranda' : 'Admin'}
              </span>
            </button>
          )}

          {/* Account & Plan Tier Pill */}
          <button
            type="button"
            onClick={() => !kioskLocked && onNavigate('langganan')}
            data-testid="header-account-btn"
            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              isPaid
                ? 'bg-[#e6dffb]/70 border-[#c9c3df] text-[#171328] hover:bg-[#e6dffb]'
                : 'bg-[#f0f3ff] border-[#e2e8f0] text-[#142b4a] hover:bg-[#d5e4f8]'
            }`}
            title={
              isSignedIn && userDisplayName
                ? `${userDisplayName} · Paket ${planMeta.label}`
                : `Kelola Akun & Paket (${planMeta.label})`
            }
            aria-label={`Akun & Paket ${PLAN_SHORT_BADGE[planTier]}`}
          >
            {userPhotoUrl && !imgError ? (
              <img
                alt={userDisplayName || 'Foto Profil'}
                onError={() => setImgError(true)}
                className="w-7 h-7 rounded-full object-cover border border-white shadow-xs"
                src={userPhotoUrl}
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-white text-[#142b4a] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">
                  {isSignedIn ? 'verified_user' : 'account_circle'}
                </span>
              </span>
            )}
            <span className="text-[11px] font-bold tracking-tight">
              {PLAN_SHORT_BADGE[planTier]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
