import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CapturedFrame,
  FrameBorderType,
  FrameCornerType,
  FramePatternType,
  GalleryStrip,
  SessionSettings,
  ViewTab
} from '../types/photobooth';
import {
  FILTER_OPTIONS,
  FRAME_COLOR_OPTIONS,
  FRAME_CORNER_OPTIONS,
  FRAME_INNER_BORDER_OPTIONS,
  FRAME_PATTERN_OPTIONS,
  PHOTO_TEMPLATES,
  STICKER_LIBRARY
} from '../data/mockData';
import { downloadFile, downloadFramesZip, renderPhotoStripCanvas } from '../utils/canvasRenderer';
import { getCssFilterString, resolveStripIsDarkBg } from '../utils/photobooth';
import { RetakeModal } from './RetakeModal';
import { ShareModal } from './ShareModal';
import {
  PlanTier,
  getPlanMeta,
  isFilterLocked,
  isPaidPlan,
  isPatternLocked
} from '../utils/subscription';

interface ResultViewProps {
  settings: SessionSettings;
  capturedFrames: CapturedFrame[];
  planTier: PlanTier;
  creditsRemaining: number;
  creditsTotal: number;
  onConsumeCredit: () => Promise<boolean>;
  onRequestUpgrade: (reason: string, isQuotaExhausted?: boolean) => void;
  onUpdateSettings: (updates: Partial<SessionSettings>) => void;
  onSetCapturedFrames: (frames: CapturedFrame[]) => void;
  onSaveToGallery: (strip: GalleryStrip) => void;
  onNavigate: (tab: ViewTab) => void;
  onStartCameraRetake?: (frameIndex: number) => void;
  eventBrandText?: string;
  kioskLocked?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({
  settings,
  capturedFrames,
  planTier,
  creditsRemaining,
  creditsTotal,
  onConsumeCredit,
  onRequestUpgrade,
  onUpdateSettings,
  onSetCapturedFrames,
  onSaveToGallery,
  onNavigate,
  onStartCameraRetake,
  eventBrandText,
  kioskLocked = false
}) => {
  const planMeta = getPlanMeta(planTier);
  const isPaid = isPaidPlan(planTier);
  const [activeCustomTab, setActiveCustomTab] = useState<'frame' | 'stiker' | 'teks' | 'retake' | 'filter'>('frame');
  const [retakeModalOpen, setRetakeModalOpen] = useState<boolean>(false);
  const [retakeFrameIdx, setRetakeFrameIdx] = useState<number>(0);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedTemplate =
    PHOTO_TEMPLATES.find((t) => t.id === settings.templateId) || PHOTO_TEMPLATES[0];

  // If no captured frames yet, fill with template defaults
  const displayFrames: CapturedFrame[] =
    capturedFrames.length > 0
      ? capturedFrames
      : selectedTemplate.previewImages.slice(0, selectedTemplate.shots).map((url, i) => ({
          id: i + 1,
          dataUrl: url,
          altText: `Pose Frame ${i + 1}`,
          capturedAt: Date.now()
        }));

  const [patternCategoryFilter, setPatternCategoryFilter] = useState<'all' | 'trending' | 'motif' | 'texture'>('all');

  // Find active frame color definition
  const currentColorDef =
    FRAME_COLOR_OPTIONS.find((c) => c.id === settings.frameColor) || FRAME_COLOR_OPTIONS[0];
  const isDarkFrame = resolveStripIsDarkBg(
    settings.frameColor,
    settings.framePattern,
    currentColorDef.textTheme
  );

  const triggerConfettiSafely = (options: confetti.Options) => {
    try {
      Promise.resolve(confetti(options)).catch(() => {});
    } catch {
      // Ignore canvas-confetti environment quirks
    }
  };

  // Helper for live strip pattern CSS
  const getStripPatternStyle = (): React.CSSProperties => {
    const pattern = settings.framePattern || 'none';
    const baseColor = currentColorDef.hex;

    // Pinterest & Y2K Themes
    if (pattern === 'snap-express') {
      return {
        backgroundColor: '#fbf7ee',
        border: '1px solid rgba(20, 43, 74, 0.25)',
        boxShadow: 'inset 0 0 0 2px rgba(20, 43, 74, 0.08)'
      };
    }
    if (pattern === 'love-blooming') {
      return {
        backgroundColor: '#fdf2f5',
        border: '2px solid #f4a9be',
        boxShadow: 'inset 0 0 0 3px rgba(244, 169, 190, 0.35)'
      };
    }
    if (pattern === 'spooky-night') {
      return {
        backgroundColor: '#1f1230',
        border: '2px dashed #f97316',
        backgroundImage: 'radial-gradient(circle at 50% 25%, #341b54 0%, #1f1230 85%)'
      };
    }
    if (pattern === 'airmail') {
      return {
        backgroundColor: '#f7f4ea',
        border: '10px solid transparent',
        borderImage: 'repeating-linear-gradient(135deg, #224b88 0, #224b88 12px, #ffffff 12px, #ffffff 18px, #c83434 18px, #c83434 30px, #ffffff 30px, #ffffff 36px) 10'
      };
    }
    if (pattern === 'cinema-ticket') {
      return {
        backgroundColor: '#54151b',
        border: '2px solid #d9b671',
        boxShadow: 'inset 0 0 0 3px rgba(217, 182, 113, 0.35)'
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

    // Gradients & Textures
    if (pattern === 'gradient-aurora') {
      return {
        background: 'linear-gradient(135deg, #e6dffb 0%, #d5e4f8 50%, #ffe8d8 100%)'
      };
    }
    if (pattern === 'gradient-sunset') {
      return {
        background: 'linear-gradient(180deg, #ffd3b6 0%, #ffaaa5 50%, #dee9ff 100%)'
      };
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
        backgroundSize: '20px 20px'
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
        boxShadow: 'inset 14px 0 0 rgba(0,0,0,0.3), inset -14px 0 0 rgba(0,0,0,0.3)'
      };
    }

    return { backgroundColor: baseColor };
  };

  const getCornerClass = () => {
    if (settings.frameCorner === 'sharp') return 'rounded-none';
    if (settings.frameCorner === 'pill') return 'rounded-2xl';
    return 'rounded-xl';
  };

  const getBorderClass = () => {
    if (settings.frameInnerBorder === 'white') return 'ring-2 ring-white shadow-xs';
    if (settings.frameInnerBorder === 'double') return 'ring-2 ring-white outline outline-1 outline-black/25';
    if (settings.frameInnerBorder === 'dashed') return 'border-2 border-dashed border-white/80';
    return 'border border-black/5';
  };

  // Open retake for specific frame
  const handleOpenRetake = (index: number) => {
    setRetakeFrameIdx(index);
    setRetakeModalOpen(true);
  };

  // Apply new photo to specific frame
  const handleApplyRetake = (index: number, newPhotoUrl: string) => {
    const updated = [...displayFrames];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        dataUrl: newPhotoUrl
      };
    }
    onSetCapturedFrames(updated);
    setRetakeModalOpen(false);
  };

  const handleCameraRetakeTrigger = (index: number) => {
    setRetakeModalOpen(false);
    if (onStartCameraRetake) {
      onStartCameraRetake(index);
    } else {
      onNavigate('photobooth-kamera');
    }
  };

  // Sticker toggle
  const handleToggleSticker = (emoji: string) => {
    const exists = settings.stickers.includes(emoji);
    let nextStickers: string[];
    if (exists) {
      nextStickers = settings.stickers.filter((s) => s !== emoji);
    } else {
      nextStickers = [...settings.stickers, emoji].slice(0, 4); // max 4 stickers
    }
    onUpdateSettings({ stickers: nextStickers });
  };

  // High Res Strip Download
  const handleDownloadStrip = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const creditAllowed = await onConsumeCredit();
      if (!creditAllowed) {
        setIsExporting(false);
        return;
      }

      const canvas = await renderPhotoStripCanvas({
        frames: displayFrames,
        templateType: selectedTemplate.type,
        frameColorHex: currentColorDef.hex,
        isDarkBg: isDarkFrame,
        framePattern: settings.framePattern || 'none',
        frameCorner: settings.frameCorner || 'rounded',
        frameInnerBorder: settings.frameInnerBorder || 'none',
        caption: settings.caption,
        timestamp: settings.timestamp,
        showTimestamp: settings.showTimestamp,
        filter: settings.filter,
        stickers: settings.stickers,
        exportScale: planMeta.exportScale,
        eventBrandText
      });

      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `POSARA_photostrip_${isPaid ? 'HD' : 'FREE'}_${Date.now()}.png`);
          triggerConfettiSafely({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        } else {
          setExportError('Gagal memproses file PNG. Silakan coba unduh ulang.');
        }
        setIsExporting(false);
      }, 'image/png');
    } catch {
      setExportError('Terjadi kendala saat membuat gambar strip. Silakan coba lagi.');
      setIsExporting(false);
    }
  };

  // Share rendered strip PNG via Web Share API (with PNG download fallback)
  const handleShareStripFile = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const creditAllowed = await onConsumeCredit();
      if (!creditAllowed) {
        setIsExporting(false);
        return true;
      }

      const canvas = await renderPhotoStripCanvas({
        frames: displayFrames,
        templateType: selectedTemplate.type,
        frameColorHex: currentColorDef.hex,
        isDarkBg: isDarkFrame,
        framePattern: settings.framePattern || 'none',
        frameCorner: settings.frameCorner || 'rounded',
        frameInnerBorder: settings.frameInnerBorder || 'none',
        caption: settings.caption,
        timestamp: settings.timestamp,
        showTimestamp: settings.showTimestamp,
        filter: settings.filter,
        stickers: settings.stickers,
        exportScale: planMeta.exportScale,
        eventBrandText
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) {
        setIsExporting(false);
        return false;
      }

      const filename = `POSARA_photostrip_${isPaid ? 'HD' : 'FREE'}_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'POSARA Photobooth Strip',
            text: settings.caption || 'Hasil photobooth dari POSARA Studio'
          });
          triggerConfettiSafely({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
        } catch (err) {
          // User closed the native share sheet intentionally
          if ((err as Error)?.name !== 'AbortError') {
            downloadFile(blob, filename);
            setIsExporting(false);
            return false;
          }
        }
        setIsExporting(false);
        return true;
      }

      downloadFile(blob, filename);
      triggerConfettiSafely({ particleCount: 50, spread: 50, origin: { y: 0.75 } });
      setIsExporting(false);
      return false;
    } catch {
      setIsExporting(false);
      return false;
    }
  };

  // ZIP Individual Photos Download
  const handleDownloadZip = async () => {
    if (!planMeta.allowZipExport) {
      onRequestUpgrade('Ekspor file ZIP foto satuan hanya tersedia untuk pengguna berlangganan.');
      return;
    }
    setIsExporting(true);
    try {
      await downloadFramesZip(displayFrames, 'posara_session');
      triggerConfettiSafely({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
    } finally {
      setIsExporting(false);
    }
  };

  // Save to Gallery
  const handleSaveToGallery = () => {
    const newStrip: GalleryStrip = {
      id: `strip-${Date.now()}`,
      title: settings.caption || 'POSARA Moment',
      dateStr: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      timestamp: Date.now(),
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      frameType: selectedTemplate.type,
      frameColor: settings.frameColor,
      framePattern: settings.framePattern || 'none',
      frameCorner: settings.frameCorner || 'rounded',
      frameInnerBorder: settings.frameInnerBorder || 'none',
      caption: settings.caption,
      isFavorite: false,
      fileSizeStr:
        planTier === 'studio'
          ? '4.8 MB • PNG UHD'
          : isPaid
          ? '2.4 MB • PNG HQ'
          : '680 KB • PNG Web',
      formatStr: `${displayFrames.length}-Frame • ${planMeta.shortDpi}`,
      stickers: settings.stickers,
      frames: displayFrames
    };

    onSaveToGallery(newStrip);
    setIsSaved(true);
    triggerConfettiSafely({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col w-full pb-32 max-w-xl mx-auto px-4 sm:px-6">
      {/* Top Bar Context / Actions */}
      <div className="pt-2 pb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#516070] tracking-widest uppercase">
            Sesi Berhasil Disimpan
          </span>
          <h1 className="font-headline text-[22px] font-black text-[#001632] leading-tight">
            Hasil Photobooth Kamu
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            onSetCapturedFrames([]);
            onNavigate('photobooth-kamera');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d5e4f8] text-[#142b4a] font-bold text-[12px] active:scale-95 transition-transform shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">replay</span>
          <span>Foto Ulang</span>
        </button>
      </div>

      {/* Showcase Stage with Physical Realistic Photobooth Strip */}
      <div className="my-2">
        <div className="relative bg-[#f0f3ff] rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center overflow-hidden border border-[#e2e8f0]">
          {/* Ambient Studio Light Radial Overlay */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#d5e3ff]/60 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#e6dffb]/60 rounded-full blur-2xl pointer-events-none"></div>

          {/* Plan & Quota Status Badge */}
          <div className="z-10 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-[#142b4a] shadow-sm mb-3 border border-[#e2e8f0]/80">
            <span
              className={`material-symbols-outlined text-[16px] ${
                isPaid ? 'text-emerald-700' : 'text-[#142b4a]'
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPaid ? 'verified' : 'photo_camera'}
            </span>
            <span className="text-[11px] font-bold tracking-wide">
              {isPaid
                ? `${planMeta.label} • ${planMeta.dpiLabel}`
                : `Akun Free (${creditsRemaining}/${creditsTotal} Kredit) · ${planMeta.dpiLabel}`}
            </span>
          </div>

          {/* Smart Retake Hint Banner */}
          <div className="z-10 w-full max-w-[280px] mb-3 bg-white/95 backdrop-blur-md border border-[#d5e4f8] rounded-2xl p-2.5 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d5e4f8] text-[#142b4a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">replay</span>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#142b4a] font-black bg-[#d5e4f8]/70 px-1.5 py-0.5 rounded">
                  Smart Retake
                </span>
                <span className="text-[10px] text-[#516070] font-semibold">Tiap Frame</span>
              </div>
              <p className="text-[11px] text-[#516070] leading-tight mt-0.5">
                Ketuk frame mana saja untuk mengulang satu foto tanpa hapus yang lain.
              </p>
            </div>
          </div>

          {/* Realistic Photobooth Strip Mockup */}
          <div
            id="photobooth-strip-container"
            style={getStripPatternStyle()}
            className={`relative z-10 ${
              selectedTemplate.type === 'grid' && selectedTemplate.shots > 4 ? 'w-[260px]' : 'w-[220px]'
            } rounded-2xl p-2.5 shadow-[0_12px_32px_rgba(20,43,74,0.18)] transition-all duration-300 flex flex-col items-center border border-[#e2e8f0]/60 overflow-hidden`}
          >
            {/* Film sprocket holes decoration if pattern is film-sprocket */}
            {settings.framePattern === 'film-sprocket' && (
              <div className="absolute inset-y-2 left-1.5 flex flex-col justify-between pointer-events-none opacity-40">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-3.5 bg-black/40 rounded-sm" />
                ))}
              </div>
            )}
            {settings.framePattern === 'film-sprocket' && (
              <div className="absolute inset-y-2 right-1.5 flex flex-col justify-between pointer-events-none opacity-40">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-3.5 bg-black/40 rounded-sm" />
                ))}
              </div>
            )}

            {/* AIRMAIL Theme Overlays */}
            {settings.framePattern === 'airmail' && (
              <>
                <div className="absolute top-2 right-2.5 bg-red-600 text-white border border-white px-1.5 py-0.5 rounded shadow-sm text-[7px] font-mono leading-none tracking-tight text-center pointer-events-none z-20">
                  PAR AVION<br /><span className="text-[6px]">1.50 POSARA</span>
                </div>
                <div className="absolute top-2.5 right-14 w-7 h-7 rounded-full border border-blue-800 text-blue-800 flex flex-col items-center justify-center text-[5px] font-mono leading-none rotate-12 opacity-75 pointer-events-none z-20">
                  <span>AIR</span><span>MAIL</span>
                </div>
                <span className="absolute top-1.5 left-2 text-[18px] pointer-events-none z-20">🎀</span>
              </>
            )}

            {/* CINEMA TICKET Stub & Cutouts */}
            {settings.framePattern === 'cinema-ticket' && (
              <>
                {/* Semicircle ticket notches */}
                <div className="absolute -left-3 top-1/4 w-6 h-6 rounded-full bg-[#f0f3ff] pointer-events-none z-20" />
                <div className="absolute -right-3 top-1/4 w-6 h-6 rounded-full bg-[#f0f3ff] pointer-events-none z-20" />
                <div className="absolute -left-3 top-3/4 w-6 h-6 rounded-full bg-[#f0f3ff] pointer-events-none z-20" />
                <div className="absolute -right-3 top-3/4 w-6 h-6 rounded-full bg-[#f0f3ff] pointer-events-none z-20" />
                {/* Ticket Header */}
                <div className="w-full text-center py-1 border-b border-amber-300/40 mb-1.5 font-mono text-[8px] font-bold text-amber-200 tracking-wider">
                  ★ THEATER SHOW ★ ROW B2 • SHOW 02
                </div>
              </>
            )}

            {/* BARCODE 90s Film Strip Overlays */}
            {settings.framePattern === 'barcode-film' && (
              <div className="w-full bg-white px-2 py-0.5 rounded text-black flex flex-col items-center mb-1.5 pointer-events-none">
                <div className="h-3 w-32 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_6px,#fff_6px,#fff_7px)]" />
                <span className="text-[6px] font-mono leading-none mt-0.5 tracking-wider">* 89012480192 *</span>
              </div>
            )}

            {/* Y2K COBALT WAVES Overlays */}
            {settings.framePattern === 'y2k-comic-blue' && (
              <>
                <span className="absolute top-1 left-2 text-[20px] pointer-events-none z-20">🐰</span>
                <div className="absolute top-2 right-2 bg-white text-blue-900 px-2 py-0.5 rounded-full text-[8px] font-black shadow-xs rotate-3 pointer-events-none z-20">
                  WE LOOK COOL!
                </div>
              </>
            )}

            {/* DARK ROMANCE SCRAPBOOK Overlays */}
            {settings.framePattern === 'dark-romance' && (
              <>
                <span className="absolute top-1 right-2 text-[24px] rotate-12 pointer-events-none z-20">💋</span>
                <div className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[8px] px-2 py-0.5 -rotate-6 shadow-xs tracking-wider pointer-events-none z-20">
                  i love you
                </div>
              </>
            )}

            {/* METALLIC STARS Y2K Overlays */}
            {settings.framePattern === 'metallic-stars' && (
              <>
                <span className="absolute top-1 left-1.5 text-[14px] pointer-events-none z-20">⭐</span>
                <span className="absolute top-1 right-1.5 text-[15px] pointer-events-none z-20">🌟</span>
                <span className="absolute top-1/2 -left-1 text-[12px] pointer-events-none z-20">✦</span>
                <span className="absolute top-1/2 -right-1 text-[13px] pointer-events-none z-20">⭐</span>
              </>
            )}

            {/* POLAROID COQUETTE RED BOW Overlay */}
            {settings.framePattern === 'polaroid-ribbon' && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[26px] drop-shadow-sm pointer-events-none z-20">
                🎀
              </span>
            )}

            {/* THE SNAP EXPRESS Overlays */}
            {settings.framePattern === 'snap-express' && (
              <>
                <div
                  className="w-[calc(100%+20px)] -mx-2.5 -mt-2.5 h-2.5 mb-2"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, #c83434 0 10px, #fbf7ee 10px 15px, #142b4a 15px 25px, #fbf7ee 25px 30px)'
                  }}
                />
                <div className="w-full flex items-center justify-between text-[#142b4a] mb-1.5 px-0.5 pointer-events-none">
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] font-mono font-bold tracking-widest text-[#c83434]">
                      SPECIAL EDITION • PASS 01
                    </span>
                    <span className="font-headline text-[11px] font-black tracking-tight leading-none">
                      THE SNAP EXPRESS
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-[#c83434] text-[#c83434] flex flex-col items-center justify-center text-[5px] font-mono font-black leading-none -rotate-12 bg-[#fbf7ee]/90">
                    <span>VERIFIED</span>
                    <span>MEMORIES</span>
                  </div>
                </div>
              </>
            )}

            {/* LOVE IS BLOOMING Overlays */}
            {settings.framePattern === 'love-blooming' && (
              <div className="w-full flex items-center justify-between px-1 mb-1.5 pointer-events-none">
                <span className="text-[15px]">🌸</span>
                <span className="font-serif italic text-[11px] font-bold text-rose-800 tracking-wide">
                  Love is Blooming
                </span>
                <span className="text-[15px]">🌹</span>
              </div>
            )}

            {/* SPOOKY NIGHT HALLOWEEN Overlays */}
            {settings.framePattern === 'spooky-night' && (
              <div className="w-full flex items-center justify-between px-1 mb-1.5 pointer-events-none">
                <span className="text-[15px]">🎃</span>
                <span className="font-mono text-[9px] font-black text-orange-300 tracking-wider">
                  ★ SPOOKY NIGHT ★
                </span>
                <span className="text-[15px]">👻</span>
              </div>
            )}

            {/* Frames Stack */}
            <div
              className={`w-full ${
                selectedTemplate.type === 'grid'
                  ? 'grid grid-cols-2 gap-2 mb-2'
                  : 'flex flex-col gap-2 mb-2'
              } ${settings.framePattern === 'film-sprocket' ? 'px-3' : ''}`}
            >
              {displayFrames.map((frame, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleOpenRetake(index)}
                  className={`w-full text-left overflow-hidden bg-[#dee9ff] shadow-xs relative group cursor-pointer transition-all ${getCornerClass()} ${getBorderClass()} ${
                    selectedTemplate.shots === 1
                      ? 'aspect-square'
                      : selectedTemplate.type === '6-cut'
                      ? 'aspect-[16/10]'
                      : 'aspect-[4/3]'
                  }`}
                  title={`Klik untuk Retake Frame ${index + 1}`}
                  aria-label={`Ulangi Frame ${index + 1}`}
                >
                  <img
                    alt={frame.altText}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    src={frame.dataUrl}
                    style={{ filter: getCssFilterString(settings.filter) }}
                  />
                  <div className="absolute top-1.5 right-1.5 bg-[#001632]/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white font-mono">
                    #0{index + 1}
                  </div>
                  {/* Floating Retake pill */}
                  <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 bg-[#142b4a]/90 group-hover:bg-[#142b4a] backdrop-blur-md text-white px-2 py-1 rounded-full shadow-sm text-[10px] font-bold transition-all">
                    <span className="material-symbols-outlined text-[13px]">replay</span>
                    <span>Ulang</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Strip Authentic Branding & Customization */}
            <div className="w-full pt-1 pb-1 flex flex-col items-center justify-center text-center">
              <div
                className={`flex items-center gap-1.5 mb-0.5 font-headline text-[12px] tracking-[0.25em] font-extrabold uppercase ${
                  isDarkFrame ? 'text-white' : 'text-[#001632]'
                }`}
              >
                <span>{settings.stickers[0] || '✨'}</span>
                <span>POSARA BOOTH</span>
                <span>{settings.stickers[1] || '✨'}</span>
              </div>

              {settings.caption && (
                <div
                  className={`text-[11px] font-bold truncate max-w-[200px] ${
                    isDarkFrame ? 'text-[#d5e4f8]' : 'text-[#516070]'
                  }`}
                >
                  {settings.caption}
                </div>
              )}

              {settings.showTimestamp && (
                <div
                  className={`text-[9px] font-mono tracking-tight mt-0.5 ${
                    isDarkFrame ? 'text-[#7d93b7]' : 'text-[#74777e]'
                  }`}
                >
                  {settings.timestamp}
                </div>
              )}

              {eventBrandText && (
                <div
                  className={`text-[9px] font-semibold tracking-wider uppercase truncate max-w-[200px] mt-0.5 ${
                    isDarkFrame ? 'text-white/75' : 'text-[#142b4a]/75'
                  }`}
                >
                  {eventBrandText}
                </div>
              )}
            </div>

            {/* Snap Express Ticket Perforation & Barcode Footer */}
            {settings.framePattern === 'snap-express' && (
              <div className="w-full mt-1 pt-2 border-t border-dashed border-[#142b4a]/30 flex flex-col items-center relative">
                <div className="absolute -left-5 -top-2.5 w-5 h-5 rounded-full bg-[#f0f3ff] border border-[#e2e8f0]" />
                <div className="absolute -right-5 -top-2.5 w-5 h-5 rounded-full bg-[#f0f3ff] border border-[#e2e8f0]" />
                <div className="h-3 w-32 bg-[repeating-linear-gradient(90deg,#142b4a_0,#142b4a_2px,transparent_2px,transparent_4px,#142b4a_4px,#142b4a_7px,transparent_7px,transparent_8px)] opacity-85" />
                <span className="text-[7px] font-mono font-bold text-[#142b4a] tracking-wider mt-1">
                  #TK-9284 ROW 04 • SEAT A1
                </span>
                <div
                  className="w-[calc(100%+20px)] -mx-2.5 -mb-2.5 h-2 mt-2"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, #c83434 0 10px, #fbf7ee 10px 15px, #142b4a 15px 25px, #fbf7ee 25px 30px)'
                  }}
                />
              </div>
            )}

            {/* Subtle Perforation Dots at bottom */}
            {settings.framePattern !== 'snap-express' && (
              <div className="w-full flex justify-between items-center px-2 pt-2 opacity-30">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 h-1 rounded-full ${isDarkFrame ? 'bg-white' : 'bg-[#142b4a]'}`}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Customization Toolbar Panel */}
      <div className="mt-2">
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e2e8f0] shadow-sm">
          {/* Tabs Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {[
              { id: 'frame', label: 'Gaya & Frame', icon: 'palette' },
              { id: 'stiker', label: 'Stiker', icon: 'mood' },
              { id: 'teks', label: 'Teks & Tanggal', icon: 'edit' },
              { id: 'retake', label: 'Retake Frame', icon: 'replay' },
              { id: 'filter', label: 'Filter', icon: 'auto_fix_high' }
            ].map((tab) => {
              const isActive = activeCustomTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCustomTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#142b4a] text-white shadow-xs'
                      : 'bg-[#f0f3ff] text-[#516070] hover:text-[#001632]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Gaya & Frame Lengkap */}
          {activeCustomTab === 'frame' && (
            <div className="pt-3 space-y-4">
              {/* Section 1: Warna Kertas Dasar (14 Palet) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-bold text-[#001632] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#142b4a]">format_paint</span>
                    <span>Warna Kertas Dasar:</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#516070]">
                    {currentColorDef.label}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {FRAME_COLOR_OPTIONS.map((col) => {
                    const isSelected = settings.frameColor === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => onUpdateSettings({ frameColor: col.id })}
                        className={`h-9 rounded-xl shadow-xs flex items-center justify-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-[#142b4a] ring-offset-1 scale-105 border-white'
                            : 'border-[#e2e8f0] hover:scale-100'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                        aria-label={col.label}
                      >
                        {isSelected && (
                          <span
                            className={`material-symbols-outlined text-[16px] font-bold ${
                              col.textTheme === 'light' ? 'text-white' : 'text-[#142b4a]'
                            }`}
                          >
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Motif & Tema Frame Estetik */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-bold text-[#001632] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#142b4a]">auto_awesome_mosaic</span>
                    <span>Koleksi Tema & Motif Frame:</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                    {FRAME_PATTERN_OPTIONS.length} Tema Pilihan
                  </span>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'all', label: 'Semua', count: FRAME_PATTERN_OPTIONS.length },
                    {
                      id: 'trending',
                      label: '🔥 Tren Pinterest & Y2K',
                      count: FRAME_PATTERN_OPTIONS.filter((p) => p.category === 'trending').length
                    },
                    {
                      id: 'motif',
                      label: '🎨 Motif & Pola',
                      count: FRAME_PATTERN_OPTIONS.filter((p) => p.category === 'motif').length
                    },
                    {
                      id: 'texture',
                      label: '✨ Tekstur & Gradasi',
                      count: FRAME_PATTERN_OPTIONS.filter((p) => p.category === 'texture').length
                    }
                  ].map((cat) => {
                    const isCatActive = patternCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPatternCategoryFilter(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                          isCatActive
                            ? 'bg-[#142b4a] text-white shadow-xs'
                            : 'bg-[#f0f3ff] text-[#516070] hover:text-[#001632]'
                        }`}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    );
                  })}
                </div>

                {/* Pattern Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {FRAME_PATTERN_OPTIONS.filter((p) =>
                    patternCategoryFilter === 'all' ? true : p.category === patternCategoryFilter
                  ).map((pat) => {
                    const locked = isPatternLocked(pat, planTier);
                    const isSelected = !locked && (settings.framePattern || 'none') === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            onRequestUpgrade(
                              `Tema frame "${pat.name}" hanya tersedia untuk pengguna berlangganan.`
                            );
                            return;
                          }
                          onUpdateSettings({ framePattern: pat.id as FramePatternType });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative ${
                          isSelected
                            ? 'bg-[#142b4a] text-white border-[#142b4a] shadow-xs'
                            : locked
                            ? 'bg-[#f8fafc] text-[#516070] border-[#e2e8f0] hover:bg-[#f0f3ff] opacity-90'
                            : 'bg-[#f0f3ff] text-[#001632] border-[#e2e8f0] hover:bg-[#dee9ff]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              isSelected ? 'text-[#d5e4f8]' : 'text-[#142b4a]'
                            }`}
                          >
                            {pat.icon}
                          </span>
                          {locked ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded bg-[#e6dffb] text-[#171328]">
                              <span className="material-symbols-outlined text-[10px]">lock</span>
                              <span>PRO</span>
                            </span>
                          ) : pat.badge ? (
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#d5e4f8] text-[#142b4a]'
                              }`}
                            >
                              {pat.badge}
                            </span>
                          ) : isSelected ? (
                            <span className="material-symbols-outlined text-[14px] text-white">
                              check_circle
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] font-bold leading-tight line-clamp-1">
                          {pat.name}
                        </span>
                        <span
                          className={`text-[9px] line-clamp-1 leading-snug ${
                            isSelected ? 'text-white/80' : 'text-[#516070]'
                          }`}
                        >
                          {pat.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Bentuk Sudut Foto & Garis Tepi Bingkai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#e2e8f0]">
                {/* Bentuk Sudut */}
                <div>
                  <label className="block text-[11px] font-bold text-[#516070] mb-1.5">
                    Bentuk Sudut Foto:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FRAME_CORNER_OPTIONS.map((corner) => {
                      const isSelected = (settings.frameCorner || 'rounded') === corner.id;
                      return (
                        <button
                          key={corner.id}
                          type="button"
                          onClick={() => onUpdateSettings({ frameCorner: corner.id as FrameCornerType })}
                          className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#142b4a] text-white border-[#142b4a] shadow-xs'
                              : 'bg-[#f0f3ff] text-[#516070] border-[#e2e8f0] hover:text-[#001632]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{corner.icon}</span>
                          <span>{corner.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Garis Tepi Foto */}
                <div>
                  <label className="block text-[11px] font-bold text-[#516070] mb-1.5">
                    Garis Tepi Foto:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FRAME_INNER_BORDER_OPTIONS.map((border) => {
                      const isSelected = (settings.frameInnerBorder || 'none') === border.id;
                      return (
                        <button
                          key={border.id}
                          type="button"
                          onClick={() => onUpdateSettings({ frameInnerBorder: border.id as FrameBorderType })}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#142b4a] text-white border-[#142b4a] shadow-xs'
                              : 'bg-[#f0f3ff] text-[#516070] border-[#e2e8f0] hover:text-[#001632]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{border.icon}</span>
                          <span className="truncate">{border.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Stiker */}
          {activeCustomTab === 'stiker' && (
            <div className="pt-3">
              <label className="block text-[12px] font-bold text-[#516070] mb-2">
                Tambahkan Sentuhan Karakter (Maks 4):
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {STICKER_LIBRARY.map((emoji) => {
                  const isAdded = settings.stickers.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleToggleSticker(emoji)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg active:scale-90 transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-[#142b4a] ring-2 ring-[#142b4a]/30 shadow-xs scale-105'
                          : 'bg-[#f0f3ff] hover:bg-[#dee9ff]'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Teks & Tanggal */}
          {activeCustomTab === 'teks' && (
            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#001632]">
                  Tampilkan Tanggal & Jam
                </span>
                <button
                  role="switch"
                  aria-checked={settings.showTimestamp}
                  onClick={() => onUpdateSettings({ showTimestamp: !settings.showTimestamp })}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                    settings.showTimestamp ? 'bg-[#142b4a]' : 'bg-[#c4c6ce]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      settings.showTimestamp ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#516070] mb-1">
                  Judul / Caption Strip
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.caption}
                    onChange={(e) => onUpdateSettings({ caption: e.target.value })}
                    placeholder="Tuliskan momenmu..."
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-[#f0f3ff] text-[#001632] text-[13px] font-medium border border-[#e2e8f0] focus:outline-none focus:border-[#142b4a] transition-colors"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[#516070] material-symbols-outlined text-[18px]">
                    edit
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Retake Frame */}
          {activeCustomTab === 'retake' && (
            <div className="pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#516070]">
                  Pilih Frame yang Ingin Diulang:
                </span>
                <span className="text-[11px] font-bold text-[#142b4a] bg-[#d5e4f8] px-2 py-0.5 rounded-full">
                  {displayFrames.length} Frame
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {displayFrames.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleOpenRetake(i)}
                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-[#f0f3ff] border border-[#e2e8f0] cursor-pointer hover:border-[#142b4a] transition-all text-center"
                  >
                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative">
                      <img className="w-full h-full object-cover" alt={`Thumb ${i + 1}`} src={f.dataUrl} />
                      <span className="absolute top-1 right-1 bg-[#142b4a]/60 px-1 rounded text-[8px] text-white font-mono">
                        #0{i + 1}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#001632]">Frame {i + 1}</span>
                    <span className="w-full py-1 rounded-lg bg-[#142b4a] text-white text-[10px] font-bold flex items-center justify-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">replay</span>
                      <span>Ulang</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Filter */}
          {activeCustomTab === 'filter' && (
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-bold text-[#516070]">
                  Ubah Color Grade Sesi:
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5e4f8] text-[#142b4a]">
                  {FILTER_OPTIONS.length} Pilihan Filter
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {FILTER_OPTIONS.map((f) => {
                  const locked = isFilterLocked(f, planTier);
                  const isChosen = !locked && settings.filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onRequestUpgrade(
                            `Filter "${f.name}" terkunci untuk akun Free. Upgrade ke paket berlangganan untuk membukanya.`
                          );
                          return;
                        }
                        onUpdateSettings({ filter: f.id });
                      }}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
                        isChosen
                          ? 'bg-[#142b4a] text-white shadow-xs font-bold'
                          : locked
                          ? 'bg-[#f8fafc] text-[#516070] border border-[#e2e8f0] hover:bg-[#f0f3ff]'
                          : 'bg-[#f0f3ff] text-[#516070] hover:bg-[#dee9ff]'
                      }`}
                    >
                      {locked && (
                        <span
                          title="Terkunci (Berlangganan)"
                          className="absolute top-1 right-1 text-[#142b4a] material-symbols-outlined text-[12px]"
                        >
                          lock
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                      <span className="text-[10px] text-center leading-tight truncate w-full">{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export & Action CTA Section */}
      <div className="mt-4 space-y-2.5">
        {/* Quota Notice for Free users */}
        {!isPaid && (
          <div className="p-3 rounded-2xl bg-[#f0f3ff] border border-[#d5e4f8] flex items-center justify-between gap-2">
            <div className="text-[11px] text-[#142b4a] leading-snug">
              <p className="font-bold">
                {creditsRemaining > 0
                  ? `1 kredit dipakai tiap unduh strip • Sisa ${creditsRemaining}/${creditsTotal} bln ini`
                  : 'Kuota 20 kredit gratis bulan ini sudah habis'}
              </p>
              <p className="text-[10px] text-[#516070]">
                Hasil bersih tanpa watermark (72 DPI Web). Upgrade ke HD 300 DPI & buka semua tema.
              </p>
            </div>
            {!kioskLocked && (
              <button
                type="button"
                onClick={() => onNavigate('langganan')}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#142b4a] text-white text-[10px] font-bold cursor-pointer hover:bg-[#001632]"
              >
                Upgrade HD
              </button>
            )}
          </div>
        )}

        {/* Export Error Toast */}
        {exportError && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-[12px] font-semibold flex items-center justify-between gap-2">
            <span>{exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-red-700 hover:text-red-950 cursor-pointer"
              aria-label="Tutup pesan error"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Primary Big Action: Unduh Photo Strip */}
        <button
          type="button"
          onClick={handleDownloadStrip}
          disabled={isExporting}
          className="w-full py-4 px-4 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white flex items-center justify-center gap-2.5 font-headline text-[16px] font-bold shadow-md active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[22px]">
            {isExporting ? 'progress_activity' : 'download'}
          </span>
          <span>
            {isExporting
              ? 'Memproses Strip...'
              : isPaid
              ? `Unduh Photo Strip (HD ${planMeta.shortDpi})`
              : creditsRemaining > 0
              ? `Unduh Photo Strip (Pakai 1 Kredit · Sisa ${creditsRemaining})`
              : 'Kuota Habis — Lihat Paket'}
          </span>
        </button>

        {/* Secondary Actions Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Save to Gallery */}
          <button
            type="button"
            onClick={handleSaveToGallery}
            className={`py-3 px-2 rounded-xl border text-[12px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-[#142b4a] border-[#e2e8f0] hover:bg-[#f0f3ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isSaved ? 'check_circle' : 'bookmark'}
            </span>
            <span>{isSaved ? 'Tersimpan!' : 'Simpan'}</span>
          </button>

          {/* ZIP Separate Photos */}
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isExporting}
            className={`py-3 px-2 rounded-xl border font-bold text-[12px] flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
              planMeta.allowZipExport
                ? 'bg-white text-[#142b4a] border-[#e2e8f0] hover:bg-[#f0f3ff]'
                : 'bg-[#f8fafc] text-[#516070] border-[#e2e8f0] hover:bg-[#f0f3ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {planMeta.allowZipExport ? 'folder_zip' : 'lock'}
            </span>
            <span className="truncate">Foto ZIP</span>
          </button>

          {/* Share CTA */}
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="py-3 px-2 rounded-xl bg-white text-[#142b4a] border border-[#e2e8f0] font-bold text-[12px] flex items-center justify-center gap-1 shadow-xs hover:bg-[#f0f3ff] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">share</span>
            <span className="truncate">Bagikan</span>
          </button>
        </div>

        {/* Privacy Guarantee */}
        <div className="pt-2 px-1 flex items-start gap-2 text-center justify-center">
          <span className="material-symbols-outlined text-[#516070] text-[16px] mt-0.5">
            verified_user
          </span>
          <p className="text-[12px] text-[#516070] leading-snug">
            Foto kamu diproses langsung di browser tanpa disimpan di server publik. Privasi 100% terjaga.
          </p>
        </div>
      </div>

      {/* Retake Modal */}
      <RetakeModal
        isOpen={retakeModalOpen}
        frameIndex={retakeFrameIdx}
        currentFrame={displayFrames[retakeFrameIdx]}
        onClose={() => setRetakeModalOpen(false)}
        onApplyRetake={handleApplyRetake}
        onTriggerCameraRetake={handleCameraRetakeTrigger}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        dpiLabel={planMeta.dpiLabel}
        allowZipExport={planMeta.allowZipExport}
        onTriggerDirectDownload={handleDownloadStrip}
        onTriggerZipDownload={handleDownloadZip}
        onShareStripFile={handleShareStripFile}
        onRequestUpgrade={(reason) => onRequestUpgrade(reason)}
      />
    </div>
  );
};
