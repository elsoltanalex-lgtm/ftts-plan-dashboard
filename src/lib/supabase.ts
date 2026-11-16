import { createClient } from '@supabase/supabase-js';

// Sanitize URL in case /rest/v1 or trailing slashes are appended
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://ljwflhbaiszapocyqbqt.supabase.co').toString().trim();
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1').toString().trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload error:', error.message);
      return { success: false, error: error.message };
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return {
      success: true,
      url: publicData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to upload attachment' };
  }
}
