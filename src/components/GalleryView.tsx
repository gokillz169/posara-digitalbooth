import JSZip from 'jszip';
import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { GalleryStrip, ViewTab } from '../types/photobooth';
import { downloadFile, renderPhotoStripCanvas } from '../utils/canvasRenderer';
import { FRAME_COLOR_OPTIONS } from '../data/mockData';
import { resolveStripIsDarkBg } from '../utils/photobooth';
import { PlanTier, getPlanMeta, isPaidPlan } from '../utils/subscription';

interface GalleryViewProps {
  galleryItems: GalleryStrip[];
  planTier: PlanTier;
  onConsumeCredit: () => Promise<boolean>;
  onRequestUpgrade: (reason: string, isQuotaExhausted?: boolean) => void;
  onToggleFavorite: (stripId: string) => void;
  onDeleteStrip: (stripId: string) => void;
  onNavigate: (tab: ViewTab) => void;
  onSelectStripToEdit: (strip: GalleryStrip) => void;
  eventBrandText?: string;
}

function triggerConfettiSafely(options: confetti.Options) {
  try {
    Promise.resolve(confetti(options)).catch(() => {});
  } catch {
    // Ignore canvas-confetti environment quirks
  }
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  galleryItems,
  planTier,
  onConsumeCredit,
  onRequestUpgrade,
  onToggleFavorite,
  onDeleteStrip,
  onNavigate,
  onSelectStripToEdit,
  eventBrandText
}) => {
  const planMeta = getPlanMeta(planTier);
  const isPaid = isPaidPlan(planTier);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'favorites' | '4-frame' | '3-frame'>('all');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedStripIds, setSelectedStripIds] = useState<string[]>([]);
  const [previewStrip, setPreviewStrip] = useState<GalleryStrip | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Filter items
  const filteredStrips = galleryItems.filter((strip) => {
    // Search
    const matchesSearch =
      strip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strip.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strip.dateStr.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filter chip
    if (activeFilter === 'favorites') return strip.isFavorite;
    if (activeFilter === '4-frame') return strip.frameType === '4-cut';
    if (activeFilter === '3-frame') return strip.frameType === '3-cut';
    if (activeFilter === 'recent') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      return strip.timestamp >= thirtyDaysAgo;
    }
    return true;
  });

  // Batch toggle
  const handleToggleSelect = (id: string) => {
    if (selectedStripIds.includes(id)) {
      setSelectedStripIds(selectedStripIds.filter((item) => item !== id));
    } else {
      setSelectedStripIds([...selectedStripIds, id]);
    }
  };

  // Helper for strip pattern style in gallery
  const getGalleryStripPatternStyle = (strip: GalleryStrip): React.CSSProperties => {
    const colorDef = FRAME_COLOR_OPTIONS.find((c) => c.id === strip.frameColor) || FRAME_COLOR_OPTIONS[0];
    const baseColor = colorDef.hex;
    const pattern = strip.framePattern || 'none';

    // Pinterest & Y2K Themes
    if (pattern === 'snap-express') {
      return {
        backgroundColor: '#fbf7ee',
        borderTop: '5px solid #c83434',
        borderBottom: '5px solid #142b4a',
        boxShadow: 'inset 0 0 0 1px rgba(20, 43, 74, 0.2)'
      };
    }
    if (pattern === 'love-blooming') {
      return {
        backgroundColor: '#fdf2f5',
        border: '2px solid #f4a9be'
      };
    }
    if (pattern === 'spooky-night') {
      return {
        backgroundColor: '#1f1230',
        border: '2px dashed #f97316'
      };
    }
    if (pattern === 'airmail') {
      return {
        backgroundColor: '#f7f4ea',
        border: '6px solid transparent',
        borderImage: 'repeating-linear-gradient(135deg, #224b88 0, #224b88 8px, #ffffff 8px, #ffffff 12px, #c83434 12px, #c83434 20px, #ffffff 20px, #ffffff 24px) 8'
      };
    }
    if (pattern === 'cinema-ticket') {
      return {
        backgroundColor: '#54151b',
        border: '2px solid #d9b671',
        boxShadow: 'inset 0 0 0 2px rgba(217, 182, 113, 0.35)'
      };
    }
    if (pattern === 'barcode-film') {
      return {
        backgroundColor: '#1e1a22',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      };
    }
    if (pattern === 'y2k-comic-blue') {
      return {
        backgroundColor: '#1d4ed8',
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.2) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(37,99,235,0.8) 0%, transparent 60%)'
      };
    }
    if (pattern === 'dark-romance') {
      return {
        backgroundColor: '#320b14',
        backgroundImage: 'radial-gradient(circle at center, #4a101d 0%, #1e0309 100%)'
      };
    }
    if (pattern === 'metallic-stars') {
      return {
        backgroundColor: '#161320',
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, #2f2747 0%, #161320 85%)'
      };
    }
    if (pattern === 'polaroid-ribbon') {
      return {
        backgroundColor: '#fdfbf6',
        border: '1px solid #eae3d5'
      };
    }
    if (pattern === 'vintage-lace') {
      return {
        backgroundColor: '#0d3427',
        border: '2px dashed rgba(235, 215, 175, 0.5)'
      };
    }

    if (pattern === 'gradient-aurora') {
      return { background: 'linear-gradient(135deg, #e6dffb 0%, #d5e4f8 50%, #ffe8d8 100%)' };
    }
    if (pattern === 'gradient-sunset') {
      return { background: 'linear-gradient(180deg, #ffd3b6 0%, #ffaaa5 50%, #dee9ff 100%)' };
    }
    if (pattern === 'vintage-kraft') {
      return {
        backgroundColor: '#e8dec5',
        backgroundImage: 'radial-gradient(rgba(120, 80, 40, 0.08) 15%, transparent 16%)',
        backgroundSize: '12px 12px'
      };
    }
    if (pattern === 'checker') {
      return {
        backgroundColor: baseColor,
        backgroundImage: `
          linear-gradient(45deg, rgba(0, 22, 50, 0.08) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(0, 22, 50, 0.08) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(0, 22, 50, 0.08) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(0, 22, 50, 0.08) 75%)
        `,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
      };
    }
    if (pattern === 'polka') {
      return {
        backgroundColor: baseColor,
        backgroundImage: 'radial-gradient(rgba(0, 22, 50, 0.16) 20%, transparent 21%)',
        backgroundSize: '16px 16px'
      };
    }
    if (pattern === 'hearts') {
      return {
        backgroundColor: baseColor,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='%23e65078' opacity='0.25'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E")`,
        backgroundSize: '28px 28px'
      };
    }
    if (pattern === 'stars') {
      return {
        backgroundColor: baseColor,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='%23f0b428' opacity='0.3'%3E%3Cpath d='M12 2L14.39 8.26L21 9.27L16.27 13.97L17.47 20.66L12 17.27L6.53 20.66L7.73 13.97L3 9.27L9.61 8.26L12 2Z'/%3E%3C/svg%3E")`,
        backgroundSize: '28px 28px'
      };
    }
    if (pattern === 'film-sprocket') {
      return {
        backgroundColor: baseColor,
        boxShadow: 'inset 12px 0 0 rgba(0,0,0,0.35), inset -12px 0 0 rgba(0,0,0,0.35)'
      };
    }

    return { backgroundColor: baseColor };
  };

  const getGalleryCornerClass = (corner?: string) => {
    if (corner === 'sharp') return 'rounded-none';
    if (corner === 'pill') return 'rounded-2xl';
    return 'rounded-lg';
  };

  const getGalleryBorderClass = (border?: string) => {
    if (border === 'white') return 'ring-1.5 ring-white shadow-xs';
    if (border === 'double') return 'ring-1.5 ring-white outline outline-1 outline-black/25';
    if (border === 'dashed') return 'border-2 border-dashed border-white/80';
    return 'border border-black/5';
  };

  // Download single strip from card
  const handleDownloadSingle = async (strip: GalleryStrip) => {
    try {
      const creditAllowed = await onConsumeCredit();
      if (!creditAllowed) return;

      const colorDef =
        FRAME_COLOR_OPTIONS.find((c) => c.id === strip.frameColor) || FRAME_COLOR_OPTIONS[0];
      const isDark = resolveStripIsDarkBg(
        strip.frameColor,
        strip.framePattern,
        colorDef.textTheme
      );
      const canvas = await renderPhotoStripCanvas({
        frames: strip.frames,
        templateType: strip.frameType,
        frameColorHex: colorDef.hex,
        isDarkBg: isDark,
        framePattern: strip.framePattern || 'none',
        frameCorner: strip.frameCorner || 'rounded',
        frameInnerBorder: strip.frameInnerBorder || 'none',
        caption: strip.caption,
        timestamp: strip.dateStr,
        showTimestamp: true,
        filter: 'normal',
        stickers: strip.stickers || ['✨', '✨'],
        exportScale: planMeta.exportScale,
        eventBrandText
      });

      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `${strip.title.replace(/\s+/g, '_')}_${isPaid ? 'HD' : 'FREE'}.png`);
          triggerConfettiSafely({ particleCount: 50, spread: 50 });
        }
      }, 'image/png');
    } catch {
      showToast('Gagal mengekspor strip foto.');
    }
  };

  // Batch ZIP export
  const handleBatchDownloadZip = async () => {
    if (!planMeta.allowZipExport) {
      onRequestUpgrade('Ekspor banyak strip menjadi file ZIP sekaligus hanya tersedia untuk pengguna berlangganan.');
      return;
    }
    const selectedStrips = galleryItems.filter((item) => selectedStripIds.includes(item.id));
    if (selectedStrips.length === 0) return;

    try {
      const zip = new JSZip();
      for (const strip of selectedStrips) {
        const colorDef =
          FRAME_COLOR_OPTIONS.find((c) => c.id === strip.frameColor) || FRAME_COLOR_OPTIONS[0];
        const isDark = resolveStripIsDarkBg(
          strip.frameColor,
          strip.framePattern,
          colorDef.textTheme
        );
        const canvas = await renderPhotoStripCanvas({
          frames: strip.frames,
          templateType: strip.frameType,
          frameColorHex: colorDef.hex,
          isDarkBg: isDark,
          framePattern: strip.framePattern || 'none',
          frameCorner: strip.frameCorner || 'rounded',
          frameInnerBorder: strip.frameInnerBorder || 'none',
          caption: strip.caption,
          timestamp: strip.dateStr,
          showTimestamp: true,
          filter: 'normal',
          stickers: strip.stickers || ['✨', '✨'],
          exportScale: planMeta.exportScale,
          eventBrandText
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          zip.file(`${strip.title.replace(/\s+/g, '_')}_${strip.id}.png`, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `POSARA_batch_${selectedStrips.length}_strips.zip`);
      triggerConfettiSafely({ particleCount: 60, spread: 60 });
      showToast(`${selectedStrips.length} strip foto berhasil diunduh dalam arsip ZIP!`);
    } catch {
      showToast('Terjadi kendala saat membuat ZIP.');
    }
  };

  const favoriteCount = galleryItems.filter((s) => s.isFavorite).length;
  const recentCount = galleryItems.filter(
    (s) => s.timestamp >= Date.now() - 30 * 24 * 3600 * 1000
  ).length;

  return (
    <div className="flex flex-col w-full pb-32 max-w-xl mx-auto px-4 sm:px-6">
      {/* Header & Page Intro */}
      <div className="pt-2 pb-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d5e4f8] text-[#142b4a] text-[11px] font-bold">
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              photo_library
            </span>
            <span>Arsip Pribadi</span>
          </div>

          <button
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              setSelectedStripIds([]);
            }}
            className={`flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              isBatchMode
                ? 'bg-[#142b4a] text-white shadow-xs'
                : 'bg-[#f0f3ff] text-[#142b4a] hover:bg-[#dee9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">checklist</span>
            <span>{isBatchMode ? 'Selesai' : 'Pilih Banyak'}</span>
          </button>
        </div>

        <h1 className="font-headline text-[26px] font-black text-[#001632] tracking-tight mt-1">
          Galeri Strip Foto
        </h1>
        <p className="text-[13px] text-[#516070]">
          Koleksi momen photobooth ceria yang tersimpan aman di perangkatmu.
        </p>
      </div>

      {/* Bento Stats Deck (3 Mini Summary Cards) */}
      <div className="grid grid-cols-3 gap-2.5 my-2">
        {/* Stat 1: Total Strip */}
        <div className="bg-[#ffffff] p-3 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-[#dee9ff] flex items-center justify-center text-[#142b4a] mb-2">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              style
            </span>
          </div>
          <div>
            <span className="font-headline text-[22px] font-black text-[#001632] block leading-none">
              {galleryItems.length}
            </span>
            <span className="text-[11px] font-semibold text-[#516070] mt-1 block">
              Strip Tersimpan
            </span>
          </div>
        </div>

        {/* Stat 2: Sesi Bulan Ini */}
        <div className="bg-[#d5e3ff]/40 p-3 rounded-2xl border border-[#b2c7ee]/60 shadow-xs flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-[#142b4a] flex items-center justify-center text-white mb-2">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          </div>
          <div>
            <span className="font-headline text-[22px] font-black text-[#001632] block leading-none">
              {recentCount}
            </span>
            <span className="text-[11px] font-semibold text-[#142b4a] mt-1 block">
              Sesi Bulan Ini
            </span>
          </div>
        </div>

        {/* Stat 3: Status Privasi */}
        <div className="bg-[#e6dffb]/60 p-3 rounded-2xl border border-[#c9c3df]/60 shadow-xs flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-[#2b283d] flex items-center justify-center text-[#e6dffb] mb-2">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
          </div>
          <div>
            <span className="text-[12px] font-bold text-[#171328] block leading-tight">
              Lokal DB
            </span>
            <span className="text-[11px] font-semibold text-[#516070] mt-0.5 block leading-tight">
              100% Privat
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full my-2">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#516070] text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari berdasarkan judul momen atau tanggal..."
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-white text-[#001632] placeholder:text-[#74777e] text-[13px] font-medium border border-[#e2e8f0] shadow-xs focus:outline-none focus:border-[#142b4a] transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#516070] text-[18px] hover:text-[#001632] cursor-pointer"
          >
            close
          </button>
        )}
      </div>

      {/* Horizontal Filter Chips Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {[
          { id: 'all', label: `Semua (${galleryItems.length})` },
          { id: 'recent', label: 'Bulan Ini' },
          { id: 'favorites', label: `Favorit (${favoriteCount})`, isFav: true },
          { id: '4-frame', label: '4-Frame' },
          { id: '3-frame', label: '3-Frame' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === f.id
                ? 'bg-[#142b4a] text-white'
                : 'bg-white text-[#516070] hover:text-[#001632] border border-[#e2e8f0]'
            }`}
          >
            <span>{f.label}</span>
            {f.isFav && (
              <span
                className="material-symbols-outlined text-[14px] text-amber-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inline Toast Feedback */}
      {toastMsg && (
        <div className="my-2 px-4 py-2.5 rounded-2xl bg-[#142b4a] text-white text-[12px] font-bold flex items-center justify-between shadow-md">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-white/80 hover:text-white cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Batch Action Bar */}
      {isBatchMode && selectedStripIds.length > 0 && (
        <div className="flex flex-col gap-2 p-3 my-2 rounded-2xl bg-[#142b4a] text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#d5e3ff]">
                check_circle
              </span>
              <span className="text-[12px] font-bold">
                {selectedStripIds.length} strip terpilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchDownloadZip}
                className="px-3 py-1 rounded-lg bg-white text-[#142b4a] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">archive</span>
                <span>Unduh ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmBatchDelete(!confirmBatchDelete)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                title="Hapus Terpilih"
                aria-label="Hapus Terpilih"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          {confirmBatchDelete && (
            <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[11px]">
              <span>Yakin hapus {selectedStripIds.length} strip terpilih?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmBatchDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const count = selectedStripIds.length;
                    selectedStripIds.forEach((id) => onDeleteStrip(id));
                    setSelectedStripIds([]);
                    setConfirmBatchDelete(false);
                    showToast(`${count} strip foto dihapus.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Strip Cards Collection */}
      <div className="flex flex-col gap-4 mt-2">
        {filteredStrips.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] shadow-sm my-4">
            <span className="material-symbols-outlined text-[42px] text-[#516070] mb-2">
              photo_camera_back
            </span>
            <h3 className="font-headline text-[16px] font-bold text-[#001632]">
              Belum ada foto yang cocok
            </h3>
            <p className="text-[12px] text-[#516070] mt-1 mb-4">
              {searchQuery
                ? 'Coba kata kunci pencarian yang lain.'
                : 'Mulai jepret momen pertamamu sekarang!'}
            </p>
            <button
              onClick={() => onNavigate('photobooth-kamera')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#142b4a] text-white rounded-xl text-[13px] font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>Mulai Foto Sekarang</span>
            </button>
          </div>
        ) : (
          filteredStrips.map((strip) => {
            const isSelected = selectedStripIds.includes(strip.id);
            return (
              <div
                key={strip.id}
                className={`bg-[#ffffff] rounded-3xl p-4 border transition-all shadow-sm flex flex-col gap-3 group ${
                  isSelected ? 'border-[#142b4a] ring-2 ring-[#142b4a]/20' : 'border-[#e2e8f0]'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      {strip.isFavorite && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold">
                          <span
                            className="material-symbols-outlined text-[12px] text-amber-500"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          Favorit
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#516070]">
                        • {strip.dateStr}
                      </span>
                    </div>

                    <h2 className="font-headline text-[17px] font-bold text-[#001632] truncate">
                      {strip.title}
                    </h2>
                    <p className="text-[12px] text-[#516070] truncate">
                      Format: {strip.templateName} • {strip.formatStr}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Favorite Button */}
                    <button
                      onClick={() => onToggleFavorite(strip.id)}
                      className="p-1.5 rounded-full hover:bg-[#f0f3ff] transition-colors cursor-pointer"
                      title="Tandai Favorit"
                      aria-label="Toggle Favorit"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          strip.isFavorite ? 'text-amber-500' : 'text-[#74777e]'
                        }`}
                        style={{ fontVariationSettings: strip.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>

                    {/* Batch selection checkbox */}
                    {isBatchMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(strip.id)}
                        className="w-5 h-5 accent-[#142b4a] rounded cursor-pointer ml-1"
                      />
                    )}
                  </div>
                </div>

                {/* Photobooth Strip Visual Representation */}
                {(() => {
                  const colorDef = FRAME_COLOR_OPTIONS.find((c) => c.id === strip.frameColor) || FRAME_COLOR_OPTIONS[0];
                  const isDark = resolveStripIsDarkBg(
                    strip.frameColor,
                    strip.framePattern,
                    colorDef.textTheme
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => setPreviewStrip(strip)}
                      style={getGalleryStripPatternStyle(strip)}
                      className="w-full text-left p-3 rounded-2xl shadow-inner flex flex-col items-center gap-2 cursor-pointer hover:brightness-105 transition-all border border-black/5"
                    >
                      <div
                        className={`w-full ${
                          strip.frameType === 'grid'
                            ? 'grid grid-cols-2 gap-2'
                            : 'grid grid-cols-2 sm:grid-cols-4 gap-2'
                        } ${strip.framePattern === 'film-sprocket' ? 'px-2' : ''}`}
                      >
                        {strip.frames.slice(0, 4).map((frame, i) => (
                          <div
                            key={i}
                            className={`aspect-[4/3] overflow-hidden bg-[#e7eeff] shadow-xs ${getGalleryCornerClass(
                              strip.frameCorner
                            )} ${getGalleryBorderClass(strip.frameInnerBorder)}`}
                          >
                            <img
                              className="w-full h-full object-cover"
                              alt={frame.altText}
                              src={frame.dataUrl}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Stamp Footer */}
                      <div
                        className={`w-full flex items-center justify-between px-1 pt-1 ${
                          isDark ? 'text-white' : 'text-[#001632]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                          <span className="font-headline text-[11px] font-black tracking-widest uppercase">
                            POSARA BOOTH
                          </span>
                        </div>
                        <span className="text-[10px] font-mono opacity-80">{strip.dateStr}</span>
                      </div>
                    </button>
                  );
                })()}

                {/* Action Footer for Card */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#516070] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    <span>{strip.fileSizeStr}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectStripToEdit(strip)}
                      className="h-9 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dee9ff] text-[#142b4a] text-[12px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="Edit dan Sesuaikan Strip"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSingle(strip)}
                      className="h-9 px-3.5 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[12px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Unduh</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create New Memories Callout Banner */}
      <div className="my-6 p-4 rounded-3xl bg-[#d5e4f8] border border-[#b9c8db]/60 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#142b4a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-headline text-[15px] font-bold text-[#001632] leading-snug">
              Ingin buat kenangan baru?
            </h3>
            <p className="text-[12px] text-[#516070] leading-tight">
              Pilih template strip & mulai jepret sekarang.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('photobooth-kamera')}
          className="px-4 py-2.5 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white text-[12px] font-bold shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          Mulai Foto
        </button>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-3.5 rounded-2xl bg-[#f0f3ff] border border-[#e2e8f0] flex items-start gap-2.5 text-[#516070]">
        <span
          className="material-symbols-outlined text-[18px] text-[#142b4a] shrink-0 mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          verified_user
        </span>
        <p className="text-[12px] leading-relaxed">
          Semua foto tersimpan di penyimpanan lokal browser Anda (
          <span className="font-bold text-[#142b4a]">IndexedDB / LocalStorage</span>) dan tidak
          diunggah ke server cloud tanpa izin eksplisit Anda.
        </p>
      </div>

      {/* Modal Detailed Preview */}
      {previewStrip && (
        <div className="fixed inset-0 z-50 bg-[#001632]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto border border-[#e2e8f0] shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 border-b border-[#e2e8f0] pb-2">
              <span className="font-headline text-[15px] font-bold text-[#001632]">
                {previewStrip.title}
              </span>
              <button
                onClick={() => setPreviewStrip(null)}
                className="w-8 h-8 rounded-full bg-[#f0f3ff] flex items-center justify-center text-[#516070] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {(() => {
              const colorDef = FRAME_COLOR_OPTIONS.find((c) => c.id === previewStrip.frameColor) || FRAME_COLOR_OPTIONS[0];
              const isDark = resolveStripIsDarkBg(
                previewStrip.frameColor,
                previewStrip.framePattern,
                colorDef.textTheme
              );
              return (
                <div
                  style={getGalleryStripPatternStyle(previewStrip)}
                  className="w-[200px] p-2.5 rounded-2xl shadow-md flex flex-col items-center mb-4 border border-black/5"
                >
                  <div className={`flex flex-col gap-2 w-full mb-2 ${previewStrip.framePattern === 'film-sprocket' ? 'px-2' : ''}`}>
                    {previewStrip.frames.map((f, i) => (
                      <div
                        key={i}
                        className={`aspect-[4/3] overflow-hidden bg-[#dee9ff] ${getGalleryCornerClass(
                          previewStrip.frameCorner
                        )} ${getGalleryBorderClass(previewStrip.frameInnerBorder)}`}
                      >
                        <img className="w-full h-full object-cover" alt="" src={f.dataUrl} />
                      </div>
                    ))}
                  </div>
                  <span
                    className={`font-headline text-[10px] tracking-widest font-black uppercase ${
                      isDark ? 'text-white' : 'text-[#001632]'
                    }`}
                  >
                    POSARA BOOTH
                  </span>
                  <span
                    className={`text-[9px] font-mono ${
                      isDark ? 'text-white/80' : 'text-[#516070]'
                    }`}
                  >
                    {previewStrip.dateStr}
                  </span>
                </div>
              );
            })()}

            <div className="w-full grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  handleDownloadSingle(previewStrip);
                  setPreviewStrip(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#142b4a] text-white text-[12px] font-bold flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Unduh ({planMeta.shortDpi})</span>
              </button>
              <button
                onClick={() => {
                  onSelectStripToEdit(previewStrip);
                  setPreviewStrip(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#f0f3ff] text-[#142b4a] text-[12px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Sesuaikan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
