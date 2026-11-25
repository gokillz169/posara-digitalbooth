import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { GalleryStrip } from './types/photobooth';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '');

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const SUPABASE_PHOTOS_BUCKET = 'posara-photos';

/**
 * Helper to convert base64 dataURL to standard binary Blob
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const parts = dataUrl.split(';base64,');
  const mimeType = parts[0]?.replace('data:', '') || 'image/jpeg';
  const byteString = atob(parts[1] || '');
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return { blob: new Blob([uint8Array], { type: mimeType }), mimeType };
}

/**
 * Uploads a photo image to Supabase Storage and returns its public URL.
 * Falls back gracefully to null if Supabase is unconfigured or upload fails.
 */
export async function uploadImageToSupabase(
  dataUrl: string,
  filePathPrefix: string = 'strips'
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    const { blob, mimeType } = dataUrlToBlob(dataUrl);
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `${filePathPrefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_PHOTOS_BUCKET)
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.warn('Supabase storage upload notice:', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_PHOTOS_BUCKET)
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Failed to upload image to Supabase Storage:', err);
    return null;
  }
}

/**
 * Automatically backs up a gallery strip's frames to Supabase Storage.
 * Replaces heavy base64 strings with lightweight Supabase Storage URLs when successful.
 */
export async function backupStripToSupabase(strip: GalleryStrip): Promise<GalleryStrip> {
  if (!supabase || !isSupabaseConfigured) {
    return strip;
  }

  try {
    const uploadedFrames = await Promise.all(
      strip.frames.map(async (frame, idx) => {
        if (!frame.dataUrl.startsWith('data:image/')) {
          // Already a remote/storage URL
          return frame;
        }
        const cloudUrl = await uploadImageToSupabase(frame.dataUrl, `strip_${strip.id}_frame_${idx + 1}`);
        if (cloudUrl) {
          return { ...frame, dataUrl: cloudUrl };
        }
        return frame;
      })
    );

    return {
      ...strip,
      frames: uploadedFrames
    };
  } catch (err) {
    console.warn('Backup strip to Supabase fallback:', err);
    return strip;
  }
}
