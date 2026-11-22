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

export const supabaseClients = [supabase, supabaseFallback];

/**
 * Supabase Storage Buckets
 */
export const STORAGE_BUCKETS = {
  ATTACHMENTS: 'site-attachments',
  DATASETS: 'excel-uploads',
} as const;

/**
 * Upload a document or image to Supabase Storage with resilient fallback
 */
export async function uploadAttachment(
  file: File,
  folder = 'documents',
  bucket: string = STORAGE_BUCKETS.ATTACHMENTS
): Promise<{ success: boolean; url?: string; path?: string; fileName?: string; fileSize?: number; error?: string }> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;

  // 1. Attempt upload to Supabase Storage across clients and common bucket names
  const candidateBuckets = [bucket, 'site-attachments', 'documents', 'attachments', 'public'];
  for (const client of [supabaseFallback, supabase]) {
    for (const b of candidateBuckets) {
      try {
        const { data, error } = await client.storage
          .from(b)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!error && data) {
          const { data: publicData } = client.storage.from(b).getPublicUrl(data.path);
          return {
            success: true,
            url: publicData?.publicUrl || '',
            path: data.path,
            fileName: file.name,
            fileSize: file.size,
          };
        }
      } catch {
        // try next bucket/client
      }
    }
  }

  // 2. Resilient Fallback: Read file as Base64 Data URL so it is persistently stored in JSONB & readable offline/cloud
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      success: true,
      url: dataUrl,
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل في حفظ وقراءة المستند' };
  }
}
