import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dpiLabel: string;
  allowZipExport: boolean;
  onTriggerDirectDownload: () => Promise<void> | void;
  onTriggerZipDownload: () => Promise<void> | void;
  onShareStripFile: () => Promise<boolean>;
  onRequestUpgrade: (reason: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  dpiLabel,
  allowZipExport,
  onTriggerDirectDownload,
  onTriggerZipDownload,
  onShareStripFile,
  onRequestUpgrade
}) => {
  const [busyAction, setBusyAction] = useState<'share' | 'png' | 'zip' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShareNativeFile = async () => {
    setBusyAction('share');
    setStatusMessage(null);
    try {
      const shared = await onShareStripFile();
      if (shared) {
        onClose();
      } else {
        setStatusMessage(
          'Browser ini belum mendukung bagikan file langsung. File PNG sudah otomatis disiapkan untuk diunduh.'
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPng = async () => {
    setBusyAction('png');
    try {
      await onTriggerDirectDownload();
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!allowZipExport) {
      onClose();
      onRequestUpgrade('Ekspor file ZIP foto satuan hanya tersedia untuk pengguna berlangganan.');
      return;
    }
    setBusyAction('zip');
    try {
      await onTriggerZipDownload();
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001632]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto border border-[#e2e8f0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-[#142b4a] uppercase tracking-wider bg-[#d5e4f8] px-2.5 py-0.5 rounded-full">
              {dpiLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee9ff] flex items-center justify-center text-[#516070] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Title & Desc */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f3ff] text-[#142b4a] flex items-center justify-center mx-auto mb-2.5">
            <span className="material-symbols-outlined text-[26px]">ios_share</span>
          </div>
          <h2 id="share-modal-title" className="font-headline text-[21px] font-black text-[#001632] tracking-tight">
            Bagikan & Ekspor Strip
          </h2>
          <p className="text-[12px] text-[#516070] mt-1 max-w-xs mx-auto leading-relaxed">
            Kirim file gambar hasil photobooth langsung ke WhatsApp, AirDrop, atau simpan ke perangkatmu dengan privasi penuh.
          </p>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-[#f0f3ff] border border-[#d5e4f8] text-[#142b4a] text-[11.5px] font-semibold text-center">
            {statusMessage}
          </div>
        )}

        {/* Real Export Options */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleShareNativeFile}
            className="w-full p-3.5 rounded-2xl bg-[#142b4a] hover:bg-[#001632] text-white flex items-center justify-between shadow-md active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-60 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </div>
              <div>
                <span className="block text-[13px] font-bold">
                  {busyAction === 'share'
                    ? 'Menyiapkan File PNG...'
                    : 'Bagikan File Gambar (WhatsApp / AirDrop)'}
                </span>
                <span className="block text-[10.5px] text-[#d5e3ff]">
                  Mengirim foto strip asli melalui menu berbagi perangkat
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleDownloadPng}
            className="w-full p-3.5 rounded-2xl bg-[#f0f3ff] hover:bg-[#dee9ff] text-[#142b4a] border border-[#e2e8f0] flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">download</span>
              </div>
              <div>
                <span className="block text-[13px] font-bold">
                  {busyAction === 'png' ? 'Memproses PNG...' : 'Unduh Photo Strip Utuh (PNG)'}
                </span>
                <span className="block text-[10.5px] text-[#516070]">
                  1 lembar strip vertikal lengkap · Resolusi paket aktif
                </span>
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#142b4a]">
              PNG
            </span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleDownloadZip}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 text-left ${
              allowZipExport
                ? 'bg-white hover:bg-[#f0f3ff] text-[#142b4a] border-[#e2e8f0]'
                : 'bg-[#f8fafc] hover:bg-[#f0f3ff] text-[#516070] border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f0f3ff] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  {allowZipExport ? 'folder_zip' : 'lock'}
                </span>
              </div>
              <div>
                <span className="block text-[13px] font-bold text-[#001632]">
                  {busyAction === 'zip' ? 'Membuat Arsip ZIP...' : 'Unduh Semua Foto Satuan (ZIP)'}
                </span>
                <span className="block text-[10.5px] text-[#516070]">
                  {allowZipExport
                    ? 'Semua frame terpisah resolusi penuh siap unggah'
                    : 'Khusus akun berlangganan (Weekend / Creator / Studio)'}
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${
                allowZipExport
                  ? 'bg-[#d5e4f8] text-[#142b4a]'
                  : 'bg-[#e6dffb] text-[#171328]'
              }`}
            >
              {allowZipExport ? 'ZIP' : 'PRO 🔒'}
            </span>
          </button>
        </div>

        {/* Privacy Note */}
        <div className="bg-[#f0f3ff] rounded-xl p-3 border border-[#e2e8f0] text-[11px] text-[#516070] flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#142b4a] shrink-0 mt-0.5">
            verified_user
          </span>
          <span>
            Semua foto diproses secara lokal di browser. Tidak ada foto yang diunggah ke server publik tanpa tindakan unduh/bagikan darimu.
          </span>
        </div>
      </div>
    </div>
  );
};
