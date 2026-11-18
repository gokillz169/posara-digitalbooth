import { FilterType, TemplateType } from '../types/photobooth';

/**
 * Format a Date object into POSARA authentic Indonesian timestamp format:
 * e.g., "24.10.2024 • 19:42 WIB"
 */
export function formatPhotoboothTimestamp(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} • ${hours}:${minutes} WIB`;
}

/**
 * Generate a unique session code, e.g. "PS-8842X"
 */
export function generateSessionCode(prefix = 'PS'): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const char = chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${num}${char}`;
}

/**
 * Calculate yearly discount price based on monthly fee and discount percentage
 */
export function calculateYearlyDiscount(monthlyPrice: number, discountPercent = 20): {
  monthlyEquivalent: number;
  annualTotal: number;
  totalSaved: number;
} {
  const factor = (100 - discountPercent) / 100;
  const monthlyEquivalent = Math.round(monthlyPrice * factor);
  const annualTotal = monthlyEquivalent * 12;
  const fullAnnual = monthlyPrice * 12;
  const totalSaved = fullAnnual - annualTotal;

  return {
    monthlyEquivalent,
    annualTotal,
    totalSaved
  };
}

/**
 * Calculate remaining credits and percentage used
 */
export function calculateCreditMetrics(totalCredits: number, usedCredits: number): {
  remaining: number;
  percentRemaining: number;
  isLow: boolean;
} {
  const safeTotal = Math.max(totalCredits, 1);
  const remaining = Math.max(0, safeTotal - usedCredits);
  const percentRemaining = Math.round((remaining / safeTotal) * 100);
  const isLow = percentRemaining <= 15;

  return {
    remaining,
    percentRemaining,
    isLow
  };
}

/**
 * Return CSS filter string corresponding to a filter preset
 */
export function getCssFilterString(filter: FilterType): string {
  switch (filter) {
    case 'monochrome':
      return 'grayscale(100%) contrast(115%) brightness(95%)';
    case 'warm':
      return 'sepia(35%) saturate(130%) contrast(105%) brightness(102%)';
    case 'rose':
      return 'hue-rotate(-15deg) saturate(125%) contrast(105%) brightness(105%)';
    case 'vintage':
      return 'sepia(45%) contrast(120%) brightness(90%) hue-rotate(10deg)';
    case 'pastel':
      return 'saturate(115%) brightness(110%) contrast(95%)';
    case 'cool':
      return 'hue-rotate(180deg) saturate(110%) brightness(100%)';
    case 'cyberpunk':
      return 'contrast(125%) saturate(160%) hue-rotate(280deg) brightness(105%)';
    case 'kodak-gold':
      return 'sepia(25%) saturate(145%) contrast(110%) brightness(108%)';
    case 'seoul-clean':
      return 'brightness(108%) contrast(96%) saturate(108%)';
    case 'fuji-film':
      return 'hue-rotate(25deg) saturate(120%) contrast(108%) brightness(102%)';
    case 'cinematic':
      return 'contrast(135%) brightness(90%) saturate(115%)';
    case 'sunset':
      return 'sepia(40%) saturate(160%) brightness(105%) hue-rotate(-20deg)';
    case 'noir-high':
      return 'grayscale(100%) contrast(175%) brightness(92%)';
    case 'dreamy':
      return 'contrast(92%) brightness(115%) saturate(135%)';
    case 'y2k-matrix':
      return 'hue-rotate(90deg) saturate(130%) contrast(115%) brightness(95%)';
    case 'tokyo-drift':
      return 'hue-rotate(210deg) contrast(125%) saturate(125%) brightness(95%)';
    case 'normal':
    default:
      return 'none';
  }
}

/**
 * Calculate frame layout grid configuration for a given template type
 */
export function getTemplateLayoutConfig(type: TemplateType, totalShots: number): {
  columns: number;
  aspectRatio: string;
  isGrid: boolean;
} {
  switch (type) {
    case 'grid':
      return { columns: 2, aspectRatio: '1/1', isGrid: true };
    case 'polaroid':
      return { columns: 1, aspectRatio: totalShots === 1 ? '1/1' : '4/3', isGrid: false };
    case '6-cut':
      return { columns: 1, aspectRatio: '16/9', isGrid: false };
    case '3-cut':
      return { columns: 1, aspectRatio: '4/3', isGrid: false };
    case '4-cut':
    default:
      return { columns: 1, aspectRatio: '4/3', isGrid: false };
  }
}

const LIGHT_OVERRIDE_PATTERNS = new Set([
  'snap-express',
  'airmail',
  'love-blooming',
  'polaroid-ribbon',
  'vintage-kraft',
  'gradient-aurora',
  'gradient-sunset'
]);

const DARK_OVERRIDE_PATTERNS = new Set([
  'cinema-ticket',
  'barcode-film',
  'y2k-comic-blue',
  'dark-romance',
  'metallic-stars',
  'vintage-lace',
  'spooky-night'
]);

const DARK_BASE_COLOR_IDS = new Set([
  'bg-primary',
  'bg-cherry',
  'bg-darkplum'
]);

/**
 * Resolve whether strip typography should render light-on-dark (`true`) or dark-on-light (`false`).
 * Overriding patterns (which paint their own full background) take precedence over the base paper color,
 * whereas transparent/base-preserving patterns (`none`, `polka`, `checker`, `hearts`, `stars`, `film-sprocket`)
 * defer to the base paper color brightness.
 */
export function resolveStripIsDarkBg(
  frameColorId: string,
  framePattern: string | undefined,
  colorTextTheme: 'light' | 'dark'
): boolean {
  const pattern = framePattern || 'none';
  if (LIGHT_OVERRIDE_PATTERNS.has(pattern)) {
    return false;
  }
  if (DARK_OVERRIDE_PATTERNS.has(pattern)) {
    return true;
  }
  return colorTextTheme === 'light' || DARK_BASE_COLOR_IDS.has(frameColorId);
}

