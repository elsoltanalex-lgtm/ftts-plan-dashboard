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
 * Upload a document or image to Supabase Storage
 */
export async function uploadAttachment(
  file: File,
  folder = 'documents',
  bucket: string = STORAGE_BUCKETS.ATTACHMENTS
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;

  for (const client of [supabase, supabaseFallback]) {
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = client.storage.from(bucket).getPublicUrl(data.path);
        return {
          success: true,
          url: publicData?.publicUrl || '',
          path: data.path,
        };
      }
    } catch {
      // try fallback client
    }
  }

  return { success: false, error: 'Failed to upload attachment to storage' };
}
