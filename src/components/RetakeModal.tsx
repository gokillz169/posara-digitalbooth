import React, { useEffect, useState } from 'react';
import { CapturedFrame } from '../types/photobooth';
import { SAMPLE_CANDID_PHOTOS } from '../data/mockData';

interface RetakeModalProps {
  isOpen: boolean;
  frameIndex: number; // 0-based
  currentFrame: CapturedFrame | undefined;
  onClose: () => void;
  onApplyRetake: (frameIndex: number, newPhotoUrl: string) => void;
  onTriggerCameraRetake: (frameIndex: number) => void;
}

export const RetakeModal: React.FC<RetakeModalProps> = ({
  isOpen,
  frameIndex,
  currentFrame,
  onClose,
  onApplyRetake,
  onTriggerCameraRetake
}) => {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>(
    currentFrame?.dataUrl || SAMPLE_CANDID_PHOTOS[0]
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedPhotoUrl(currentFrame?.dataUrl || SAMPLE_CANDID_PHOTOS[0]);
    }
  }, [isOpen, currentFrame?.dataUrl, frameIndex]);

  if (!isOpen) return null;

  const frameNumStr = String(frameIndex + 1).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-[#001632]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto border border-[#e2e8f0]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#d5e4f8] flex items-center justify-center text-[#142b4a]">
              <span className="material-symbols-outlined text-[18px]">replay</span>
            </div>
            <div>
              <h3 className="font-headline text-[16px] font-bold text-[#001632]">
                Ulang Foto Frame #{frameNumStr}
              </h3>
              <p className="text-[12px] text-[#516070]">
                Ganti foto frame terpilih tanpa mengulang sesi foto lainnya.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Modal"
            className="w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee9ff] flex items-center justify-center text-[#516070] active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current / Selected Preview */}
        <div className="flex flex-col items-center bg-[#f0f3ff] rounded-2xl p-3 border border-[#e2e8f0]">
          <div className="w-48 aspect-[4/3] rounded-xl overflow-hidden shadow-md relative bg-[#cfdaf1]">
            <img
              alt={`Frame ${frameNumStr}`}
              className="w-full h-full object-cover"
              src={selectedPhotoUrl}
            />
            <div className="absolute top-1.5 left-1.5 bg-[#142b4a]/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
              Frame #{frameNumStr}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#516070] mt-2">
            Pratinjau foto yang akan dipasang ke strip
          </span>
        </div>

        {/* Retake Method Options */}
        <div className="space-y-3">
          <span className="text-[13px] font-bold text-[#001632] block">
            Pilihan Cara Retake:
          </span>

          {/* Option 1: Buka Kamera */}
          <button
            onClick={() => onTriggerCameraRetake(frameIndex)}
            className="w-full py-3 px-3.5 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[13px] font-bold flex items-center justify-between active:scale-[0.99] transition-transform shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <div className="text-left">
                <div className="font-bold">Buka Kamera Frame Ini</div>
                <div className="text-[11px] text-[#d5e3ff] font-normal">
                  Ambil foto ulang dengan countdown 3 detik
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          {/* Option 2: Choose from alternative photos */}
          <div className="pt-1">
            <span className="text-[11px] text-[#516070] font-bold block mb-2">
              Atau pilih langsung dari jepretan studio cadangan:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLE_CANDID_PHOTOS.slice(0, 4).map((url, i) => {
                const isChosen = selectedPhotoUrl === url;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPhotoUrl(url)}
                    className={`aspect-[4/3] rounded-lg overflow-hidden relative group active:scale-95 transition-all cursor-pointer ${
                      isChosen
                        ? 'ring-2 ring-[#142b4a] border-2 border-white shadow-sm'
                        : 'border border-[#e2e8f0] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img className="w-full h-full object-cover" alt={`Pilihan ${i + 1}`} src={url} />
                    {isChosen && (
                      <div className="absolute bottom-1 right-1 bg-[#142b4a] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dee9ff] text-[#516070] font-bold text-[13px] active:scale-95 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => onApplyRetake(frameIndex, selectedPhotoUrl)}
            className="flex-[2] py-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Pasang ke Strip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
