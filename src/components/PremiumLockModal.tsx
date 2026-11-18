import React from 'react';
import { FREE_MONTHLY_CREDITS } from '../utils/subscription';

interface PremiumLockModalProps {
  isOpen: boolean;
  reason: string;
  isQuotaExhausted?: boolean;
  kioskLocked?: boolean;
  onClose: () => void;
  onGoToSubscription: () => void;
}

export const PremiumLockModal: React.FC<PremiumLockModalProps> = ({
  isOpen,
  reason,
  isQuotaExhausted = false,
  kioskLocked = false,
  onClose,
  onGoToSubscription
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#001632]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-lock-title"
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#e2e8f0] flex flex-col items-center text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#f0f3ff] text-[#142b4a] flex items-center justify-center mb-3 border border-[#d5e4f8]">
          <span className="material-symbols-outlined text-[28px]">
            {isQuotaExhausted ? 'hourglass_empty' : 'lock'}
          </span>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-[#e6dffb] text-[#171328] text-[10px] font-bold uppercase tracking-wider mb-1.5">
          {isQuotaExhausted ? 'Kuota Gratis Habis' : 'Khusus Berlangganan'}
        </span>

        <h2 id="premium-lock-title" className="font-headline text-[19px] font-black text-[#001632]">
          {isQuotaExhausted ? 'Batas 20 Kredit Gratis Tercapai' : 'Fitur Terkunci untuk Akun Free'}
        </h2>

        <p className="text-[12.5px] text-[#516070] mt-2 leading-relaxed">
          {reason}
        </p>

        <div className="w-full mt-4 p-3 rounded-2xl bg-[#f0f3ff] text-left text-[11.5px] text-[#142b4a] space-y-1.5 border border-[#e2e8f0]/80">
          <p className="font-bold text-[#001632]">Keuntungan Berlangganan (mulai Rp 5.000):</p>
          <p>• Buka semua 22 template, 17 filter & 20 motif frame</p>
          <p>• Hasil unduhan HD 300 – 600 DPI super tajam siap cetak</p>
          <p>• Kuota 50–Unlimited sesi (vs {FREE_MONTHLY_CREDITS} sesi/bulan Free) & Ekspor ZIP</p>
        </div>

        <div className={`grid ${kioskLocked ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 w-full mt-5`}>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#d5e4f8] text-[#516070] font-bold text-[12px] cursor-pointer transition-colors"
          >
            {kioskLocked ? 'Tutup' : 'Nanti Saja'}
          </button>
          {!kioskLocked && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToSubscription();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[12px] shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">stars</span>
              <span>Lihat Paket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
