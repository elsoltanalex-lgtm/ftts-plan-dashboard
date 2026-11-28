// src/data/operatorWeeklyRolloutData.ts
// Official Mobile Sites Weekly Target vs Delivery Dataset for WE, Vodafone, Orange
// Weeks: W1-Oct-2026 through W2-Nov-2026
// Extracted from official operations tracking spreadsheet

import type { SiteRecord } from '../types/dashboard';
import { getSiteClassification } from './dashboardData';

export type FttsOperatorKey = 'WE' | 'Vodafone' | 'Orange';

export const FTTS_WEEKLY_BASELINE_STORAGE_KEY = 'ftts_weekly_delivery_baseline_v1';

// Authoritative 8-week delivered counts extracted from attached Excel file (Oct W1-W4 & Nov W1-W4 2026)
export const FTTS_WEEKLY_DELIVERED_BASELINE: Record<FttsOperatorKey, Record<string, number>> = {
  WE: {
    'W1-Oct-2026': 42,
    'W2-Oct-2026': 4,
    'W3-Oct-2026': 0,
    'W4-Oct-2026': 4,
    'W1-Nov-2026': 4,
    'W2-Nov-2026': 6,
    'W3-Nov-2026': 0,
    'W4-Nov-2026': 0,
  },
  Vodafone: {
    'W1-Oct-2026': 171,
    'W2-Oct-2026': 1,
    'W3-Oct-2026': 3,
    'W4-Oct-2026': 6,
    'W1-Nov-2026': 2,
    'W2-Nov-2026': 1,
    'W3-Nov-2026': 1,
    'W4-Nov-2026': 0,
  },
  Orange: {
    'W1-Oct-2026': 24,
    'W2-Oct-2026': 0,
    'W3-Oct-2026': 2,
    'W4-Oct-2026': 2,
    'W1-Nov-2026': 4,
    'W2-Nov-2026': 0,
    'W3-Nov-2026': 0,
    'W4-Nov-2026': 0,
  },
};

export function loadFttsWeeklyBaseline(): Record<FttsOperatorKey, Record<string, number>> {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(FTTS_WEEKLY_BASELINE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.WE && parsed.Vodafone && parsed.Orange) {
          return parsed;
        }
      }
      localStorage.setItem(FTTS_WEEKLY_BASELINE_STORAGE_KEY, JSON.stringify(FTTS_WEEKLY_DELIVERED_BASELINE));
    }
  } catch {
    // ignore storage errors
  }
  return FTTS_WEEKLY_DELIVERED_BASELINE;
}

function normArStatus(val?: string | null): string {
  return String(val ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/**
 * Returns true if the site's current status/classification is "تم الانتهاء" or "تم التشغيل فايبر".
 * Any site NOT matching these two statuses is included in the FTTS active Target.
 */
export function isFttsCompletedOrFiberActive(site: SiteRecord): boolean {
  const candidates = [
    getSiteClassification(site),
    site.classification,
    site.status,
    site.rawRecord?.['التصنيف'],
    site.rawRecord?.['التصنيف (مدني)'],
    site.rawRecord?.['موقف العام'],
    site.rawRecord?.['Site Status'],
  ];
  const doneNorm = normArStatus('تم الانتهاء');
  const fiberNorm = normArStatus('تم التشغيل فايبر');
  return candidates.some((c) => {
    const n = normArStatus(String(c || ''));
    if (!n) return false;
    return n === doneNorm || n === fiberNorm || n.includes(doneNorm) || n.includes(fiberNorm);
  });
}

export interface OperatorWeeklyRow {
  admin: string;
  canonicalAdmin: string;
  weekKey: string;
  totalSites: number;
  delivered: number;
  targetRate: number;
  company: 'Vodafone' | 'Orange' | 'WE';
}

export interface OperatorWeekDef {
  key: string;
  shortAr: string;
  fullAr: string;
  fullEn: string;
  dateRangeAr: string;
  weekIndex: number;
}

export const OPERATOR_WEEKS: OperatorWeekDef[] = [
  {
    key: 'W1-Oct-2026',
    shortAr: 'أسبوع 1 أكتوبر',
    fullAr: 'الأسبوع الأول - أكتوبر 2026',
    fullEn: 'Week 1 - Oct 2026',
    dateRangeAr: '1 - 7 أكتوبر 2026',
    weekIndex: 1
  },
  {
    key: 'W2-Oct-2026',
    shortAr: 'أسبوع 2 أكتوبر',
    fullAr: 'الأسبوع الثاني - أكتوبر 2026',
    fullEn: 'Week 2 - Oct 2026',
    dateRangeAr: '8 - 14 أكتوبر 2026',
    weekIndex: 2
  },
  {
    key: 'W3-Oct-2026',
    shortAr: 'أسبوع 3 أكتوبر',
    fullAr: 'الأسبوع الثالث - أكتوبر 2026',
    fullEn: 'Week 3 - Oct 2026',
    dateRangeAr: '15 - 21 أكتوبر 2026',
    weekIndex: 3
  },
  {
    key: 'W4-Oct-2026',
    shortAr: 'أسبوع 4 أكتوبر',
    fullAr: 'الأسبوع الرابع - أكتوبر 2026',
    fullEn: 'Week 4 - Oct 2026',
    dateRangeAr: '22 - 28 أكتوبر 2026',
    weekIndex: 4
  },
  {
    key: 'W1-Nov-2026',
    shortAr: 'أسبوع 1 نوفمبر',
    fullAr: 'الأسبوع الأول - نوفمبر 2026',
    fullEn: 'Week 1 - Nov 2026',
    dateRangeAr: '1 - 7 نوفمبر 2026',
    weekIndex: 5
  },
  {
    key: 'W2-Nov-2026',
    shortAr: 'أسبوع 2 نوفمبر',
    fullAr: 'الأسبوع الثاني - نوفمبر 2026',
    fullEn: 'Week 2 - Nov 2026',
    dateRangeAr: '8 - 14 نوفمبر 2026',
    weekIndex: 6
  },
  {
    key: 'W3-Nov-2026',
    shortAr: 'أسبوع 3 نوفمبر',
    fullAr: 'الأسبوع الثالث - نوفمبر 2026',
    fullEn: 'Week 3 - Nov 2026',
    dateRangeAr: '15 - 21 نوفمبر 2026',
    weekIndex: 7
  },
  {
    key: 'W4-Nov-2026',
    shortAr: 'أسبوع 4 نوفمبر',
    fullAr: 'الأسبوع الرابع - نوفمبر 2026',
    fullEn: 'Week 4 - Nov 2026',
    dateRangeAr: '22 - 28 نوفمبر 2026',
    weekIndex: 8
  }
];

export const CANONICAL_DEPARTMENTS: { raw: string; canonical: string; short: string }[] = [
  { raw: 'الاداة العامة لتنفيذ شرق الدلتا 1', canonical: 'الإدارة العامة لتنفيذ شرق الدلتا 1', short: 'شرق الدلتا 1' },
  { raw: 'الاداة العامة لتنفيذ شرق الدلتا 2', canonical: 'الإدارة العامة لتنفيذ شرق الدلتا 2', short: 'شرق الدلتا 2' },
  { raw: 'الادارة العامة لتنفيذ مدن القناة وسيناء', canonical: 'الإدارة العامة لتنفيذ مدن القناة وسيناء', short: 'مدن القناة وسيناء' },
  { raw: 'الادارة العامة لتنفيذ شبكات غرب الدلتا', canonical: 'الإدارة العامة لتنفيذ شبكات غرب الدلتا', short: 'غرب الدلتا' },
  { raw: 'الادارة العامة لتنفيذ شبكات وسط الدلتا', canonical: 'الإدارة العامة لتنفيذ شبكات وسط الدلتا', short: 'وسط الدلتا' },
  { raw: 'تنفيذ شبكات الاسكندرية', canonical: 'الإدارة العامة لتنفيذ شبكات الإسكندرية', short: 'الإسكندرية' },
  { raw: 'تنفيذ شبكات الساحل ومطروح', canonical: 'الإدارة العامة لتنفيذ شبكات الساحل ومطروح', short: 'الساحل ومطروح' }
];

export function toCanonicalDepartment(dept: string): string {
  const norm = String(dept ?? '').trim().replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى');
  if (norm.includes('شرق الدلتا 1') || norm.includes('شرق دلتا 1')) return 'الإدارة العامة لتنفيذ شرق الدلتا 1';
  if (norm.includes('شرق الدلتا 2') || norm.includes('شرق دلتا 2')) return 'الإدارة العامة لتنفيذ شرق الدلتا 2';
  if (norm.includes('القناه') || norm.includes('سيناء') || norm.includes('سينا')) return 'الإدارة العامة لتنفيذ مدن القناة وسيناء';
  if (norm.includes('غرب الدلتا') || norm.includes('غرب دلتا')) return 'الإدارة العامة لتنفيذ شبكات غرب الدلتا';
  if (norm.includes('وسط الدلتا') || norm.includes('وسط دلتا')) return 'الإدارة العامة لتنفيذ شبكات وسط الدلتا';
  if (norm.includes('اسكندر') || norm.includes('الاسكندر')) return 'الإدارة العامة لتنفيذ شبكات الإسكندرية';
  if (norm.includes('ساحل') || norm.includes('مطروح')) return 'الإدارة العامة لتنفيذ شبكات الساحل ومطروح';
  return String(dept ?? '').trim();
}

export const OPERATOR_WEEKLY_DATA: OperatorWeeklyRow[] = [
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Nov-2026",
    "totalSites": 70,
    "delivered": 59,
    "targetRate": 49.85,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Nov-2026",
    "totalSites": 87,
    "delivered": 40,
    "targetRate": 61.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Nov-2026",
    "totalSites": 27,
    "delivered": 11,
    "targetRate": 19.23,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 64,
    "delivered": 22,
    "targetRate": 45.58,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 51,
    "delivered": 35,
    "targetRate": 36.32,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Nov-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 9.97,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Nov-2026",
    "totalSites": 34,
    "delivered": 4,
    "targetRate": 24.21,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Nov-2026",
    "totalSites": 70,
    "delivered": 59,
    "targetRate": 48.24,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Nov-2026",
    "totalSites": 87,
    "delivered": 40,
    "targetRate": 59.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Nov-2026",
    "totalSites": 27,
    "delivered": 11,
    "targetRate": 18.61,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 64,
    "delivered": 22,
    "targetRate": 44.11,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 51,
    "delivered": 35,
    "targetRate": 35.15,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Nov-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 9.65,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Nov-2026",
    "totalSites": 34,
    "delivered": 4,
    "targetRate": 23.43,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W4-Oct-2026",
    "totalSites": 70,
    "delivered": 59,
    "targetRate": 46.64,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W4-Oct-2026",
    "totalSites": 87,
    "delivered": 40,
    "targetRate": 57.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W4-Oct-2026",
    "totalSites": 27,
    "delivered": 10,
    "targetRate": 17.99,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 64,
    "delivered": 22,
    "targetRate": 42.64,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 51,
    "delivered": 35,
    "targetRate": 33.98,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W4-Oct-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 9.33,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W4-Oct-2026",
    "totalSites": 34,
    "delivered": 4,
    "targetRate": 22.65,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W3-Oct-2026",
    "totalSites": 70,
    "delivered": 58,
    "targetRate": 45.03,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W3-Oct-2026",
    "totalSites": 87,
    "delivered": 36,
    "targetRate": 55.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W3-Oct-2026",
    "totalSites": 26,
    "delivered": 10,
    "targetRate": 16.72,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 64,
    "delivered": 20,
    "targetRate": 41.17,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 50,
    "delivered": 33,
    "targetRate": 32.16,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W3-Oct-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 9.01,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W3-Oct-2026",
    "totalSites": 34,
    "delivered": 3,
    "targetRate": 21.87,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Oct-2026",
    "totalSites": 70,
    "delivered": 58,
    "targetRate": 43.42,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Oct-2026",
    "totalSites": 87,
    "delivered": 36,
    "targetRate": 53.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Oct-2026",
    "totalSites": 26,
    "delivered": 10,
    "targetRate": 16.13,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 64,
    "delivered": 20,
    "targetRate": 39.7,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 50,
    "delivered": 33,
    "targetRate": 31.01,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Oct-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 8.68,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Oct-2026",
    "totalSites": 34,
    "delivered": 3,
    "targetRate": 21.09,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Oct-2026",
    "totalSites": 74,
    "delivered": 62,
    "targetRate": 44.2,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Oct-2026",
    "totalSites": 87,
    "delivered": 35,
    "targetRate": 51.96,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Oct-2026",
    "totalSites": 28,
    "delivered": 12,
    "targetRate": 16.72,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 64,
    "delivered": 20,
    "targetRate": 38.23,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 50,
    "delivered": 33,
    "targetRate": 29.86,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Oct-2026",
    "totalSites": 14,
    "delivered": 12,
    "targetRate": 8.36,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Oct-2026",
    "totalSites": 34,
    "delivered": 3,
    "targetRate": 20.31,
    "company": "Vodafone",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Nov-2026",
    "totalSites": 16,
    "delivered": 6,
    "targetRate": 7.32,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Nov-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 14.19,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Nov-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 6.87,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 19,
    "delivered": 3,
    "targetRate": 8.7,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 11,
    "delivered": 3,
    "targetRate": 5.03,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Nov-2026",
    "totalSites": 13,
    "delivered": 10,
    "targetRate": 5.95,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Nov-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 7.32,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Nov-2026",
    "totalSites": 16,
    "delivered": 6,
    "targetRate": 6.28,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Nov-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 12.16,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Nov-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 5.88,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 19,
    "delivered": 3,
    "targetRate": 7.45,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 11,
    "delivered": 3,
    "targetRate": 4.32,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Nov-2026",
    "totalSites": 13,
    "delivered": 10,
    "targetRate": 5.1,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Nov-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 6.28,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W4-Oct-2026",
    "totalSites": 16,
    "delivered": 3,
    "targetRate": 5.23,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W4-Oct-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 10.13,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W4-Oct-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 4.9,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 19,
    "delivered": 3,
    "targetRate": 6.21,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 11,
    "delivered": 3,
    "targetRate": 3.6,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W4-Oct-2026",
    "totalSites": 13,
    "delivered": 9,
    "targetRate": 4.25,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W4-Oct-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 5.23,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W3-Oct-2026",
    "totalSites": 16,
    "delivered": 2,
    "targetRate": 4.18,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W3-Oct-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 8.11,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W3-Oct-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 3.92,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 19,
    "delivered": 2,
    "targetRate": 4.97,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 11,
    "delivered": 3,
    "targetRate": 2.88,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W3-Oct-2026",
    "totalSites": 13,
    "delivered": 9,
    "targetRate": 3.4,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W3-Oct-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 4.18,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Oct-2026",
    "totalSites": 16,
    "delivered": 1,
    "targetRate": 3.14,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Oct-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 6.08,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Oct-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 2.94,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 19,
    "delivered": 2,
    "targetRate": 3.73,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 11,
    "delivered": 2,
    "targetRate": 2.16,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Oct-2026",
    "totalSites": 13,
    "delivered": 9,
    "targetRate": 2.55,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Oct-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 3.14,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Oct-2026",
    "totalSites": 16,
    "delivered": 1,
    "targetRate": 0.74,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Oct-2026",
    "totalSites": 31,
    "delivered": 0,
    "targetRate": 1.42,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Oct-2026",
    "totalSites": 15,
    "delivered": 0,
    "targetRate": 0.69,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 19,
    "delivered": 2,
    "targetRate": 0.87,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 11,
    "delivered": 2,
    "targetRate": 0.51,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Oct-2026",
    "totalSites": 13,
    "delivered": 9,
    "targetRate": 0.6,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Oct-2026",
    "totalSites": 16,
    "delivered": 10,
    "targetRate": 0.74,
    "company": "Orange",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Nov-2026",
    "totalSites": 30,
    "delivered": 11,
    "targetRate": 22.56,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Nov-2026",
    "totalSites": 41,
    "delivered": 14,
    "targetRate": 30.83,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Nov-2026",
    "totalSites": 124,
    "delivered": 22,
    "targetRate": 93.24,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 52,
    "delivered": 13,
    "targetRate": 39.1,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Nov-2026",
    "totalSites": 37,
    "delivered": 19,
    "targetRate": 27.82,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Nov-2026",
    "totalSites": 58,
    "delivered": 42,
    "targetRate": 43.61,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Nov-2026",
    "totalSites": 109,
    "delivered": 18,
    "targetRate": 81.96,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Nov-2026",
    "totalSites": 29,
    "delivered": 11,
    "targetRate": 21.33,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Nov-2026",
    "totalSites": 41,
    "delivered": 14,
    "targetRate": 30.16,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Nov-2026",
    "totalSites": 121,
    "delivered": 22,
    "targetRate": 89,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 51,
    "delivered": 12,
    "targetRate": 37.51,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Nov-2026",
    "totalSites": 37,
    "delivered": 19,
    "targetRate": 27.22,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Nov-2026",
    "totalSites": 58,
    "delivered": 40,
    "targetRate": 42.66,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Nov-2026",
    "totalSites": 109,
    "delivered": 15,
    "targetRate": 80.18,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W4-Oct-2026",
    "totalSites": 29,
    "delivered": 10,
    "targetRate": 20.86,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W4-Oct-2026",
    "totalSites": 40,
    "delivered": 14,
    "targetRate": 28.77,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W4-Oct-2026",
    "totalSites": 120,
    "delivered": 21,
    "targetRate": 86.31,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 51,
    "delivered": 12,
    "targetRate": 36.68,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W4-Oct-2026",
    "totalSites": 37,
    "delivered": 18,
    "targetRate": 26.61,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W4-Oct-2026",
    "totalSites": 58,
    "delivered": 39,
    "targetRate": 41.72,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W4-Oct-2026",
    "totalSites": 109,
    "delivered": 15,
    "targetRate": 78.4,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W3-Oct-2026",
    "totalSites": 29,
    "delivered": 10,
    "targetRate": 20.38,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W3-Oct-2026",
    "totalSites": 40,
    "delivered": 14,
    "targetRate": 28.12,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W3-Oct-2026",
    "totalSites": 121,
    "delivered": 19,
    "targetRate": 85.05,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 53,
    "delivered": 12,
    "targetRate": 37.25,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W3-Oct-2026",
    "totalSites": 37,
    "delivered": 18,
    "targetRate": 26.01,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W3-Oct-2026",
    "totalSites": 58,
    "delivered": 38,
    "targetRate": 40.77,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W3-Oct-2026",
    "totalSites": 109,
    "delivered": 14,
    "targetRate": 76.61,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W2-Oct-2026",
    "totalSites": 27,
    "delivered": 10,
    "targetRate": 18.54,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W2-Oct-2026",
    "totalSites": 41,
    "delivered": 14,
    "targetRate": 28.15,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W2-Oct-2026",
    "totalSites": 121,
    "delivered": 19,
    "targetRate": 83.07,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 51,
    "delivered": 12,
    "targetRate": 35.01,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W2-Oct-2026",
    "totalSites": 40,
    "delivered": 18,
    "targetRate": 27.46,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W2-Oct-2026",
    "totalSites": 59,
    "delivered": 38,
    "targetRate": 40.51,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W2-Oct-2026",
    "totalSites": 108,
    "delivered": 14,
    "targetRate": 74.15,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 1",
    "weekKey": "W1-Oct-2026",
    "totalSites": 26,
    "delivered": 10,
    "targetRate": 17.43,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 1"
  },
  {
    "admin": "الاداة العامة لتنفيذ شرق الدلتا 2",
    "weekKey": "W1-Oct-2026",
    "totalSites": 40,
    "delivered": 14,
    "targetRate": 26.81,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شرق الدلتا 2"
  },
  {
    "admin": "الادارة العامة لتنفيذ مدن القناة وسيناء",
    "weekKey": "W1-Oct-2026",
    "totalSites": 121,
    "delivered": 19,
    "targetRate": 81.09,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ مدن القناة وسيناء"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات غرب الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 53,
    "delivered": 12,
    "targetRate": 35.52,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات غرب الدلتا"
  },
  {
    "admin": "الادارة العامة لتنفيذ شبكات وسط الدلتا",
    "weekKey": "W1-Oct-2026",
    "totalSites": 35,
    "delivered": 18,
    "targetRate": 23.46,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات وسط الدلتا"
  },
  {
    "admin": "تنفيذ شبكات الاسكندرية",
    "weekKey": "W1-Oct-2026",
    "totalSites": 59,
    "delivered": 34,
    "targetRate": 39.54,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الإسكندرية"
  },
  {
    "admin": "تنفيذ شبكات الساحل ومطروح",
    "weekKey": "W1-Oct-2026",
    "totalSites": 108,
    "delivered": 14,
    "targetRate": 72.38,
    "company": "WE",
    "canonicalAdmin": "الإدارة العامة لتنفيذ شبكات الساحل ومطروح"
  }
];

export interface OperatorWeekAggregated {
  weekKey: string;
  weekDef: OperatorWeekDef;
  totalSites: number;
  delivered: number;            // Cumulative Achieved (المحقق التراكمي)
  deliveredThisWeek: number;    // Weekly Delivered (المواقع المسلمة هذا الأسبوع)
  deliveredLast5Weeks: number;  // Rolling Last 5 Weeks (المواقع المسلمة آخر 5 أسابيع)
  targetRate: number;           // Cumulative Target (المستهدف التراكمي — غير المنتهي / غير المشغل فايبر)
  achievementPercent: number;
  remainingGap: number;         // Remaining sites to reach target
  gap: number;
  deptRows: {
    rawAdmin: string;
    canonicalAdmin: string;
    shortAdmin: string;
    totalSites: number;
    delivered: number;
    targetRate: number;
    achievementPercent: number;
  }[];
}

export interface OperatorWeeklySummary {
  company: 'Vodafone' | 'Orange' | 'WE' | 'All';
  selectedDept?: string;
  weeks: OperatorWeekAggregated[];
  latestWeek: OperatorWeekAggregated;
  departmentSummaries: {
    canonicalAdmin: string;
    rawAdmin: string;
    shortAdmin: string;
    totalSites: number;
    delivered: number;
    targetRate: number;
    achievementPercent: number;
  }[];
}

export function getOperatorWeeklyRollout(
  companyFilter: 'Vodafone' | 'Orange' | 'WE' | 'All' = 'All',
  deptFilter?: string | string[],
  liveSites?: SiteRecord[]
): OperatorWeeklySummary {
  let targetCompanies: ('Vodafone' | 'Orange' | 'WE')[] = [];
  if (companyFilter === 'All' || !companyFilter) {
    targetCompanies = ['Vodafone', 'Orange', 'WE'];
  } else {
    const compLower = String(companyFilter).toLowerCase();
    if (compLower === 'vodafone' || compLower.includes('voda')) targetCompanies = ['Vodafone'];
    else if (compLower === 'orange') targetCompanies = ['Orange'];
    else if (compLower === 'we') targetCompanies = ['WE'];
    else targetCompanies = ['Vodafone', 'Orange', 'WE'];
  }

  const activeDepts = Array.isArray(deptFilter)
    ? deptFilter.filter(Boolean)
    : deptFilter && deptFilter !== 'All' && deptFilter !== 'ALL'
      ? [deptFilter]
      : [];

  // Live dynamic aggregation from in-memory sites (reactive to Add / Edit / Delete / Filters)
  const hasLiveSites = Boolean(liveSites && liveSites.length > 0);
  const liveDeptStats = new Map<string, { total: number; target: number; completed: number }>();
  let liveTotalAll = 0;
  let liveTargetAll = 0;
  let liveCompletedAll = 0;

  // Baseline totals per operator for proportional scaling when sector/department filters narrow liveSites
  const BASELINE_OPERATOR_TOTALS: Record<FttsOperatorKey, number> = {
    WE: 1029,
    Vodafone: 699,
    Orange: 480,
  };
  const expectedOperatorTotal = targetCompanies.reduce((sum, c) => sum + BASELINE_OPERATOR_TOTALS[c], 0);

  if (hasLiveSites && liveSites) {
    const scopedLive = liveSites.filter((s) => {
      if (!s) return false;
      const compStr = String(s.company || '').toLowerCase();
      if (targetCompanies.length < 3) {
        return targetCompanies.some((tc) => compStr.includes(tc.toLowerCase()));
      }
      return true;
    });

    scopedLive.forEach((s) => {
      const rawDept = String(
        s.generalAdmin ||
        s.rawRecord?.['الادارة العامة المنفذة'] ||
        s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] ||
        s.rawRecord?.['الادارة العامة'] ||
        ''
      ).trim();
      const cAdmin = toCanonicalDepartment(rawDept);
      const isDoneOrFiber = isFttsCompletedOrFiberActive(s);

      liveTotalAll++;
      if (isDoneOrFiber) {
        liveCompletedAll++;
      } else {
        liveTargetAll++;
      }

      const curr = liveDeptStats.get(cAdmin) || { total: 0, target: 0, completed: 0 };
      curr.total++;
      if (isDoneOrFiber) curr.completed++;
      else curr.target++;
      liveDeptStats.set(cAdmin, curr);
    });
  }

  // Filter ratio when a sector/admin filter narrows the live dataset below full operator baseline
  const baseline = loadFttsWeeklyBaseline();
  const scopeScale =
    hasLiveSites && expectedOperatorTotal > 0 && liveTotalAll < expectedOperatorTotal * 0.92
      ? liveTotalAll / expectedOperatorTotal
      : 1;

  // Build exact weekly delivered series across all 8 weeks (Oct W1-W4, Nov W1-W4)
  const weeklyDeliveredSeries = OPERATOR_WEEKS.map((wDef) => {
    const rawSum = targetCompanies.reduce((sum, comp) => sum + (baseline[comp]?.[wDef.key] || 0), 0);
    return scopeScale < 0.999 ? Math.round(rawSum * scopeScale) : rawSum;
  });

  // Fallback target if liveSites is empty (sum of non-completed baseline targets)
  const FALLBACK_OPERATOR_TARGETS: Record<FttsOperatorKey, number> = {
    WE: 843,
    Vodafone: 691,
    Orange: 290,
  };
  const fallbackTarget = targetCompanies.reduce((sum, c) => sum + FALLBACK_OPERATOR_TARGETS[c], 0);
  const effectiveTarget = hasLiveSites ? liveTargetAll : fallbackTarget;
  const effectiveTotalSites = hasLiveSites ? liveTotalAll : expectedOperatorTotal;

  let runningDelivered = 0;

  const weeksAgg: OperatorWeekAggregated[] = OPERATOR_WEEKS.map((wDef, wIdx) => {
    const deliveredThisWeek = weeklyDeliveredSeries[wIdx] || 0;
    runningDelivered += deliveredThisWeek;

    // Rolling last 5 weeks sum: [max(0, wIdx - 4) .. wIdx]
    const windowStart = Math.max(0, wIdx - 4);
    let deliveredLast5Weeks = 0;
    for (let j = windowStart; j <= wIdx; j++) {
      deliveredLast5Weeks += weeklyDeliveredSeries[j] || 0;
    }

    const cumTarget = effectiveTarget;
    const cumAchieved = runningDelivered;
    const achievementPercent =
      cumTarget > 0 ? Math.min(100, Math.round((cumAchieved / cumTarget) * 100)) : cumAchieved > 0 ? 100 : 0;
    const remainingGap = Math.max(0, cumTarget - cumAchieved);

    const deptRows = CANONICAL_DEPARTMENTS.filter(
      (cd) => activeDepts.length === 0 || activeDepts.some((ad) => toCanonicalDepartment(ad) === cd.canonical)
    ).map((cd) => {
      const stat = liveDeptStats.get(cd.canonical) || { total: 0, target: 0, completed: 0 };
      const pct = stat.target > 0 ? Math.round((stat.completed / stat.target) * 100) : stat.completed > 0 ? 100 : 0;
      return {
        rawAdmin: cd.raw,
        canonicalAdmin: cd.canonical,
        shortAdmin: cd.short,
        totalSites: stat.total,
        delivered: stat.completed,
        targetRate: stat.target,
        achievementPercent: pct,
      };
    });

    return {
      weekKey: wDef.key,
      weekDef: wDef,
      totalSites: effectiveTotalSites,
      delivered: cumAchieved,
      deliveredThisWeek,
      deliveredLast5Weeks,
      targetRate: cumTarget,
      achievementPercent,
      remainingGap,
      gap: Number((cumAchieved - cumTarget).toFixed(1)),
      deptRows,
    };
  });

  const latestWeek = weeksAgg[weeksAgg.length - 1];

  const departmentSummaries = latestWeek.deptRows.map(d => ({
    canonicalAdmin: d.canonicalAdmin,
    rawAdmin: d.rawAdmin,
    shortAdmin: d.shortAdmin,
    totalSites: d.totalSites,
    delivered: d.delivered,
    targetRate: d.targetRate,
    achievementPercent: d.achievementPercent
  }));

  return {
    company: companyFilter,
    selectedDept: activeDepts.length === 1 ? toCanonicalDepartment(activeDepts[0]) : undefined,
    weeks: weeksAgg,
    latestWeek,
    departmentSummaries
  };
}
