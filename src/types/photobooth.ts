export type TemplateType = '4-cut' | '3-cut' | 'grid' | 'polaroid' | '6-cut';

export type TemplateCategory =
  | 'ticket'
  | 'vintage'
  | 'y2k'
  | 'romantic'
  | 'seasonal'
  | 'film';

export interface PhotoTemplate {
  id: string;
  name: string;
  shots: number;
  type: TemplateType;
  category: TemplateCategory;
  ratioLabel: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  defaultBg: string;
  defaultPattern?: FramePatternType;
  previewImages: string[];
  isPremium?: boolean;
}

export type FilterType =
  | 'normal'
  | 'monochrome'
  | 'warm'
  | 'pastel'
  | 'cool'
  | 'kodak-gold'
  | 'seoul-clean'
  | 'cyberpunk'
  | 'noir-high'
  | 'y2k-matrix'
  | 'rose'
  | 'vintage'
  | 'fuji-film'
  | 'cinematic'
  | 'sunset'
  | 'dreamy'
  | 'tokyo-drift';

export interface FilterOption {
  id: FilterType;
  name: string;
  icon: string;
  cssFilter: string;
  previewImg: string;
  isPremium?: boolean;
}

export type FramePatternType =
  | 'none'
  | 'snap-express'
  | 'airmail'
  | 'cinema-ticket'
  | 'barcode-film'
  | 'y2k-comic-blue'
  | 'dark-romance'
  | 'love-blooming'
  | 'spooky-night'
  | 'metallic-stars'
  | 'polka'
  | 'polaroid-ribbon'
  | 'vintage-lace'
  | 'checker'
  | 'hearts'
  | 'stars'
  | 'film-sprocket'
  | 'vintage-kraft'
  | 'gradient-aurora'
  | 'gradient-sunset';

export type FrameCornerType = 'rounded' | 'sharp' | 'pill';
export type FrameBorderType = 'none' | 'white' | 'double' | 'dashed';

export interface FramePatternOption {
  id: FramePatternType;
  name: string;
  icon: string;
  description: string;
  category?: 'trending' | 'motif' | 'texture';
  badge?: string;
  isPremium?: boolean;
}

export interface SessionSettings {
  templateId: string;
  filter: FilterType;
  countdown: number; // in seconds: 3, 5, 10
  screenFlash: boolean;
  frameColor: string;
  framePattern?: FramePatternType;
  frameCorner?: FrameCornerType;
  frameInnerBorder?: FrameBorderType;
  caption: string;
  showTimestamp: boolean;
  timestamp: string;
  stickers: string[];
}

export interface CapturedFrame {
  id: number;
  dataUrl: string;
  altText: string;
  capturedAt: number;
}

export interface GalleryStrip {
  id: string;
  title: string;
  dateStr: string;
  timestamp: number;
  templateId: string;
  templateName: string;
  frameType: TemplateType;
  frameColor: string;
  framePattern?: FramePatternType;
  frameCorner?: FrameCornerType;
  frameInnerBorder?: FrameBorderType;
  frames: CapturedFrame[];
  caption: string;
  isFavorite: boolean;
  fileSizeStr: string;
  formatStr: string;
  stickers?: string[];
}

export type ViewTab = 'beranda' | 'pilih-template' | 'photobooth-kamera' | 'hasil-unduh' | 'galeri' | 'langganan' | 'admin';
