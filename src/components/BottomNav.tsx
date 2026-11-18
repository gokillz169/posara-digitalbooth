import React from 'react';
import { ViewTab } from '../types/photobooth';

interface BottomNavProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  kioskLocked?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate, kioskLocked }) => {
  if (kioskLocked) {
    return null; // When kiosk mode is locked, navigation is hidden
  }

  const navItems: { tab: ViewTab; label: string; icon: string }[] = [
    { tab: 'beranda', label: 'Beranda', icon: 'grid_view' },
    { tab: 'pilih-template', label: 'Template', icon: 'dashboard_customize' },
    { tab: 'photobooth-kamera', label: 'Capture', icon: 'photo_camera' },
    { tab: 'galeri', label: 'Galeri', icon: 'photo_library' },
    { tab: 'langganan', label: 'Premium', icon: 'stars' }
  ];

  return (
    <nav
      className="fixed bottom-0 w-full z-40 bg-[#ffffff]/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(20,43,74,0.06)] border-t border-[#e2e8f0]/80"
      aria-label="Navigasi Utama"
    >
      <div className="flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.tab;
          const isCenterCapture = item.tab === 'photobooth-kamera';

          if (isCenterCapture) {
            return (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                className="flex flex-col items-center justify-center relative -top-3 min-w-[62px] min-h-[56px] transition-transform active:translate-y-0.5 group cursor-pointer"
                aria-label="Ambil Foto Sekarang"
              >
                <div className="w-14 h-14 rounded-full bg-[#142b4a] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(20,43,74,0.28)] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                </div>
                <span className="text-[11px] font-bold text-[#142b4a] mt-1 tracking-tight">
                  Capture
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] gap-1 transition-all rounded-xl py-1 px-2 cursor-pointer ${
                isActive
                  ? 'text-[#142b4a] font-bold scale-105'
                  : 'text-[#516070] hover:text-[#001632] opacity-80 hover:opacity-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
