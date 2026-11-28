// src/utils/deletedSitesSync.ts
// Authoritative Cloud & Cross-Device Deleted Site Codes Synchronization Service

import { supabaseClients } from '../lib/supabase';

export const SYNC_DELETED_CODES_ID = '00000000-0000-0000-0000-000000000001';
export const SYNC_DELETED_CODES_SITE_CODE = '__FTTS_DELETED_CODES__';
export const SYNC_APP_USERS_ID = '00000000-0000-0000-0000-000000000002';
export const SYNC_APP_USERS_SITE_CODE = '__FTTS_APP_USERS__';
export const SYNC_SESSIONS_ID = '00000000-0000-0000-0000-000000000003';
export const SYNC_SESSIONS_SITE_CODE = '__FTTS_USER_SESSIONS__';
export const SYNC_ACTIVITY_LOGS_ID = '00000000-0000-0000-0000-000000000004';
export const SYNC_ACTIVITY_LOGS_SITE_CODE = '__FTTS_ACTIVITY_LOGS__';

export function isSystemSyncRecord(siteCode?: string | null, id?: string | null): boolean {
  const sc = String(siteCode || '').trim().toUpperCase();
  const normId = String(id || '').trim().toUpperCase();
  return (
    sc === SYNC_DELETED_CODES_SITE_CODE ||
    sc === SYNC_APP_USERS_SITE_CODE ||
    sc === SYNC_SESSIONS_SITE_CODE ||
    sc === SYNC_ACTIVITY_LOGS_SITE_CODE ||
    normId === SYNC_DELETED_CODES_ID.toUpperCase() ||
    normId === SYNC_APP_USERS_ID.toUpperCase() ||
    normId === SYNC_SESSIONS_ID.toUpperCase() ||
    normId === SYNC_ACTIVITY_LOGS_ID.toUpperCase()
  );
}

export const FTTS_DELETED_CODES_KEY = 'ftts_deleted_site_codes_v3';
export const WE_DELETED_CODES_KEY = 'we_deleted_codes_cache';

const DELETED_CODES_EVENT = 'ftts:deleted_codes_changed';

// In-memory set for instantaneous synchronous lookups
let inMemoryDeletedCodes: Set<string> | null = null;

/**
 * Normalizes a site code: trims, converts to uppercase, and extracts bare code if operator-prefixed
 */
export function normalizeSiteCode(code?: string | null): string {
  if (!code) return '';
  return String(code).trim().toUpperCase();
}

/**
 * Returns all variants of a code (full and stripped of operator prefixes)
 */
export function getCodeVariants(code?: string | null): string[] {
  const norm = normalizeSiteCode(code);
  if (!norm) return [];
  const variants = [norm];
  const bare = norm.replace(/^(VDF-|VODAFONE-|ORG-|ORANGE-|ETAH-|WE-)/i, '').trim();
  if (bare && bare !== norm) {
    variants.push(bare);
  }
  return variants;
}

/**
 * Returns all possible bare + operator-prefixed variants to ensure complete restoration when re-adding a site
 */
export function getAllRestoreVariants(code?: string | null): string[] {
  const norm = normalizeSiteCode(code);
  if (!norm) return [];
  const bare = norm.replace(/^(VDF-|VODAFONE-|ORG-|ORANGE-|ETAH-|WE-)/i, '').trim();
  const set = new Set<string>([norm]);
  if (bare) {
    set.add(bare);
    set.add(`VDF-${bare}`);
    set.add(`VODAFONE-${bare}`);
    set.add(`ORG-${bare}`);
    set.add(`ORANGE-${bare}`);
    set.add(`ETAH-${bare}`);
    set.add(`WE-${bare}`);
  }
  return Array.from(set);
}

/**
 * Reads deleted site codes from localStorage (fallback & instant boot)
 */
export function getLocalDeletedCodes(): Set<string> {
  if (inMemoryDeletedCodes) return new Set(inMemoryDeletedCodes);

  const set = new Set<string>();
  if (typeof window === 'undefined') return set;

  try {
    const raw1 = localStorage.getItem(FTTS_DELETED_CODES_KEY);
    if (raw1) {
      const arr1 = JSON.parse(raw1);
      if (Array.isArray(arr1)) {
        arr1.forEach((c) => {
          getCodeVariants(c).forEach((v) => set.add(v));
        });
      }
    }
    const raw2 = localStorage.getItem(WE_DELETED_CODES_KEY);
    if (raw2) {
      const arr2 = JSON.parse(raw2);
      if (Array.isArray(arr2)) {
        arr2.forEach((c) => {
          getCodeVariants(c).forEach((v) => set.add(v));
        });
      }
    }
  } catch (err) {
    console.warn('[DeletedSitesSync] Error reading local deleted codes:', err);
  }

  inMemoryDeletedCodes = new Set(set);
  return set;
}

/**
 * Persists deleted site codes to localStorage and dispatches a local event
 */
export function persistLocalDeletedCodes(set: Set<string>): void {
  inMemoryDeletedCodes = new Set(set);
  if (typeof window === 'undefined') return;

  try {
    const arr = Array.from(set);
    const json = JSON.stringify(arr);
    localStorage.setItem(FTTS_DELETED_CODES_KEY, json);
    localStorage.setItem(WE_DELETED_CODES_KEY, json);

    // Notify other components/hooks in the same browser window
    window.dispatchEvent(new CustomEvent(DELETED_CODES_EVENT, { detail: arr }));
  } catch (err) {
    console.warn('[DeletedSitesSync] Error writing local deleted codes:', err);
  }
}

/**
 * Purges deleted site codes from all operator localStorage caches
 * to guarantee they are never resurrected during offline reads or sync
 */
export function purgeDeletedCodesFromAllCaches(deletedSet: Set<string>): void {
  if (typeof window === 'undefined' || deletedSet.size === 0) return;

  try {
    // 1. WE cache
    const rawWe = localStorage.getItem('we_records_live_v3');
    if (rawWe) {
      const arr = JSON.parse(rawWe);
      if (Array.isArray(arr)) {
        const filtered = arr.filter((r: any) => {
          const code = normalizeSiteCode(r['site code'] || r.site_code || r['Site code']);
          const id = normalizeSiteCode(r._id || r.id);
          return !deletedSet.has(code) && !deletedSet.has(id);
        });
        localStorage.setItem('we_records_live_v3', JSON.stringify(filtered));
      }
    }

    // 2. Vodafone cache
    const rawVdf = localStorage.getItem('ftts_vodafone_records_v1');
    if (rawVdf) {
      const arr = JSON.parse(rawVdf);
      if (Array.isArray(arr)) {
        const filtered = arr.filter((r: any) => {
          const code = normalizeSiteCode(r['Site code'] || r['site code'] || r.site_code);
          const id = normalizeSiteCode(r.id);
          return !deletedSet.has(code) && !deletedSet.has(id);
        });
        localStorage.setItem('ftts_vodafone_records_v1', JSON.stringify(filtered));
      }
    }

    // 3. Orange cache
    const rawOrg = localStorage.getItem('ftts_orange_records_v3');
    if (rawOrg) {
      const arr = JSON.parse(rawOrg);
      if (Array.isArray(arr)) {
        const filtered = arr.filter((r: any) => {
          const code = normalizeSiteCode(r['Site code'] || r['site code'] || r.site_code);
          const id = normalizeSiteCode(r.id);
          return !deletedSet.has(code) && !deletedSet.has(id);
        });
        localStorage.setItem('ftts_orange_records_v3', JSON.stringify(filtered));
      }
    }

    // 4. Etaha cache
    const rawEtaha = localStorage.getItem('availability_etaha_records_v7_368');
    if (rawEtaha) {
      const arr = JSON.parse(rawEtaha);
      if (Array.isArray(arr)) {
        const filtered = arr.filter((r: any) => {
          const code = normalizeSiteCode(r.Code || r.code || r.id);
          return !deletedSet.has(code);
        });
        localStorage.setItem('availability_etaha_records_v7_368', JSON.stringify(filtered));
      }
    }
  } catch (err) {
    console.warn('[DeletedSitesSync] Error purging deleted codes from caches:', err);
  }
}

/**
 * Fetches the authoritative deleted site codes from Supabase cloud database
 */
export async function fetchCloudDeletedCodes(): Promise<Set<string>> {
  const localSet = getLocalDeletedCodes();

  for (const client of supabaseClients) {
    try {
      const { data, error } = await client
        .from('we_records')
        .select('*')
        .eq('id', SYNC_DELETED_CODES_ID)
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const cloudCodes: string[] = row.data?.codes || [];
        if (Array.isArray(cloudCodes)) {
          // Authoritative cloud list replaces stale local deleted cache so restored sites are never re-hidden
          const authoritativeSet = new Set<string>();
          cloudCodes.forEach((c) => {
            getCodeVariants(c).forEach((v) => authoritativeSet.add(v));
          });
          persistLocalDeletedCodes(authoritativeSet);
          purgeDeletedCodesFromAllCaches(authoritativeSet);
          return authoritativeSet;
        }
      }
    } catch (err) {
      console.warn('[DeletedSitesSync] Failed fetching cloud deleted codes from client:', err);
    }
  }

  return localSet;
}

/**
 * Adds one or more deleted site codes to both Supabase cloud database and local state
 */
export async function addCloudDeletedCodes(codesToAdd: string[]): Promise<Set<string>> {
  if (!codesToAdd || codesToAdd.length === 0) return getLocalDeletedCodes();

  const currentSet = getLocalDeletedCodes();
  const newCodes: string[] = [];

  codesToAdd.forEach((raw) => {
    getCodeVariants(raw).forEach((v) => {
      if (!currentSet.has(v)) {
        currentSet.add(v);
        newCodes.push(v);
      }
    });
  });

  // Persist locally & purge from local operator caches immediately
  persistLocalDeletedCodes(currentSet);
  purgeDeletedCodesFromAllCaches(currentSet);

  // Sync to Supabase cloud database so all other devices and users receive the deletion
  const now = new Date().toISOString();
  const payload = {
    id: SYNC_DELETED_CODES_ID,
    site_code: SYNC_DELETED_CODES_SITE_CODE,
    'site code': SYNC_DELETED_CODES_SITE_CODE,
    'Site Status': 'SYSTEM_METADATA',
    Type: 'METADATA',
    data: {
      type: 'DELETED_CODES',
      codes: Array.from(currentSet),
      updated_at: now,
    },
    updated_at: now,
  };

  for (const client of supabaseClients) {
    try {
      const { error } = await client.from('we_records').upsert(payload).select();
      if (!error) {
        console.log(`[DeletedSitesSync] Successfully persisted ${newCodes.length} deleted codes to Supabase cloud.`);
        break;
      } else {
        console.error('[DeletedSitesSync] Supabase upsert error for deleted codes:', error);
      }
    } catch (err) {
      console.error('[DeletedSitesSync] Supabase exception during deleted codes sync:', err);
    }
  }

  return currentSet;
}

/**
 * Removes a code (and all its operator-prefixed/bare variants) from both local and Supabase cloud deleted codes
 */
export async function removeCloudDeletedCode(codeToRestore: string): Promise<Set<string>> {
  const restoreVariants = new Set(getAllRestoreVariants(codeToRestore));
  if (restoreVariants.size === 0) return getLocalDeletedCodes();

  // 1. Remove immediately from local set & notify UI synchronously
  const localSet = getLocalDeletedCodes();
  let localChanged = false;
  restoreVariants.forEach((v) => {
    if (localSet.has(v)) {
      localSet.delete(v);
      localChanged = true;
    }
  });
  if (localChanged) {
    persistLocalDeletedCodes(localSet);
  }

  // 2. Fetch authoritative cloud list and purge all variants in Supabase so refetch never re-hides the site
  for (const client of supabaseClients) {
    try {
      const { data, error } = await client
        .from('we_records')
        .select('id, data')
        .eq('id', SYNC_DELETED_CODES_ID)
        .limit(1);

      if (!error && data && data.length > 0) {
        const cloudCodes: string[] = Array.isArray(data[0]?.data?.codes) ? data[0].data.codes : [];
        const filteredCloud = cloudCodes.filter((c) => {
          const cVariants = getCodeVariants(c);
          return !cVariants.some((cv) => restoreVariants.has(cv));
        });

        if (filteredCloud.length !== cloudCodes.length) {
          const now = new Date().toISOString();
          const payload = {
            id: SYNC_DELETED_CODES_ID,
            site_code: SYNC_DELETED_CODES_SITE_CODE,
            'site code': SYNC_DELETED_CODES_SITE_CODE,
            'Site Status': 'SYSTEM_METADATA',
            Type: 'METADATA',
            data: {
              type: 'DELETED_CODES',
              codes: filteredCloud,
              updated_at: now,
            },
            updated_at: now,
          };
          await client.from('we_records').upsert(payload, { onConflict: 'id' }).select('id');

          const nextSet = new Set<string>();
          filteredCloud.forEach((c) => getCodeVariants(c).forEach((v) => nextSet.add(v)));
          persistLocalDeletedCodes(nextSet);
          return nextSet;
        }
        break;
      }
    } catch { }
  }

  return localSet;
}

/**
 * Subscribes to deleted codes changes (both locally across components and in real-time)
 */
export function subscribeToDeletedCodes(callback: (codes: Set<string>) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: any) => {
    const list = e.detail || [];
    callback(new Set(list));
  };

  window.addEventListener(DELETED_CODES_EVENT, handler);
  return () => {
    window.removeEventListener(DELETED_CODES_EVENT, handler);
  };
}
