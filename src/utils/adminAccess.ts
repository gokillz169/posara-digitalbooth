export const OWNER_EMAIL = 'mutawakkils16@gmail.com';
export const COMPLIMENTARY_STUDIO_EMAILS = [
  OWNER_EMAIL,
  'fitriyaninovitasari8@gmail.com'
] as const;
export const DEFAULT_KIOSK_PIN = '2025';
export const MAX_WATERMARK_LENGTH = 80;

export const MAX_QRIS_STRING_LENGTH = 512;

export interface BoothSettingsData {
  autoResetEnabled: boolean;
  customWatermarkEnabled: boolean;
  watermarkText: string;
  kioskPin: string;
  qrisMerchantString?: string;
}

export interface PublicBoothConfigData {
  autoResetEnabled: boolean;
  customWatermarkEnabled: boolean;
  watermarkText: string;
  qrisMerchantString: string;
}

export const INITIAL_BOOTH_SETTINGS: BoothSettingsData = {
  autoResetEnabled: false,
  customWatermarkEnabled: false,
  watermarkText: '',
  kioskPin: DEFAULT_KIOSK_PIN,
  qrisMerchantString: ''
};

export const INITIAL_PUBLIC_BOOTH_CONFIG: PublicBoothConfigData = {
  autoResetEnabled: false,
  customWatermarkEnabled: false,
  watermarkText: '',
  qrisMerchantString: ''
};

export function normalizeQrisMerchantString(raw: string): string {
  return raw.trim().slice(0, MAX_QRIS_STRING_LENGTH);
}

export function isAuthorizedAdminEmail(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  if (emailVerified !== true || typeof email !== 'string') {
    return false;
  }
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export function isComplimentaryStudioEmail(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  if (emailVerified !== true || typeof email !== 'string') {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return (COMPLIMENTARY_STUDIO_EMAILS as readonly string[]).includes(normalized);
}

export function isAdminEntryUrl(pathname: string, hash: string, search: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase();
  if (normalizedPath === '/admin' || normalizedPath.endsWith('/admin')) {
    return true;
  }

  const normalizedHash = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (normalizedHash === 'admin') {
    return true;
  }

  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const adminParam = (params.get('admin') || '').toLowerCase();
  const modeParam = (params.get('mode') || '').toLowerCase();
  return adminParam === '1' || adminParam === 'true' || modeParam === 'admin';
}

export function isValidKioskPin(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin.trim());
}

export function verifyKioskPin(inputPin: string, configuredPin: string): boolean {
  const cleanConfigured = configuredPin.trim();
  const cleanInput = inputPin.trim();
  if (!isValidKioskPin(cleanConfigured) || !isValidKioskPin(cleanInput)) {
    return false;
  }
  return cleanInput === cleanConfigured;
}

export function normalizeWatermarkText(text: string): string {
  return text.trim().slice(0, MAX_WATERMARK_LENGTH);
}

export function getActiveEventBranding(
  settings: Pick<BoothSettingsData, 'customWatermarkEnabled' | 'watermarkText'>
): string {
  if (!settings.customWatermarkEnabled) {
    return '';
  }
  return normalizeWatermarkText(settings.watermarkText || '');
}

export function getCleanVisitorUrl(href: string): string {
  try {
    const url = new URL(href);
    if (url.pathname.replace(/\/+$/, '').toLowerCase().endsWith('/admin')) {
      url.pathname = url.pathname.replace(/\/admin\/?$/i, '/') || '/';
    }
    if (url.hash.replace(/^#\/?/, '').trim().toLowerCase() === 'admin') {
      url.hash = '';
    }
    url.searchParams.delete('admin');
    if ((url.searchParams.get('mode') || '').toLowerCase() === 'admin') {
      url.searchParams.delete('mode');
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
