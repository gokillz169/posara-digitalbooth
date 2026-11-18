/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CapturedFrame, GalleryStrip, SessionSettings, ViewTab } from './types/photobooth';
import {
  FILTER_OPTIONS,
  FRAME_PATTERN_OPTIONS,
  INITIAL_GALLERY_STRIPS,
  INITIAL_SESSION_SETTINGS,
  PHOTO_TEMPLATES
} from './data/mockData';
import {
  UpgradeRequestRecord,
  auth,
  loadAllUpgradeRequestsForAdmin,
  loadBoothSettings,
  loadOrCreateUserPlan,
  loadUserUpgradeRequests,
  persistUserPlanCredits,
  reviewUpgradeRequestAsAdmin,
  saveBoothSettings,
  signInOwnerWithGoogle,
  signInVisitorWithGoogle,
  signOutOwner,
  signOutUser,
  submitUpgradeRequest,
  subscribeAdminUpgradeRequests,
  subscribePublicBoothConfig,
  subscribeUserPlan,
  subscribeUserUpgradeRequests,
  syncAdminProfile
} from './firebase';
import {
  BoothSettingsData,
  DEFAULT_KIOSK_PIN,
  INITIAL_BOOTH_SETTINGS,
  getActiveEventBranding,
  getCleanVisitorUrl,
  isAdminEntryUrl,
  isAuthorizedAdminEmail,
  isComplimentaryStudioEmail,
  verifyKioskPin
} from './utils/adminAccess';
import {
  BillingCycle,
  PlanTier,
  UserPlanState,
  consumePlanCredit,
  createInitialFreePlanState,
  createPlanStateForTier,
  isFilterLocked,
  isPaidPlan,
  isPatternLocked,
  isTemplateLocked,
  normalizeMonthlyPlanState
} from './utils/subscription';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TemplateView } from './components/TemplateView';
import { CameraView } from './components/CameraView';
import { ResultView } from './components/ResultView';
import { GalleryView } from './components/GalleryView';
import { SubscriptionView } from './components/SubscriptionView';
import { AdminAccessGate } from './components/AdminAccessGate';
import { PremiumLockModal } from './components/PremiumLockModal';

const LOCAL_PLAN_STORAGE_KEY = 'posara_free_plan_v1';

function readStoredPlanState(): UserPlanState {
  try {
    const raw = localStorage.getItem(LOCAL_PLAN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPlanState>;
      if (
        typeof parsed.creditsRemaining === 'number' &&
        typeof parsed.creditsTotal === 'number' &&
        typeof parsed.cycleKey === 'string'
      ) {
        const plan: PlanTier =
          parsed.plan === 'weekend' || parsed.plan === 'creator' || parsed.plan === 'studio'
            ? parsed.plan
            : 'free';
        return normalizeMonthlyPlanState({
          plan,
          creditsTotal: parsed.creditsTotal,
          creditsRemaining: Math.max(0, parsed.creditsRemaining),
          cycleKey: parsed.cycleKey
        });
      }
    }
  } catch {
    // fallback to clean initial Free plan
  }
  return createInitialFreePlanState();
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>(() => {
    if (
      typeof window !== 'undefined' &&
      isAdminEntryUrl(window.location.pathname, window.location.hash, window.location.search)
    ) {
      return 'admin';
    }
    return 'beranda';
  });
  const [settings, setSettings] = useState<SessionSettings>(INITIAL_SESSION_SETTINGS);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [retakeFrameIndex, setRetakeFrameIndex] = useState<number | null>(null);
  const [kioskLocked, setKioskLocked] = useState<boolean>(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState<boolean>(false);
  const [unlockPinInput, setUnlockPinInput] = useState<string>('');
  const [unlockPinError, setUnlockPinError] = useState<string | null>(null);

  // Firebase Auth, Booth Settings & Plan Quota state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [boothSettings, setBoothSettings] = useState<BoothSettingsData>(INITIAL_BOOTH_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  const [userPlan, setUserPlan] = useState<UserPlanState>(() => readStoredPlanState());
  const [previewPlanOverride, setPreviewPlanOverride] = useState<PlanTier | null>(null);
  const [previewPlanState, setPreviewPlanState] = useState<UserPlanState | null>(null);

  const [lockModalOpen, setLockModalOpen] = useState<boolean>(false);
  const [lockModalReason, setLockModalReason] = useState<string>('');
  const [lockModalQuotaExhausted, setLockModalQuotaExhausted] = useState<boolean>(false);

  const [userUpgradeRequests, setUserUpgradeRequests] = useState<UpgradeRequestRecord[]>([]);
  const [adminUpgradeRequests, setAdminUpgradeRequests] = useState<UpgradeRequestRecord[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);

  const isOwnerAuthenticated = isAuthorizedAdminEmail(
    currentUser?.email,
    currentUser?.emailVerified
  );

  const isComplimentaryVip = isComplimentaryStudioEmail(
    currentUser?.email,
    currentUser?.emailVerified
  );

  const effectivePlanState: UserPlanState =
    isOwnerAuthenticated && previewPlanOverride && previewPlanState
      ? previewPlanState
      : isComplimentaryVip
      ? createPlanStateForTier('studio', userPlan.cycleKey || undefined)
      : userPlan;

  const handleSetPreviewPlanOverride = (tier: PlanTier | null) => {
    setPreviewPlanOverride(tier);
    setPreviewPlanState(tier ? createPlanStateForTier(tier) : null);
  };

  // Persist local Free plan state for visitors
  useEffect(() => {
    if (userPlan.plan === 'free') {
      try {
        localStorage.setItem(LOCAL_PLAN_STORAGE_KEY, JSON.stringify(userPlan));
      } catch {
        // silent
      }
    }
  }, [userPlan]);

  // Fallback safeguard if switching to Free leaves a premium template/filter/pattern active
  useEffect(() => {
    if (isPaidPlan(effectivePlanState.plan)) {
      return;
    }
    const activeTpl = PHOTO_TEMPLATES.find((t) => t.id === settings.templateId);
    const activeFilter = FILTER_OPTIONS.find((f) => f.id === settings.filter);
    const activePattern = FRAME_PATTERN_OPTIONS.find((p) => p.id === settings.framePattern);

    const updates: Partial<SessionSettings> = {};
    if (activeTpl && isTemplateLocked(activeTpl, effectivePlanState.plan)) {
      updates.templateId = INITIAL_SESSION_SETTINGS.templateId;
    }
    if (activeFilter && isFilterLocked(activeFilter, effectivePlanState.plan)) {
      updates.filter = INITIAL_SESSION_SETTINGS.filter;
    }
    if (activePattern && isPatternLocked(activePattern, effectivePlanState.plan)) {
      updates.framePattern = INITIAL_SESSION_SETTINGS.framePattern;
    }
    if (Object.keys(updates).length > 0) {
      setSettings((prev) => ({ ...prev, ...updates }));
    }
  }, [effectivePlanState.plan, settings.templateId, settings.filter, settings.framePattern]);

  // Subscribe to public booth config (event branding, auto-reset, public QRIS merchant string)
  useEffect(() => {
    const unsubPublic = subscribePublicBoothConfig((publicCfg) => {
      setBoothSettings((prev) => ({
        ...prev,
        autoResetEnabled: publicCfg.autoResetEnabled,
        customWatermarkEnabled: publicCfg.customWatermarkEnabled,
        watermarkText: publicCfg.watermarkText,
        qrisMerchantString: publicCfg.qrisMerchantString
      }));
    });
    return () => unsubPublic();
  }, []);

  // Subscribe to Firebase Auth state & attach real-time Firestore listeners
  useEffect(() => {
    let planUnsub: (() => void) | null = null;
    let userReqUnsub: (() => void) | null = null;
    let adminReqUnsub: (() => void) | null = null;

    const cleanupUserListeners = () => {
      if (planUnsub) {
        planUnsub();
        planUnsub = null;
      }
      if (userReqUnsub) {
        userReqUnsub();
        userReqUnsub = null;
      }
      if (adminReqUnsub) {
        adminReqUnsub();
        adminReqUnsub = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      cleanupUserListeners();
      setCurrentUser(user);
      setAuthLoading(false);

      if (user && user.emailVerified) {
        const vipAccount = isComplimentaryStudioEmail(user.email, user.emailVerified);
        if (vipAccount) {
          setUserPlan(createPlanStateForTier('studio'));
        }
        try {
          const loadedPlan = await loadOrCreateUserPlan(user);
          setUserPlan(loadedPlan);
        } catch (err) {
          console.error('Failed to sync user plan:', err);
          if (vipAccount) {
            setUserPlan(createPlanStateForTier('studio'));
          }
        }
        planUnsub = subscribeUserPlan(user, (livePlan) => {
          setUserPlan(livePlan);
        });
        userReqUnsub = subscribeUserUpgradeRequests(user, (liveReqs) => {
          setUserUpgradeRequests(liveReqs);
        });
      } else if (!user) {
        setPreviewPlanOverride(null);
        setPreviewPlanState(null);
        setUserUpgradeRequests([]);
        setAdminUpgradeRequests([]);
        setUserPlan(readStoredPlanState());
      }

      if (user && isAuthorizedAdminEmail(user.email, user.emailVerified)) {
        try {
          await syncAdminProfile(user);
          const loaded = await loadBoothSettings(user);
          setBoothSettings(loaded.settings);
          setIsLoadingRequests(true);
          adminReqUnsub = subscribeAdminUpgradeRequests(user, (liveAllReqs) => {
            setAdminUpgradeRequests(liveAllReqs);
            setIsLoadingRequests(false);
          });
        } catch (err) {
          console.error('Failed to sync owner booth settings:', err);
          setIsLoadingRequests(false);
        }
      }
    });

    return () => {
      cleanupUserListeners();
      unsubscribeAuth();
    };
  }, []);

  // Auto-Reset Sesi (3 Menit inaktif) saat toggle diaktifkan oleh Owner
  useEffect(() => {
    if (!boothSettings.autoResetEnabled || currentTab === 'admin') {
      return;
    }

    const INACTIVITY_MS = 180_000;
    let timerId: number | undefined;

    const resetSessionOnIdle = () => {
      setCapturedFrames([]);
      setLockModalOpen(false);
      setUnlockModalOpen(false);
      setCurrentTab('beranda');
    };

    const scheduleReset = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(resetSessionOnIdle, INACTIVITY_MS);
    };

    scheduleReset();
    window.addEventListener('pointerdown', scheduleReset, { passive: true });
    window.addEventListener('keydown', scheduleReset);
    window.addEventListener('touchstart', scheduleReset, { passive: true });

    return () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
      window.removeEventListener('pointerdown', scheduleReset);
      window.removeEventListener('keydown', scheduleReset);
      window.removeEventListener('touchstart', scheduleReset);
    };
  }, [boothSettings.autoResetEnabled, currentTab]);

  // Listen for /admin, #admin, ?admin=1 URL changes & keyboard shortcut (Ctrl/Cmd + Shift + A)
  useEffect(() => {
    const checkAdminRoute = () => {
      if (isAdminEntryUrl(window.location.pathname, window.location.hash, window.location.search)) {
        setCurrentTab('admin');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!kioskLocked) {
          setCurrentTab('admin');
        } else {
          setUnlockModalOpen(true);
        }
      }
    };

    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [kioskLocked]);

  // Load gallery items from localStorage with fallback
  const [galleryItems, setGalleryItems] = useState<GalleryStrip[]>(() => {
    try {
      const stored = localStorage.getItem('posara_gallery_strips');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_GALLERY_STRIPS;
  });

  // Sync gallery items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('posara_gallery_strips', JSON.stringify(galleryItems));
    } catch {
      // silent
    }
  }, [galleryItems]);

  // Reset scroll to top on view navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  const handleRequestUpgrade = (reason: string, isQuotaExhausted = false) => {
    setLockModalReason(reason);
    setLockModalQuotaExhausted(isQuotaExhausted);
    setLockModalOpen(true);
  };

  const handleConsumeCredit = async (): Promise<boolean> => {
    const normalized = normalizeMonthlyPlanState(effectivePlanState);
    const { allowed, nextState } = consumePlanCredit(normalized);

    if (!allowed) {
      handleRequestUpgrade(
        'Kuota 20 kredit gratis kamu bulan ini sudah habis. Upgrade ke paket berlangganan atau tunggu reset di bulan berikutnya.',
        true
      );
      return false;
    }

    if (isOwnerAuthenticated && previewPlanOverride && previewPlanState) {
      setPreviewPlanState(nextState);
      return true;
    }

    setUserPlan(nextState);
    if (currentUser && currentUser.emailVerified) {
      try {
        await persistUserPlanCredits(currentUser, nextState);
      } catch (err) {
        console.error('Failed to persist credit deduction:', err);
      }
    }
    return true;
  };

  const handleUpdateSettings = (updates: Partial<SessionSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = PHOTO_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    if (isTemplateLocked(template, effectivePlanState.plan)) {
      handleRequestUpgrade(
        `Template "${template.name}" terkunci untuk pengguna Free. Upgrade paket untuk memakai seluruh 22 template eksklusif.`
      );
      return;
    }

    const patternDef = FRAME_PATTERN_OPTIONS.find((p) => p.id === template.defaultPattern);
    const safePattern =
      patternDef && isPatternLocked(patternDef, effectivePlanState.plan)
        ? 'none'
        : template.defaultPattern || 'none';

    handleUpdateSettings({
      templateId,
      frameColor: template.defaultBg || 'bg-surface-container-lowest',
      framePattern: safePattern
    });
    setCapturedFrames([]);
    setRetakeFrameIndex(null);
  };

  const handleSaveToGallery = (newStrip: GalleryStrip) => {
    setGalleryItems((prev) => [newStrip, ...prev]);
  };

  const handleToggleFavorite = (stripId: string) => {
    setGalleryItems((prev) =>
      prev.map((s) => (s.id === stripId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  };

  const handleDeleteStrip = (stripId: string) => {
    setGalleryItems((prev) => prev.filter((s) => s.id !== stripId));
  };

  const handleSelectStripToEdit = (strip: GalleryStrip) => {
    const template = PHOTO_TEMPLATES.find((t) => t.id === strip.templateId);
    const patternDef = FRAME_PATTERN_OPTIONS.find((p) => p.id === strip.framePattern);

    setSettings((prev) => ({
      ...prev,
      templateId:
        template && !isTemplateLocked(template, effectivePlanState.plan)
          ? strip.templateId
          : INITIAL_SESSION_SETTINGS.templateId,
      frameColor: strip.frameColor,
      framePattern:
        patternDef && !isPatternLocked(patternDef, effectivePlanState.plan)
          ? strip.framePattern || 'none'
          : 'none',
      frameCorner: strip.frameCorner || 'rounded',
      frameInnerBorder: strip.frameInnerBorder || 'none',
      caption: strip.caption,
      stickers: strip.stickers || ['✨', '✨']
    }));
    setCapturedFrames(strip.frames);
    setCurrentTab('hasil-unduh');
  };

  const handleExitAdminToVisitor = () => {
    const cleanUrl = getCleanVisitorUrl(window.location.href);
    window.history.replaceState(null, '', cleanUrl);
    setCurrentTab('beranda');
  };

  const handleSignInOwner = async () => {
    await signInOwnerWithGoogle();
  };

  const handleSignOutOwner = async () => {
    await signOutOwner();
    setBoothSettings((prev) => ({
      ...prev,
      kioskPin: DEFAULT_KIOSK_PIN
    }));
    handleSetPreviewPlanOverride(null);
    handleExitAdminToVisitor();
  };

  const handleUpdateBoothSettings = async (next: BoothSettingsData) => {
    if (!currentUser || !isOwnerAuthenticated) {
      throw new Error('Unauthorized');
    }
    setIsSavingSettings(true);
    try {
      await saveBoothSettings(currentUser, next);
      setBoothSettings(next);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUnlockKiosk = () => {
    if (verifyKioskPin(unlockPinInput, boothSettings.kioskPin)) {
      setKioskLocked(false);
      setUnlockModalOpen(false);
      setUnlockPinInput('');
      setUnlockPinError(null);
      setCurrentTab('admin');
    } else {
      setUnlockPinError('PIN salah! Hanya Owner yang dapat membuka kunci.');
      setUnlockPinInput('');
    }
  };

  const handleUnlockViaGoogleOwner = async () => {
    try {
      const signedInUser = await signInOwnerWithGoogle();
      if (isAuthorizedAdminEmail(signedInUser.email, signedInUser.emailVerified)) {
        setKioskLocked(false);
        setUnlockModalOpen(false);
        setUnlockPinInput('');
        setUnlockPinError(null);
        setCurrentTab('admin');
      } else {
        setUnlockPinError('Akun Google tersebut bukan Owner terdaftar.');
      }
    } catch {
      setUnlockPinError('Verifikasi Google dibatalkan atau gagal.');
    }
  };

  const handleRefreshUpgradeRequests = async () => {
    if (!currentUser || !isOwnerAuthenticated) return;
    setIsLoadingRequests(true);
    try {
      const allRequests = await loadAllUpgradeRequestsForAdmin(currentUser);
      setAdminUpgradeRequests(allRequests);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleReviewUpgradeRequest = async (
    request: UpgradeRequestRecord,
    decision: 'approved' | 'rejected'
  ) => {
    if (!currentUser || !isOwnerAuthenticated) {
      throw new Error('Unauthorized');
    }
    await reviewUpgradeRequestAsAdmin(currentUser, request, decision);
    const updated = await loadAllUpgradeRequestsForAdmin(currentUser);
    setAdminUpgradeRequests(updated);

    if (request.uid === currentUser.uid) {
      const reloadedPlan = await loadOrCreateUserPlan(currentUser);
      setUserPlan(reloadedPlan);
      const myRequests = await loadUserUpgradeRequests(currentUser);
      setUserUpgradeRequests(myRequests);
    }
  };

  const handleSignInVisitor = async () => {
    await signInVisitorWithGoogle();
  };

  const handleSignOutVisitor = async () => {
    await signOutUser();
    setPreviewPlanOverride(null);
    setPreviewPlanState(null);
    setUserUpgradeRequests([]);
    setAdminUpgradeRequests([]);
    setBoothSettings((prev) => ({
      ...prev,
      kioskPin: DEFAULT_KIOSK_PIN
    }));
    setUserPlan(readStoredPlanState());
  };

  const handleSubmitUpgradeRequest = async (payload: {
    requestedPlan: Exclude<PlanTier, 'free'>;
    billingCycle: BillingCycle;
    amountIdr: number;
    referenceCode: string;
    invoiceNumber?: string;
    paymentNote: string;
  }) => {
    if (!currentUser) {
      throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');
    }
    const created = await submitUpgradeRequest(currentUser, payload);
    setUserUpgradeRequests((prev) => [created, ...prev]);
    if (isOwnerAuthenticated) {
      setAdminUpgradeRequests((prev) => [created, ...prev]);
    }
  };

  const activeEventBranding = getActiveEventBranding(boothSettings);

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2c] flex flex-col font-body selection:bg-[#d5e4f8] selection:text-[#001632]">
      {/* Kiosk Mode Floating Indicator & Unlock Button */}
      {kioskLocked && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
          <div className="bg-[#142b4a]/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            <span>Mode Kiosk Terkunci</span>
          </div>
          <button
            type="button"
            onClick={() => setUnlockModalOpen(true)}
            className="w-8 h-8 rounded-full bg-white/90 text-[#142b4a] flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
            title="Buka Kunci Kiosk (Owner)"
            aria-label="Buka Kunci Kiosk"
          >
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
          </button>
        </div>
      )}

      {/* Main App Header (Admin button hidden unless verified Owner is signed in) */}
      {!kioskLocked && (
        <Header
          currentTab={currentTab}
          onNavigate={(tab) => setCurrentTab(tab)}
          kioskLocked={kioskLocked}
          isOwnerAuthenticated={isOwnerAuthenticated}
          onSecretAdminTrigger={() => setCurrentTab('admin')}
          planTier={effectivePlanState.plan}
          userPhotoUrl={currentUser?.photoURL || null}
          userDisplayName={currentUser?.displayName || currentUser?.email || null}
          isSignedIn={Boolean(currentUser && currentUser.emailVerified)}
        />
      )}

      {/* Main View Router */}
      <main className={`flex-1 w-full flex flex-col ${kioskLocked ? 'pt-4' : 'pt-20'}`}>
        {currentTab === 'beranda' && (
          <HomeView
            planTier={effectivePlanState.plan}
            onRequestUpgrade={handleRequestUpgrade}
            onNavigate={(tab) => setCurrentTab(tab)}
            onSelectTemplate={handleSelectTemplate}
          />
        )}

        {currentTab === 'pilih-template' && (
          <TemplateView
            settings={settings}
            planTier={effectivePlanState.plan}
            creditsRemaining={effectivePlanState.creditsRemaining}
            creditsTotal={effectivePlanState.creditsTotal}
            onRequestUpgrade={handleRequestUpgrade}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'photobooth-kamera' && (
          <CameraView
            settings={settings}
            capturedFrames={capturedFrames}
            retakeFrameIndex={retakeFrameIndex}
            planTier={effectivePlanState.plan}
            creditsRemaining={effectivePlanState.creditsRemaining}
            creditsTotal={effectivePlanState.creditsTotal}
            onRequestUpgrade={handleRequestUpgrade}
            onUpdateSettings={handleUpdateSettings}
            onSetCapturedFrames={(frames) => {
              setRetakeFrameIndex(null);
              setCapturedFrames(frames);
            }}
            onCompleteSingleRetake={(frameIdx, nextFrame) => {
              const selectedTpl =
                PHOTO_TEMPLATES.find((t) => t.id === settings.templateId) || PHOTO_TEMPLATES[0];
              setCapturedFrames((prev) => {
                const base =
                  prev.length > 0
                    ? [...prev]
                    : selectedTpl.previewImages.slice(0, selectedTpl.shots).map((url, idx) => ({
                        id: idx + 1,
                        dataUrl: url,
                        altText: `Pose Frame ${idx + 1}`,
                        capturedAt: Date.now()
                      }));
                base[frameIdx] = nextFrame;
                return base;
              });
              setRetakeFrameIndex(null);
              setCurrentTab('hasil-unduh');
            }}
            onCancelRetake={() => {
              setRetakeFrameIndex(null);
              setCurrentTab('hasil-unduh');
            }}
            onNavigate={(tab) => {
              if (tab !== 'photobooth-kamera') {
                setRetakeFrameIndex(null);
              }
              setCurrentTab(tab);
            }}
          />
        )}

        {currentTab === 'hasil-unduh' && (
          <ResultView
            settings={settings}
            capturedFrames={capturedFrames}
            planTier={effectivePlanState.plan}
            creditsRemaining={effectivePlanState.creditsRemaining}
            creditsTotal={effectivePlanState.creditsTotal}
            onConsumeCredit={handleConsumeCredit}
            onRequestUpgrade={handleRequestUpgrade}
            onUpdateSettings={handleUpdateSettings}
            onSetCapturedFrames={(frames) => {
              setRetakeFrameIndex(null);
              setCapturedFrames(frames);
            }}
            onSaveToGallery={handleSaveToGallery}
            onStartCameraRetake={(frameIdx) => {
              setRetakeFrameIndex(frameIdx);
              setCurrentTab('photobooth-kamera');
            }}
            onNavigate={(tab) => setCurrentTab(tab)}
            eventBrandText={activeEventBranding}
            kioskLocked={kioskLocked}
          />
        )}

        {currentTab === 'galeri' && (
          <GalleryView
            galleryItems={galleryItems}
            planTier={effectivePlanState.plan}
            onConsumeCredit={handleConsumeCredit}
            onRequestUpgrade={handleRequestUpgrade}
            onToggleFavorite={handleToggleFavorite}
            onDeleteStrip={handleDeleteStrip}
            onNavigate={(tab) => setCurrentTab(tab)}
            onSelectStripToEdit={handleSelectStripToEdit}
            eventBrandText={activeEventBranding}
          />
        )}

        {currentTab === 'langganan' && (
          <SubscriptionView
            userPlan={effectivePlanState}
            isOwnerAuthenticated={isOwnerAuthenticated}
            isComplimentaryVip={isComplimentaryVip}
            previewPlanOverride={previewPlanOverride}
            onSetPreviewPlanOverride={handleSetPreviewPlanOverride}
            userEmail={currentUser?.email || null}
            userDisplayName={currentUser?.displayName || null}
            isSignedIn={Boolean(currentUser && currentUser.emailVerified)}
            userRequests={userUpgradeRequests}
            publicQrisMerchantString={boothSettings.qrisMerchantString}
            onSignInVisitor={handleSignInVisitor}
            onSignOutVisitor={handleSignOutVisitor}
            onSubmitUpgradeRequest={handleSubmitUpgradeRequest}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminAccessGate
            user={currentUser}
            authLoading={authLoading}
            kioskLocked={kioskLocked}
            boothSettings={boothSettings}
            isSavingSettings={isSavingSettings}
            previewPlanOverride={previewPlanOverride}
            onSetPreviewPlanOverride={handleSetPreviewPlanOverride}
            upgradeRequests={adminUpgradeRequests}
            isLoadingRequests={isLoadingRequests}
            onRefreshUpgradeRequests={handleRefreshUpgradeRequests}
            onReviewUpgradeRequest={handleReviewUpgradeRequest}
            hasCapturedDraft={capturedFrames.length > 0}
            onClearCapturedDraft={() => {
              setCapturedFrames([]);
              setCurrentTab('beranda');
            }}
            onSignIn={handleSignInOwner}
            onSignOut={handleSignOutOwner}
            onUpdateBoothSettings={handleUpdateBoothSettings}
            onSetKioskLocked={setKioskLocked}
            onNavigate={(tab) => setCurrentTab(tab)}
            onExitToVisitor={handleExitAdminToVisitor}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        kioskLocked={kioskLocked}
      />

      {/* Premium Lock & Free Quota Modal */}
      <PremiumLockModal
        isOpen={lockModalOpen}
        reason={lockModalReason}
        isQuotaExhausted={lockModalQuotaExhausted}
        kioskLocked={kioskLocked}
        onClose={() => setLockModalOpen(false)}
        onGoToSubscription={() => setCurrentTab('langganan')}
      />

      {/* Kiosk Unlock Modal (No PIN leaked in public UI) */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#001632]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-[#e2e8f0] flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#d5e4f8] text-[#142b4a] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[24px]">key</span>
            </div>
            <h3 className="font-headline text-[17px] font-bold text-[#001632]">
              Verifikasi Owner
            </h3>
            <p className="text-[12px] text-[#516070] mt-1 mb-4">
              Masukkan PIN Owner untuk membuka kembali mode pengelola.
            </p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={unlockPinInput}
              onChange={(e) => {
                setUnlockPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                if (unlockPinError) setUnlockPinError(null);
              }}
              placeholder="••••"
              autoFocus
              className="w-40 h-12 text-center text-[24px] font-mono tracking-widest rounded-xl bg-[#f0f3ff] border border-[#e2e8f0] focus:outline-none focus:border-[#142b4a] mb-2"
            />
            {unlockPinError ? (
              <span className="text-[11px] font-bold text-red-600 mb-3">{unlockPinError}</span>
            ) : (
              <span className="text-[11px] text-[#74777e] mb-3">Akses terbatas untuk Owner</span>
            )}

            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setUnlockModalOpen(false);
                  setUnlockPinInput('');
                  setUnlockPinError(null);
                }}
                className="py-2.5 rounded-xl bg-[#f0f3ff] text-[#516070] text-[12px] font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUnlockKiosk}
                className="py-2.5 rounded-xl bg-[#142b4a] text-white text-[12px] font-bold shadow-sm cursor-pointer"
              >
                Buka Kunci
              </button>
            </div>

            <button
              type="button"
              onClick={handleUnlockViaGoogleOwner}
              className="mt-3 text-[11px] font-semibold text-[#142b4a] hover:underline cursor-pointer"
            >
              Atau verifikasi lewat Google Owner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
