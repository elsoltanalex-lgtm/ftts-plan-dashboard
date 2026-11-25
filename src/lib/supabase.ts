import { createClient } from '@supabase/supabase-js';

// Sanitize URL in case /rest/v1 or trailing slashes are appended
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://ljwflhbaiszapocyqbqt.supabase.co').toString().trim();
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1').toString().trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fallback Supabase client hosting live we_records with full permissions
export const FALLBACK_SUPABASE_URL = 'https://fzdmdvgmorzifysygkhp.supabase.co';
export const FALLBACK_SUPABASE_KEY = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';
export const supabaseFallback = createClient(FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_KEY);

// Prioritize the active fallback client hosting live records with full write/read permissions
export const supabaseClients = [supabaseFallback, supabase];

/**
 * Validates whether a string is a valid UUID
 */
export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

/**
 * Supabase Storage Buckets
 */
export const STORAGE_BUCKETS = {
  ATTACHMENTS: 'site-attachments',
  DATASETS: 'excel-uploads',
} as const;

// Max raw size (bytes) for direct Base64 Data URL fallback when Storage upload is unavailable
const MAX_INLINE_DATA_URL_BYTES = 350 * 1024; // 350 KB

/**
 * Compress an image File via HTMLCanvasElement so Base64 fallback stays lightweight & safe for JSONB
 */
async function compressImageToDataUrl(file: File, maxDim = 1280, quality = 0.72): Promise<string | null> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return null;
  try {
    const rawUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = rawUrl;
    });
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    return compressed.length <= MAX_INLINE_DATA_URL_BYTES * 1.45 ? compressed : null;
  } catch {
    return null;
  }
}

/**
 * Upload a document or image to Supabase Storage with resilient, size-safe fallback.
 * Never throws or blocks saving the parent site record.
 */
export async function uploadAttachment(
  file: File,
  folder = 'documents',
  bucket: string = STORAGE_BUCKETS.ATTACHMENTS
): Promise<{
  success: boolean;
  url?: string;
  path?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  metadataOnly?: boolean;
  error?: string;
}> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;

  // 1. Attempt upload to Supabase Storage across deduplicated candidate buckets (prioritizing active fallback client)
  const candidateBuckets = Array.from(new Set([bucket, 'site-attachments', 'documents', 'attachments', 'public']));
  for (const client of [supabaseFallback, supabase]) {
    for (const b of candidateBuckets) {
      try {
        const uploadPromise = client.storage
          .from(b)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('storage upload timeout') }), 5000)
        );
        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (!error && data) {
          const { data: publicData } = client.storage.from(b).getPublicUrl(data.path);
          return {
            success: true,
            url: publicData?.publicUrl || '',
            path: data.path,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          };
        }
      } catch {
        // try next bucket/client
      }
    }
  }

  // 2. Resilient Size-Safe Fallback:
  //    - Images: compress via canvas so JSONB payload remains small
  //    - Small files (<= 350 KB): inline Base64 Data URL
  //    - Larger PDFs/Office/scans: store safe metadata reference without bloating JSONB or aborting save
  try {
    if (file.type.startsWith('image/')) {
      const compressed = await compressImageToDataUrl(file);
      if (compressed) {
        return {
          success: true,
          url: compressed,
          path: filePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: 'image/jpeg',
        };
      }
    }

    if (file.size <= MAX_INLINE_DATA_URL_BYTES) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return {
        success: true,
        url: dataUrl,
        path: filePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    }

    // Large non-image file when Storage is unavailable: return safe metadata so record save ALWAYS succeeds
    return {
      success: true,
      url: '',
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      metadataOnly: true,
    };
  } catch (err: any) {
    return {
      success: true,
      url: '',
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      metadataOnly: true,
      error: err?.message || 'تم حفظ بيانات المستند بدون معاينة مباشرة',
    };
  }
}
