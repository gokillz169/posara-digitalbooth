import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CapturedFrame, SessionSettings, ViewTab } from '../types/photobooth';
import { FILTER_OPTIONS, PHOTO_TEMPLATES, SAMPLE_CANDID_PHOTOS } from '../data/mockData';
import { getCssFilterString } from '../utils/photobooth';
import { PlanTier, getPlanMeta, isFilterLocked } from '../utils/subscription';

interface CameraViewProps {
  settings: SessionSettings;
  capturedFrames: CapturedFrame[];
  retakeFrameIndex?: number | null;
  onUpdateSettings: (updates: Partial<SessionSettings>) => void;
  onSetCapturedFrames: (frames: CapturedFrame[]) => void;
  onCompleteSingleRetake?: (frameIndex: number, frame: CapturedFrame) => void;
  onCancelRetake?: () => void;
  onNavigate: (tab: ViewTab) => void;
  planTier: PlanTier;
  creditsRemaining: number;
  creditsTotal: number;
  onRequestUpgrade: (reason: string, quotaExhausted?: boolean) => void;
}

const POSE_HINTS = [
  'Siap-siap! Senyum terbaikmu dalam...',
  'Pose manis berdua atau solo!',
  'Gaya bebas atau pose lucu!',
  'Pose pamungkas yang paling estetik!',
  'Pose andalanmu!'
];

export const CameraView: React.FC<CameraViewProps> = ({
  settings,
  capturedFrames,
  retakeFrameIndex = null,
  onUpdateSettings,
  onSetCapturedFrames,
  onCompleteSingleRetake,
  onCancelRetake,
  onNavigate,
  planTier,
  creditsRemaining,
  creditsTotal,
  onRequestUpgrade
}) => {
  const planMeta = getPlanMeta(planTier);
  const quotaExhausted = !planMeta.isUnlimited && creditsRemaining <= 0;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isVirtualMode, setIsVirtualMode] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(settings.screenFlash);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const selectedTemplate =
    PHOTO_TEMPLATES.find((t) => t.id === settings.templateId) || PHOTO_TEMPLATES[0];
  const totalFrames = selectedTemplate.shots;
  const isSingleRetake =
    typeof retakeFrameIndex === 'number' &&
    retakeFrameIndex >= 0 &&
    retakeFrameIndex < totalFrames;

  // Capture sequence state
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(
    isSingleRetake ? retakeFrameIndex : capturedFrames.length
  );
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownNum, setCountdownNum] = useState<number>(settings.countdown);
  const countdownIntervalRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isVirtualModeRef = useRef<boolean>(isVirtualMode);

  useEffect(() => {
    isVirtualModeRef.current = isVirtualMode;
  }, [isVirtualMode]);

  useEffect(() => {
    setCurrentFrameIndex(isSingleRetake ? retakeFrameIndex : capturedFrames.length);
  }, [isSingleRetake, retakeFrameIndex, capturedFrames.length]);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    if (isVirtualMode) return;
    setCameraError(null);
    setIsVideoReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMountedRef.current || isVirtualModeRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            if (isMountedRef.current) {
              setIsVideoReady(true);
            }
          }).catch((e) => {
            console.warn('Video play error:', e);
            // Even if auto-play fails, canplay will trigger
          });
        }
      } else {
        setHasCameraPermission(false);
        setCameraError('Browser ini tidak mendukung akses kamera langsung.');
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || isVirtualModeRef.current) {
        return;
      }
      console.warn('getUserMedia error:', err);
      setHasCameraPermission(false);
      const errMsg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses';
      setCameraError(errMsg);
    }
  }, [facingMode, isVirtualMode]);

  // Keep videoRef.srcObject synced whenever stream or video element updates
  useEffect(() => {
    if (videoRef.current && streamRef.current && hasCameraPermission && !isVirtualMode) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().then(() => {
          if (isMountedRef.current) {
            setIsVideoReady(true);
          }
        }).catch(() => {});
      }
    }
  }, [hasCameraPermission, isVirtualMode]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isVirtualMode) {
      startCamera();
    }
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [startCamera, isVirtualMode]);

  // Flash overlay trigger
  const triggerFlash = useCallback(() => {
    if (!flashEnabled) return;
    setIsFlashing(true);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setIsFlashing(false);
      }
    }, 220);
  }, [flashEnabled]);

  // Take single photo (from video canvas or fallback photo)
  const capturePhoto = useCallback((): string => {
    triggerFlash();

    if (!isVirtualMode && videoRef.current && hasCameraPermission && isVideoReady) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          // Mirror front camera
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.95);
      }
    }

    // High quality studio photo fallback if camera is not active or in virtual mode
    const fallbackIdx = (capturedFrames.length + currentFrameIndex) % SAMPLE_CANDID_PHOTOS.length;
    return SAMPLE_CANDID_PHOTOS[fallbackIdx];
  }, [
    triggerFlash,
    isVirtualMode,
    hasCameraPermission,
    isVideoReady,
    facingMode,
    capturedFrames.length,
    currentFrameIndex
  ]);

  // Auto sequence countdown
  const startCountdownSequence = useCallback(() => {
    if (quotaExhausted) {
      onRequestUpgrade(
        'Kuota 20 kredit gratis Anda untuk bulan ini sudah habis. Upgrade paket untuk lanjut memotret dan mengunduh.',
        true
      );
      return;
    }
    if (isCountingDown) return;
    setIsCountingDown(true);
    let count = settings.countdown;
    setCountdownNum(count);

    countdownIntervalRef.current = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
      } else {
        // Shutter snap!
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdownNum(0);

        const newPhotoUrl = capturePhoto();
        const targetIndex = isSingleRetake ? retakeFrameIndex : currentFrameIndex;
        const newFrame: CapturedFrame = {
          id: targetIndex + 1,
          dataUrl: newPhotoUrl,
          altText: `Pose Frame ${targetIndex + 1}`,
          capturedAt: Date.now()
        };

        setIsCountingDown(false);

        if (isSingleRetake && onCompleteSingleRetake) {
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
          }
          navigationTimeoutRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              onCompleteSingleRetake(targetIndex, newFrame);
            }
          }, 450);
          return;
        }

        const updatedFrames = [...capturedFrames, newFrame];
        onSetCapturedFrames(updatedFrames);

        const nextIndex = currentFrameIndex + 1;
        setCurrentFrameIndex(nextIndex);

        if (nextIndex >= totalFrames) {
          // Completed all shots! Navigate to Hasil & Unduh
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
          }
          navigationTimeoutRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              onNavigate('hasil-unduh');
            }
          }, 600);
        }
      }
    }, 1000);
  }, [
    quotaExhausted,
    onRequestUpgrade,
    isCountingDown,
    settings.countdown,
    capturePhoto,
    isSingleRetake,
    retakeFrameIndex,
    currentFrameIndex,
    onCompleteSingleRetake,
    capturedFrames,
    onSetCapturedFrames,
    totalFrames,
    onNavigate
  ]);

  const handleRetakeLast = () => {
    if (capturedFrames.length > 0) {
      const popped = capturedFrames.slice(0, -1);
      onSetCapturedFrames(popped);
      setCurrentFrameIndex(popped.length);
    }
  };

  const currentPoseHint =
    POSE_HINTS[currentFrameIndex % POSE_HINTS.length] || 'Siap-siap berpose!';

  return (
    <div className="flex flex-col w-full pb-28 max-w-lg mx-auto px-4 select-none">
      {/* Top Live Status Bar */}
      <div className="flex items-center justify-between py-2.5">
        <button
          type="button"
          onClick={() => {
            if (isSingleRetake && onCancelRetake) {
              onCancelRetake();
            } else {
              onNavigate('pilih-template');
            }
          }}
          className="w-10 h-10 rounded-full bg-[#f0f3ff] hover:bg-[#d5e4f8] flex items-center justify-center text-[#142b4a] shadow-sm active:scale-95 transition-all cursor-pointer"
          aria-label={isSingleRetake ? 'Batal Ulang Frame' : 'Kembali ke Template'}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Frame Progress Indicator */}
        <div className="flex items-center gap-2 bg-[#dee9ff] px-3.5 py-1.5 rounded-full shadow-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalFrames }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  isSingleRetake && i === retakeFrameIndex
                    ? 'bg-amber-500 animate-pulse ring-2 ring-amber-400/50'
                    : i < capturedFrames.length
                    ? 'bg-[#142b4a]'
                    : i === capturedFrames.length
                    ? 'bg-[#142b4a] animate-pulse ring-2 ring-[#142b4a]/30'
                    : 'bg-[#c4c6ce]'
                }`}
              />
            ))}
          </div>
          <span className="text-[12px] font-bold text-[#142b4a] ml-1">
            {isSingleRetake
              ? `Ulang Frame #${retakeFrameIndex + 1}`
              : `Frame ${Math.min(currentFrameIndex + 1, totalFrames)} dari ${totalFrames}`}
          </span>
        </div>

        {/* Quick Utilities */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (isVirtualMode) {
                setIsVirtualMode(false);
                startCamera();
              } else {
                setIsVirtualMode(true);
              }
            }}
            className={`px-2.5 h-9 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95 ${
              isVirtualMode
                ? 'bg-amber-400 text-[#001632] ring-1 ring-amber-500/50'
                : 'bg-[#dee9ff] hover:bg-[#cfdaf1] text-[#142b4a]'
            }`}
            title={isVirtualMode ? 'Ganti ke Kamera Asli (Webcam/HP)' : 'Ganti ke Kamera Virtual Studio'}
            aria-label="Toggle Live atau Virtual Kamera"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isVirtualMode ? 'auto_awesome' : 'videocam'}
            </span>
            <span>{isVirtualMode ? 'Virtual' : 'Live Cam'}</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              showGrid ? 'bg-[#142b4a] text-white' : 'bg-[#f0f3ff] text-[#516070]'
            }`}
            title="Garis Bantu Grid"
            aria-label="Toggle Grid"
          >
            <span className="material-symbols-outlined text-[18px]">grid_on</span>
          </button>
          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              flashEnabled ? 'bg-[#142b4a] text-white' : 'bg-[#f0f3ff] text-[#516070]'
            }`}
            title="Flash Layar"
            aria-label="Toggle Flash"
          >
            <span className="material-symbols-outlined text-[18px]">
              {flashEnabled ? 'flash_on' : 'flash_off'}
            </span>
          </button>
          {!isVirtualMode && (
            <button
              onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
              className="w-9 h-9 rounded-full bg-[#f0f3ff] hover:bg-[#d5e4f8] flex items-center justify-center text-[#142b4a] cursor-pointer active:scale-95 transition-transform"
              title="Ganti Kamera Depan/Belakang"
              aria-label="Ganti Kamera Depan/Belakang"
            >
              <span className="material-symbols-outlined text-[18px]">flip_camera_android</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Viewfinder Section */}
      <div className="relative w-full aspect-[3/4] max-h-[500px] rounded-3xl overflow-hidden bg-[#001632] shadow-xl border-2 border-[#142b4a]/40 mt-1">
        {/* Real Video Element (ALWAYS mounted to prevent null ref binding issues) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setIsVideoReady(true)}
          onLoadedMetadata={() => {
            videoRef.current?.play().then(() => setIsVideoReady(true)).catch(() => {});
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            !isVirtualMode && hasCameraPermission && isVideoReady ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          style={{ filter: getCssFilterString(settings.filter) }}
        />

        {/* Fallback View: Virtual Studio Photo OR Camera Permission Request / Loading */}
        {(!hasCameraPermission || !isVideoReady || isVirtualMode) && (
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            {/* Studio Photo Preview */}
            <img
              alt="Pratinjau Studio Photobooth"
              className="w-full h-full object-cover transition-transform"
              src={SAMPLE_CANDID_PHOTOS[currentFrameIndex % SAMPLE_CANDID_PHOTOS.length]}
              style={{ filter: getCssFilterString(settings.filter) }}
            />

            {/* Permission / Status Overlay when camera is requested but not ready */}
            {!isVirtualMode && !hasCameraPermission && (
              <div className="absolute inset-0 bg-[#001632]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white z-10">
                <div className="w-16 h-16 rounded-full bg-[#d5e4f8]/20 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[32px] text-[#dee9ff]">videocam</span>
                </div>
                <h4 className="font-headline font-bold text-[16px] text-white mb-1">
                  Kamera Belum Aktif
                </h4>
                <p className="text-[12px] text-[#cfdaf1] max-w-xs mb-4">
                  {cameraError || 'Izinkan akses kamera di browsermu, atau gunakan Kamera Virtual Studio.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <button
                    onClick={startCamera}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#d5e4f8] text-[#001632] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Coba Kamera Lagi</span>
                  </button>
                  <button
                    onClick={() => setIsVirtualMode(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Mode Virtual</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera loading spinner when permission granted but video initializing */}
            {!isVirtualMode && hasCameraPermission && !isVideoReady && (
              <div className="absolute inset-0 bg-[#001632]/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10">
                <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                <span className="text-[12px] font-medium text-white/90">Menghubungkan kamera...</span>
              </div>
            )}

            {/* Virtual mode indicator banner */}
            {isVirtualMode && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
                <div className="bg-[#001632]/85 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Kamera Virtual Studio Aktif</span>
                </div>
                <button
                  onClick={() => {
                    setIsVirtualMode(false);
                    startCamera();
                  }}
                  className="bg-white/90 hover:bg-white text-[#142b4a] font-bold text-[11px] px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">videocam</span>
                  <span>Buka Kamera Asli</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rule of Thirds Grid Guidelines */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
            <div className="border-r border-b border-white/60"></div>
            <div className="border-r border-b border-white/60"></div>
            <div className="border-b border-white/60"></div>
            <div className="border-r border-b border-white/60"></div>
            <div className="border-r border-b border-white/60"></div>
            <div className="border-b border-white/60"></div>
            <div className="border-r border-b border-white/60"></div>
            <div className="border-r border-b border-white/60"></div>
            <div></div>
          </div>
        )}

        {/* Top Overlay Badge Inside Viewfinder */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 bg-[#001632]/75 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">
              LIVE REC
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md">
            <span className="material-symbols-outlined text-[#142b4a] text-[14px]">auto_fix_high</span>
            <span className="text-[11px] font-bold text-[#142b4a]">
              {FILTER_OPTIONS.find((f) => f.id === settings.filter)?.name || settings.filter}
            </span>
          </div>
        </div>

        {/* Floating Live Strip Stack on Right Side */}
        <div className="absolute right-3 top-16 z-20 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-[#142b4a]/85 backdrop-blur-md shadow-lg border border-white/10">
          {Array.from({ length: totalFrames }).map((_, idx) => {
            const captured = capturedFrames[idx];
            const isCurrentlyActive = idx === capturedFrames.length;

            if (captured) {
              return (
                <div
                  key={idx}
                  className="relative w-11 h-14 rounded-lg overflow-hidden shadow-sm bg-[#cfdaf1]"
                >
                  <img
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                    src={captured.dataUrl}
                  />
                  <div className="absolute inset-0 bg-[#001632]/25 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[16px] drop-shadow">
                      check_circle
                    </span>
                  </div>
                </div>
              );
            }

            if (isCurrentlyActive) {
              return (
                <div
                  key={idx}
                  className="relative w-11 h-14 rounded-lg overflow-hidden p-[2px] bg-gradient-to-tr from-[#d5e4f8] to-white"
                >
                  <div className="w-full h-full rounded-[6px] bg-[#142b4a] flex items-center justify-center relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                    <span className="absolute bottom-1 text-[8px] font-bold text-white font-mono">
                      #{idx + 1}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="w-11 h-14 rounded-lg bg-white/15 flex flex-col items-center justify-center"
              >
                <span className="text-[11px] font-bold text-white/70">#{idx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Center Floating Countdown Overlay */}
        {isCountingDown && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none bg-[#001632]/40 backdrop-blur-xs">
            <div className="relative flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-pulse">
                <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="font-headline text-[48px] font-black text-white drop-shadow-lg">
                    {countdownNum > 0 ? countdownNum : '📸'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 px-4 py-1.5 rounded-full bg-[#142b4a]/85 backdrop-blur-md shadow-md max-w-[85%] text-center">
              <p className="text-[13px] text-white font-medium truncate">
                {currentPoseHint}
              </p>
            </div>
          </div>
        )}

        {/* Screen Flash Overlay */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-30 ${
            isFlashing ? 'opacity-95' : 'opacity-0'
          }`}
        />
      </div>

      {/* Filter Selector Carousel */}
      <div className="w-full mt-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-[#516070] uppercase tracking-wider">
            Filter Efek Langsung
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dee9ff] text-[#142b4a] tabular-nums">
            {planMeta.isUnlimited
              ? `${FILTER_OPTIONS.length} Efek · Unlimited`
              : `Kuota ${creditsRemaining}/${creditsTotal}`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {FILTER_OPTIONS.map((f) => {
            const isActive = settings.filter === f.id;
            const locked = isFilterLocked(f, planTier);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    onRequestUpgrade(
                      `Filter efek "${f.name}" terkunci khusus pengguna berlangganan.`
                    );
                    return;
                  }
                  onUpdateSettings({ filter: f.id });
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                  locked
                    ? 'bg-[#eef2f8] text-[#516070] opacity-80'
                    : isActive
                    ? 'bg-[#142b4a] text-white shadow-md font-bold'
                    : 'bg-[#f0f3ff] text-[#111c2c] hover:bg-[#dee9ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {locked ? 'lock' : f.icon}
                </span>
                <span className="text-[12px]">{f.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Shutter Bar Controls Area */}
      <div className="mt-3.5 w-full bg-[#ffffff] rounded-3xl p-4 border border-[#e2e8f0] shadow-md flex flex-col items-center gap-2">
        <div className="w-full flex items-center justify-around">
          {/* Left: Timer Mode Toggle */}
          <button
            onClick={() => {
              const nextTimer = settings.countdown === 3 ? 5 : settings.countdown === 5 ? 10 : 3;
              onUpdateSettings({ countdown: nextTimer });
            }}
            className="flex flex-col items-center gap-1 text-[#142b4a] active:scale-90 transition-transform cursor-pointer"
            title="Ubah Timer Countdown"
            aria-label="Timer Countdown"
          >
            <div className="w-12 h-12 rounded-full bg-[#f0f3ff] hover:bg-[#d5e4f8] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">timer</span>
            </div>
            <span className="text-[11px] font-bold text-[#516070]">
              {settings.countdown} Detik
            </span>
          </button>

          {/* Center: Big Physical-Style Camera Shutter Button */}
          <button
            type="button"
            onClick={startCountdownSequence}
            disabled={isCountingDown || (!isSingleRetake && capturedFrames.length >= totalFrames)}
            className="relative w-20 h-20 rounded-full bg-[#142b4a] flex items-center justify-center p-1.5 shadow-[0_8px_24px_rgba(20,43,74,0.3)] active:scale-90 transition-all cursor-pointer group disabled:opacity-50"
            aria-label="Ambil Foto Sekarang"
          >
            {/* Outer tactile ring accent */}
            <div className="w-full h-full rounded-full bg-[#d5e4f8] flex items-center justify-center shadow-inner group-active:bg-[#dee9ff] transition-colors">
              {/* Inner Core Shutter Surface */}
              <div className="w-14 h-14 rounded-full bg-[#ffffff] flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[#142b4a] text-[28px] transition-transform group-hover:scale-110">
                  photo_camera
                </span>
              </div>
            </div>
          </button>

          {/* Right: Retake / Redo Last Shot */}
          <button
            onClick={handleRetakeLast}
            disabled={capturedFrames.length === 0 || isCountingDown}
            className="flex flex-col items-center gap-1 text-[#142b4a] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
            title="Ulangi Foto Terakhir"
            aria-label="Ulangi Foto Terakhir"
          >
            <div className="w-12 h-12 rounded-full bg-[#f0f3ff] hover:bg-[#d5e4f8] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">replay</span>
            </div>
            <span className="text-[11px] font-bold text-[#516070]">Ulangi</span>
          </button>
        </div>

        {/* Action Subtext or Direct Finish */}
        <div className="flex items-center justify-between w-full pt-1 px-2 border-t border-[#f0f3ff]">
          <div className="flex items-center gap-1 text-[#516070] text-[12px]">
            <span className="material-symbols-outlined text-[14px]">auto_mode</span>
            <span>Auto-countdown {settings.countdown}s per jepretan</span>
          </div>

          {capturedFrames.length > 0 && (
            <button
              onClick={() => onNavigate('hasil-unduh')}
              className="text-[12px] font-bold text-[#142b4a] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Selesai & Edit</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
