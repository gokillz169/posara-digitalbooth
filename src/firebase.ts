import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BoothSettingsData,
  DEFAULT_KIOSK_PIN,
  INITIAL_BOOTH_SETTINGS,
  INITIAL_PUBLIC_BOOTH_CONFIG,
  PublicBoothConfigData,
  isAuthorizedAdminEmail,
  isComplimentaryStudioEmail,
  isValidKioskPin,
  normalizeQrisMerchantString,
  normalizeWatermarkText
} from './utils/adminAccess';
import {
  BillingCycle,
  FREE_MONTHLY_CREDITS,
  PlanTier,
  UserPlanState,
  createInitialFreePlanState,
  createPlanStateForTier,
  getCurrentCycleKey,
  normalizeMonthlyPlanState
} from './utils/subscription';
import { deriveFallbackInvoiceNumber, generateOrderInvoiceNumber } from './utils/invoice';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'public_booth_config', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInOwnerWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInVisitorWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutOwner(): Promise<void> {
  await signOut(auth);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncAdminProfile(user: User): Promise<void> {
  if (!isAuthorizedAdminEmail(user.email, user.emailVerified)) {
    return;
  }
  const adminPath = `admins/${user.uid}`;
  const adminRef = doc(db, 'admins', user.uid);
  const safeDisplayName = (user.displayName || 'POSARA Owner').trim().slice(0, 100) || 'POSARA Owner';
  try {
    const existingSnap = await getDoc(adminRef);
    if (existingSnap.exists()) {
      await setDoc(
        adminRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: safeDisplayName,
          role: 'owner',
          createdAt: existingSnap.data().createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } else {
      await setDoc(adminRef, {
        uid: user.uid,
        email: user.email,
        displayName: safeDisplayName,
        role: 'owner',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, adminPath);
  }
}

export interface LoadedBoothSettings {
  settings: BoothSettingsData;
  exists: boolean;
}

export async function loadPublicBoothConfig(): Promise<PublicBoothConfigData> {
  const configPath = 'public_booth_config/main';
  const configRef = doc(db, 'public_booth_config', 'main');
  try {
    const snap = await getDoc(configRef);
    if (!snap.exists()) {
      return INITIAL_PUBLIC_BOOTH_CONFIG;
    }
    const data = snap.data();
    return {
      autoResetEnabled: Boolean(data.autoResetEnabled),
      customWatermarkEnabled: Boolean(data.customWatermarkEnabled),
      watermarkText:
        typeof data.watermarkText === 'string'
          ? normalizeWatermarkText(data.watermarkText)
          : '',
      qrisMerchantString:
        typeof data.qrisMerchantString === 'string'
          ? normalizeQrisMerchantString(data.qrisMerchantString)
          : ''
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, configPath);
  }
}

export function subscribePublicBoothConfig(
  onUpdate: (config: PublicBoothConfigData) => void
): Unsubscribe {
  const configPath = 'public_booth_config/main';
  const configRef = doc(db, 'public_booth_config', 'main');
  return onSnapshot(
    configRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(INITIAL_PUBLIC_BOOTH_CONFIG);
        return;
      }
      const data = snap.data();
      onUpdate({
        autoResetEnabled: Boolean(data.autoResetEnabled),
        customWatermarkEnabled: Boolean(data.customWatermarkEnabled),
        watermarkText:
          typeof data.watermarkText === 'string'
            ? normalizeWatermarkText(data.watermarkText)
            : '',
        qrisMerchantString:
          typeof data.qrisMerchantString === 'string'
            ? normalizeQrisMerchantString(data.qrisMerchantString)
            : ''
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, configPath);
      } catch {
        // Structured diagnostic logged via handleFirestoreError
      }
    }
  );
}

export async function loadBoothSettings(user: User): Promise<LoadedBoothSettings> {
  if (!isAuthorizedAdminEmail(user.email, user.emailVerified)) {
    throw new Error('Unauthorized admin access attempt.');
  }
  const settingsPath = 'booth_settings/main';
  const settingsRef = doc(db, 'booth_settings', 'main');
  try {
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) {
      return {
        settings: INITIAL_BOOTH_SETTINGS,
        exists: false
      };
    }
    const data = snap.data();
    return {
      exists: true,
      settings: {
        autoResetEnabled: Boolean(data.autoResetEnabled),
        customWatermarkEnabled: Boolean(data.customWatermarkEnabled),
        watermarkText:
          typeof data.watermarkText === 'string'
            ? normalizeWatermarkText(data.watermarkText)
            : '',
        kioskPin:
          typeof data.kioskPin === 'string' && isValidKioskPin(data.kioskPin)
            ? data.kioskPin
            : DEFAULT_KIOSK_PIN,
        qrisMerchantString:
          typeof data.qrisMerchantString === 'string'
            ? normalizeQrisMerchantString(data.qrisMerchantString)
            : ''
      }
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, settingsPath);
  }
}

export async function saveBoothSettings(
  user: User,
  settings: BoothSettingsData
): Promise<void> {
  if (!isAuthorizedAdminEmail(user.email, user.emailVerified) || !user.email) {
    throw new Error('Unauthorized admin write attempt.');
  }
  const settingsPath = 'booth_settings/main';
  const settingsRef = doc(db, 'booth_settings', 'main');
  const publicRef = doc(db, 'public_booth_config', 'main');
  const safePin = isValidKioskPin(settings.kioskPin) ? settings.kioskPin.trim() : DEFAULT_KIOSK_PIN;
  const safeWatermark = normalizeWatermarkText(settings.watermarkText || '');
  const safeQris = normalizeQrisMerchantString(settings.qrisMerchantString || '');

  try {
    const snap = await getDoc(settingsRef);
    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (snap.exists()) {
      batch.set(
        settingsRef,
        {
          ownerUid: snap.data().ownerUid || user.uid,
          ownerEmail: snap.data().ownerEmail || user.email,
          autoResetEnabled: Boolean(settings.autoResetEnabled),
          customWatermarkEnabled: Boolean(settings.customWatermarkEnabled),
          watermarkText: safeWatermark,
          kioskPin: safePin,
          qrisMerchantString: safeQris,
          createdAt: snap.data().createdAt || now,
          updatedAt: now
        },
        { merge: true }
      );
    } else {
      batch.set(settingsRef, {
        ownerUid: user.uid,
        ownerEmail: user.email,
        autoResetEnabled: Boolean(settings.autoResetEnabled),
        customWatermarkEnabled: Boolean(settings.customWatermarkEnabled),
        watermarkText: safeWatermark,
        kioskPin: safePin,
        qrisMerchantString: safeQris,
        createdAt: now,
        updatedAt: now
      });
    }

    batch.set(publicRef, {
      autoResetEnabled: Boolean(settings.autoResetEnabled),
      customWatermarkEnabled: Boolean(settings.customWatermarkEnabled),
      watermarkText: safeWatermark,
      qrisMerchantString: safeQris,
      updatedAt: now
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export async function loadOrCreateUserPlan(user: User): Promise<UserPlanState> {
  if (!user.emailVerified || !user.email) {
    return createInitialFreePlanState();
  }
  const planPath = `user_plans/${user.uid}`;
  const planRef = doc(db, 'user_plans', user.uid);
  const currentCycle = getCurrentCycleKey();
  const isComplimentaryVip = isComplimentaryStudioEmail(user.email, user.emailVerified);

  try {
    const snap = await getDoc(planRef);
    if (!snap.exists()) {
      const initial = isComplimentaryVip
        ? createPlanStateForTier('studio', currentCycle)
        : createInitialFreePlanState();
      await setDoc(planRef, {
        uid: user.uid,
        email: user.email,
        plan: initial.plan,
        creditsTotal: initial.creditsTotal,
        creditsRemaining: initial.creditsRemaining,
        cycleKey: currentCycle,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return initial;
    }

    const data = snap.data();
    if (isComplimentaryVip) {
      const studioState = createPlanStateForTier('studio', currentCycle);
      if (
        data.plan !== 'studio' ||
        data.creditsTotal !== studioState.creditsTotal ||
        data.creditsRemaining !== studioState.creditsRemaining
      ) {
        await setDoc(
          planRef,
          {
            plan: studioState.plan,
            creditsTotal: studioState.creditsTotal,
            creditsRemaining: studioState.creditsRemaining,
            cycleKey: studioState.cycleKey,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
      return studioState;
    }

    const rawPlan: PlanTier =
      data.plan === 'weekend' || data.plan === 'creator' || data.plan === 'studio'
        ? data.plan
        : 'free';
    const loadedState: UserPlanState = {
      plan: rawPlan,
      creditsTotal: typeof data.creditsTotal === 'number' ? data.creditsTotal : FREE_MONTHLY_CREDITS,
      creditsRemaining:
        typeof data.creditsRemaining === 'number' ? data.creditsRemaining : FREE_MONTHLY_CREDITS,
      cycleKey: typeof data.cycleKey === 'string' ? data.cycleKey : currentCycle
    };

    const normalized = normalizeMonthlyPlanState(loadedState, currentCycle);
    if (normalized.cycleKey !== loadedState.cycleKey) {
      await setDoc(
        planRef,
        {
          creditsRemaining: normalized.creditsRemaining,
          cycleKey: normalized.cycleKey,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    return normalized;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, planPath);
  }
}

export async function persistUserPlanCredits(
  user: User,
  nextState: UserPlanState
): Promise<void> {
  if (!user.emailVerified || !user.email || nextState.plan === 'studio') {
    return;
  }
  const planPath = `user_plans/${user.uid}`;
  const planRef = doc(db, 'user_plans', user.uid);
  try {
    await setDoc(
      planRef,
      {
        creditsRemaining: Math.max(0, Math.floor(nextState.creditsRemaining)),
        cycleKey: nextState.cycleKey || getCurrentCycleKey(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, planPath);
  }
}

export async function adminSetOwnPlanTier(
  adminUser: User,
  tier: PlanTier
): Promise<UserPlanState> {
  if (!isAuthorizedAdminEmail(adminUser.email, adminUser.emailVerified) || !adminUser.email) {
    throw new Error('Only verified POSARA owner can modify plan tiers.');
  }
  const nextState = createPlanStateForTier(tier, getCurrentCycleKey());
  const planPath = `user_plans/${adminUser.uid}`;
  const planRef = doc(db, 'user_plans', adminUser.uid);
  try {
    const snap = await getDoc(planRef);
    await setDoc(planRef, {
      uid: adminUser.uid,
      email: adminUser.email,
      plan: nextState.plan,
      creditsTotal: nextState.creditsTotal,
      creditsRemaining: nextState.creditsRemaining,
      cycleKey: nextState.cycleKey,
      createdAt: snap.exists() ? snap.data().createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return nextState;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, planPath);
  }
}

export type UpgradeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface UpgradeRequestRecord {
  requestId: string;
  uid: string;
  email: string;
  displayName: string;
  requestedPlan: Exclude<PlanTier, 'free'>;
  billingCycle: BillingCycle;
  amountIdr: number;
  referenceCode: string;
  invoiceNumber: string;
  paymentNote: string;
  status: UpgradeRequestStatus;
  reviewedByEmail: string;
  createdAtMs: number;
}

function mapUpgradeRequestDoc(id: string, data: Record<string, unknown>): UpgradeRequestRecord {
  const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  const plan =
    data.requestedPlan === 'weekend' ||
    data.requestedPlan === 'creator' ||
    data.requestedPlan === 'studio'
      ? data.requestedPlan
      : 'creator';
  const cycle: BillingCycle =
    data.billingCycle === 'once' || data.billingCycle === 'yearly' ? data.billingCycle : 'monthly';
  const status: UpgradeRequestStatus =
    data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending';
  const refCode = typeof data.referenceCode === 'string' ? data.referenceCode : '';
  const invCode =
    typeof data.invoiceNumber === 'string' && data.invoiceNumber.trim().length >= 6
      ? data.invoiceNumber.trim().toUpperCase()
      : deriveFallbackInvoiceNumber(refCode, id);

  return {
    requestId: typeof data.requestId === 'string' ? data.requestId : id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Pengguna POSARA',
    requestedPlan: plan,
    billingCycle: cycle,
    amountIdr: typeof data.amountIdr === 'number' ? data.amountIdr : 0,
    referenceCode: refCode,
    invoiceNumber: invCode,
    paymentNote: typeof data.paymentNote === 'string' ? data.paymentNote : '',
    status,
    reviewedByEmail: typeof data.reviewedByEmail === 'string' ? data.reviewedByEmail : '',
    createdAtMs: createdTs
  };
}

export async function submitUpgradeRequest(
  user: User,
  payload: {
    requestedPlan: Exclude<PlanTier, 'free'>;
    billingCycle: BillingCycle;
    amountIdr: number;
    referenceCode: string;
    invoiceNumber?: string;
    paymentNote: string;
  }
): Promise<UpgradeRequestRecord> {
  if (!user.emailVerified || !user.email) {
    throw new Error('Silakan masuk dengan akun Google terverifikasi terlebih dahulu.');
  }

  const requestId = `req_${user.uid.slice(0, 8)}_${Date.now()}`;
  const reqPath = `upgrade_requests/${requestId}`;
  const reqRef = doc(db, 'upgrade_requests', requestId);
  const throttleRef = doc(db, 'checkout_throttles', user.uid);
  const safeDisplayName =
    (user.displayName || user.email.split('@')[0] || 'Pengguna POSARA').trim().slice(0, 100) ||
    'Pengguna POSARA';
  const safeNote = payload.paymentNote.trim().slice(0, 160);
  if (safeNote.length < 4) {
    throw new Error('Mohon isi nama pengirim / aplikasi bayar (minimal 4 karakter).');
  }
  const safeRefCode = payload.referenceCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
  const rawInv = (payload.invoiceNumber || generateOrderInvoiceNumber(payload.requestedPlan))
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
  const safeInvoiceNumber =
    rawInv.length >= 6 ? rawInv : deriveFallbackInvoiceNumber(safeRefCode, requestId);

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    batch.set(throttleRef, {
      uid: user.uid,
      latestRequestId: requestId,
      updatedAt: now
    });
    batch.set(reqRef, {
      requestId,
      uid: user.uid,
      email: user.email,
      displayName: safeDisplayName,
      requestedPlan: payload.requestedPlan,
      billingCycle: payload.billingCycle,
      amountIdr: Math.round(payload.amountIdr),
      referenceCode: safeRefCode,
      invoiceNumber: safeInvoiceNumber,
      paymentNote: safeNote,
      status: 'pending',
      reviewedByEmail: '',
      createdAt: now,
      updatedAt: now
    });
    await batch.commit();

    return {
      requestId,
      uid: user.uid,
      email: user.email,
      displayName: safeDisplayName,
      requestedPlan: payload.requestedPlan,
      billingCycle: payload.billingCycle,
      amountIdr: Math.round(payload.amountIdr),
      referenceCode: safeRefCode,
      invoiceNumber: safeInvoiceNumber,
      paymentNote: safeNote,
      status: 'pending',
      reviewedByEmail: '',
      createdAtMs: Date.now()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, reqPath);
  }
}

export async function loadUserUpgradeRequests(user: User): Promise<UpgradeRequestRecord[]> {
  if (!user.emailVerified || !user.email) {
    return [];
  }
  const reqPath = 'upgrade_requests';
  try {
    const q = query(
      collection(db, 'upgrade_requests'),
      where('uid', '==', user.uid),
      limit(25)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapUpgradeRequestDoc(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, reqPath);
  }
}

export async function loadAllUpgradeRequestsForAdmin(
  adminUser: User
): Promise<UpgradeRequestRecord[]> {
  if (!isAuthorizedAdminEmail(adminUser.email, adminUser.emailVerified)) {
    throw new Error('Unauthorized admin list attempt.');
  }
  const reqPath = 'upgrade_requests';
  try {
    const q = query(
      collection(db, 'upgrade_requests'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapUpgradeRequestDoc(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, reqPath);
  }
}

export async function reviewUpgradeRequestAsAdmin(
  adminUser: User,
  request: UpgradeRequestRecord,
  decision: 'approved' | 'rejected'
): Promise<void> {
  if (!isAuthorizedAdminEmail(adminUser.email, adminUser.emailVerified) || !adminUser.email) {
    throw new Error('Hanya Owner POSARA yang dapat memverifikasi permintaan upgrade.');
  }

  const reqPath = `upgrade_requests/${request.requestId}`;
  const reqRef = doc(db, 'upgrade_requests', request.requestId);
  const planRef = doc(db, 'user_plans', request.uid);

  try {
    const batch = writeBatch(db);
    batch.update(reqRef, {
      status: decision,
      reviewedByEmail: adminUser.email,
      updatedAt: serverTimestamp()
    });

    if (decision === 'approved') {
      const nextPlan = createPlanStateForTier(request.requestedPlan, getCurrentCycleKey());
      const existingPlanSnap = await getDoc(planRef);
      if (existingPlanSnap.exists()) {
        batch.update(planRef, {
          plan: nextPlan.plan,
          creditsTotal: nextPlan.creditsTotal,
          creditsRemaining: nextPlan.creditsRemaining,
          cycleKey: nextPlan.cycleKey,
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(planRef, {
          uid: request.uid,
          email: request.email,
          plan: nextPlan.plan,
          creditsTotal: nextPlan.creditsTotal,
          creditsRemaining: nextPlan.creditsRemaining,
          cycleKey: nextPlan.cycleKey,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reqPath);
  }
}

export function subscribeUserPlan(
  user: User,
  onUpdate: (planState: UserPlanState) => void
): Unsubscribe {
  const planPath = `user_plans/${user.uid}`;
  const planRef = doc(db, 'user_plans', user.uid);
  const isComplimentaryVip = isComplimentaryStudioEmail(user.email, user.emailVerified);
  return onSnapshot(
    planRef,
    (snap) => {
      const currentCycle = getCurrentCycleKey();
      if (isComplimentaryVip) {
        onUpdate(createPlanStateForTier('studio', currentCycle));
        return;
      }
      if (!snap.exists()) {
        return;
      }
      const data = snap.data();
      const rawPlan: PlanTier =
        data.plan === 'weekend' || data.plan === 'creator' || data.plan === 'studio'
          ? data.plan
          : 'free';
      const loadedState: UserPlanState = {
        plan: rawPlan,
        creditsTotal: typeof data.creditsTotal === 'number' ? data.creditsTotal : FREE_MONTHLY_CREDITS,
        creditsRemaining:
          typeof data.creditsRemaining === 'number' ? data.creditsRemaining : FREE_MONTHLY_CREDITS,
        cycleKey: typeof data.cycleKey === 'string' ? data.cycleKey : currentCycle
      };
      onUpdate(normalizeMonthlyPlanState(loadedState, currentCycle));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, planPath);
      } catch {
        // Structured diagnostic logged via handleFirestoreError
      }
    }
  );
}

export function subscribeUserUpgradeRequests(
  user: User,
  onUpdate: (requests: UpgradeRequestRecord[]) => void
): Unsubscribe {
  const reqPath = 'upgrade_requests';
  const q = query(collection(db, 'upgrade_requests'), where('uid', '==', user.uid), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs
        .map((d) => mapUpgradeRequestDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onUpdate(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, reqPath);
      } catch {
        // Structured diagnostic logged via handleFirestoreError
      }
    }
  );
}

export function subscribeAdminUpgradeRequests(
  adminUser: User,
  onUpdate: (requests: UpgradeRequestRecord[]) => void
): Unsubscribe {
  if (!isAuthorizedAdminEmail(adminUser.email, adminUser.emailVerified)) {
    return () => {};
  }
  const reqPath = 'upgrade_requests';
  const q = query(
    collection(db, 'upgrade_requests'),
    orderBy('createdAt', 'desc'),
    limit(60)
  );
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs
        .map((d) => mapUpgradeRequestDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onUpdate(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, reqPath);
      } catch {
        // Structured diagnostic logged via handleFirestoreError
      }
    }
  );
}
