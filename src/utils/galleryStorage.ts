import type { GalleryStrip } from '../types/photobooth';
import { backupStripToSupabase } from '../supabase';

const DB_NAME = 'posara_photobooth_db';
const DB_VERSION = 1;
const STORE_NAME = 'gallery_strips';
const LEGACY_STORAGE_KEY = 'posara_gallery_strips';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads all gallery strips from IndexedDB, with graceful migration from localStorage.
 */
export async function loadGalleryStrips(): Promise<GalleryStrip[]> {
  try {
    const db = await openDatabase();
    const strips = await new Promise<GalleryStrip[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as GalleryStrip[]) || []);
      request.onerror = () => reject(request.error);
    });

    if (strips.length > 0) {
      // Sort newest first
      return strips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
  } catch (err) {
    console.warn('IndexedDB load fallback to localStorage:', err);
  }

  // Fallback & migration from legacy localStorage
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const parsed: GalleryStrip[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Asynchronously migrate to IndexedDB in background
        void saveAllGalleryStrips(parsed);
        return parsed;
      }
    }
  } catch {
    // silent
  }

  return [];
}

/**
 * Saves all gallery strips to IndexedDB safely.
 */
export async function saveAllGalleryStrips(strips: GalleryStrip[]): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const strip of strips) {
        store.put(strip);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Failed to save gallery in IndexedDB:', err);
    // If IndexedDB fails, save metadata-only or trimmed version to localStorage
    try {
      const trimmed = strips.slice(0, 5); // limit to last 5 to avoid QuotaExceeded
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }
}

/**
 * Saves a new strip to gallery with automatic Supabase Cloud Backup & IndexedDB persistence.
 */
export async function persistNewGalleryStrip(
  strip: GalleryStrip,
  currentStrips: GalleryStrip[],
  onCloudBackedUp?: (updatedStrip: GalleryStrip) => void
): Promise<GalleryStrip[]> {
  const nextList = [strip, ...currentStrips.filter((s) => s.id !== strip.id)];

  // 1. Immediately persist to high-capacity IndexedDB
  await saveAllGalleryStrips(nextList);

  // 2. Asynchronously upload images to Supabase Storage in background
  void backupStripToSupabase(strip).then(async (backedUpStrip) => {
    if (backedUpStrip !== strip) {
      const updatedList = nextList.map((s) => (s.id === strip.id ? backedUpStrip : s));
      await saveAllGalleryStrips(updatedList);
      onCloudBackedUp?.(backedUpStrip);
    }
  });

  return nextList;
}

/**
 * Deletes a strip from IndexedDB
 */
export async function deleteGalleryStrip(
  stripId: string,
  currentStrips: GalleryStrip[]
): Promise<GalleryStrip[]> {
  const nextList = currentStrips.filter((s) => s.id !== stripId);
  await saveAllGalleryStrips(nextList);
  return nextList;
}

/**
 * Toggles favorite state of a strip
 */
export async function toggleStripFavorite(
  stripId: string,
  currentStrips: GalleryStrip[]
): Promise<GalleryStrip[]> {
  const nextList = currentStrips.map((s) =>
    s.id === stripId ? { ...s, isFavorite: !s.isFavorite } : s
  );
  await saveAllGalleryStrips(nextList);
  return nextList;
}
