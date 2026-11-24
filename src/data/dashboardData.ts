import type { SiteRecord, StatusSummary, StatusType } from '../types/dashboard';

export const STATUS_CONFIG: Record<
  string,
  {
    en: string;
    color: string;
    bgLight: string;
    border: string;
    textColor: string;
  }
> = {
  // ── 8 Exact Execution Status Categories from Excel ──
  'تم الانتهاء': {
    en: 'Completed',
    color: '#16a34a', // Emerald Green
    bgLight: '#dcfce7',
    border: '#4ade80',
    textColor: '#15803d',
  },
  'تم التشغيل فايبر': {
    en: 'Fiber Activated',
    color: '#059669', // Emerald
    bgLight: '#d1fae5',
    border: '#34d399',
    textColor: '#047857',
  },
  'تم التشغيل فيبر': {
    en: 'Fiber Activated',
    color: '#059669',
    bgLight: '#d1fae5',
    border: '#34d399',
    textColor: '#047857',
  },
  'تم مدني': {
    en: 'Civil Completed',
    color: '#0d9488', // Teal
    bgLight: '#ccfbf1',
    border: '#2dd4bf',
    textColor: '#0f766e',
  },
  'تم مدنى': {
    en: 'Civil Completed',
    color: '#0d9488',
    bgLight: '#ccfbf1',
    border: '#2dd4bf',
    textColor: '#0f766e',
  },
  'جاري العمل': {
    en: 'In Progress',
    color: '#4f46e5', // Indigo Blue
    bgLight: '#e0e7ff',
    border: '#818cf8',
    textColor: '#3730a3',
  },
  'جارى العمل': {
    en: 'In Progress',
    color: '#4f46e5',
    bgLight: '#e0e7ff',
    border: '#818cf8',
    textColor: '#3730a3',
  },
  'جاري العمل مدني': {
    en: 'Civil Works in Progress',
    color: '#4f46e5',
    bgLight: '#e0e7ff',
    border: '#818cf8',
    textColor: '#3730a3',
  },
  'جاري المعاينة': {
    en: 'Under Inspection',
    color: '#7c3aed', // Purple
    bgLight: '#f5f3ff',
    border: '#c4b5fd',
    textColor: '#6d28d9',
  },
  'جارى المعاينة': {
    en: 'Under Inspection',
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    border: '#c4b5fd',
    textColor: '#6d28d9',
  },
  'جاري تصريح': {
    en: 'Permits in Progress',
    color: '#0284c7', // Sky Blue
    bgLight: '#e0f2fe',
    border: '#38bdf8',
    textColor: '#0369a1',
  },
  'جاري تصاريح': {
    en: 'Permits in Progress',
    color: '#0284c7',
    bgLight: '#e0f2fe',
    border: '#38bdf8',
    textColor: '#0369a1',
  },
  'جارى تصاريح': {
    en: 'Permits in Progress',
    color: '#0284c7',
    bgLight: '#e0f2fe',
    border: '#38bdf8',
    textColor: '#0369a1',
  },
  'جاري  تصاريح': {
    en: 'Permits in Progress',
    color: '#0284c7',
    bgLight: '#e0f2fe',
    border: '#38bdf8',
    textColor: '#0369a1',
  },
  'متعذر': {
    en: 'Stalled / Blocked',
    color: '#e11d48', // Crimson Red
    bgLight: '#ffe4e6',
    border: '#fb7185',
    textColor: '#be123c',
  },
  'معوقات': {
    en: 'Obstacles / On Hold',
    color: '#ea580c', // Dark Orange / Amber
    bgLight: '#ffedd5',
    border: '#fdba74',
    textColor: '#c2410c',
  },
  'متعذر / معوقات': {
    en: 'Blocked / Obstacles',
    color: '#e11d48', // Crimson Red
    bgLight: '#ffe4e6',
    border: '#fb7185',
    textColor: '#be123c',
  },

  // ── Backward Compatibility Aliases ──
  'تم التسليم': {
    en: 'Completed',
    color: '#16a34a',
    bgLight: '#dcfce7',
    border: '#4ade80',
    textColor: '#15803d',
  },
  'جاري مدني': {
    en: 'Civil Works in Progress',
    color: '#4f46e5',
    bgLight: '#e0e7ff',
    border: '#818cf8',
    textColor: '#3730a3',
  },
  'جاري كهربي': {
    en: 'Electricity in Progress',
    color: '#d97706',
    bgLight: '#fef3c7',
    border: '#fcd34d',
    textColor: '#b45309',
  },
  'جاري العمل كهربى': {
    en: 'Electricity in Progress',
    color: '#d97706',
    bgLight: '#fef3c7',
    border: '#fcd34d',
    textColor: '#b45309',
  },
  'متعذر': {
    en: 'Blocked / Obstacles',
    color: '#e11d48',
    bgLight: '#ffe4e6',
    border: '#fb7185',
    textColor: '#be123c',
  },
  'معوقات': {
    en: 'Blocked / Obstacles',
    color: '#e11d48',
    bgLight: '#ffe4e6',
    border: '#fb7185',
    textColor: '#be123c',
  },
  'متعثرات': {
    en: 'Blocked / Obstacles',
    color: '#e11d48',
    bgLight: '#ffe4e6',
    border: '#fb7185',
    textColor: '#be123c',
  },
};

// Fallback palette for any unexpected statuses in uploaded Excel sheets
export const EXTRA_PALETTE = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#14b8a6', '#f43f5e'
];

export const COMPANY_CONFIG: Record<
  string,
  {
    nameAr: string;
    nameEn: string;
    color: string;
    activeBorder: string;
    badgeBg: string;
    badgeText: string;
    brandDot: string;
  }
> = {
  All: {
    nameAr: 'جميع الشركات',
    nameEn: 'All Operators',
    color: 'hover:border-slate-400',
    activeBorder: 'border-slate-800 bg-slate-900 text-white shadow-md ring-2 ring-slate-800/20',
    badgeBg: 'bg-slate-100 text-slate-700',
    badgeText: 'text-slate-600',
    brandDot: 'bg-blue-600',
  },
  WE: {
    nameAr: 'WE',
    nameEn: 'المصرية للاتصالات',
    color: 'hover:border-purple-400',
    activeBorder: 'border-purple-600 bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-md ring-2 ring-purple-500/20',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    brandDot: 'bg-purple-600',
  },
  Vodafone: {
    nameAr: 'Vodafone',
    nameEn: 'فودافون مصر',
    color: 'hover:border-rose-400',
    activeBorder: 'border-rose-600 bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md ring-2 ring-rose-500/20',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-600',
    brandDot: 'bg-red-600',
  },
  Orange: {
    nameAr: 'Orange',
    nameEn: 'أورانج مصر',
    color: 'hover:border-orange-400',
    activeBorder: 'border-orange-500 bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md ring-2 ring-orange-500/20',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeText: 'text-orange-600',
    brandDot: 'bg-orange-500',
  },
};

export const SECTORS = [
  'قطاع إسكندرية والساحل',
  'قطاع شرق الدلتا',
  'قطاع مناطق غرب الدلتا',
  'قطاع مناطق وسط الدلتا',
  'قطاع مناطق السويس',
  'قطاع مناطق الإسماعيلية',
  'قطاع مناطق القاهرة الكبرى',
  'قطاع مناطق الجيزة وأكتوبر',
  'قطاع مناطق الصعيد',
];

export const GENERAL_ADMINS = [
  'الإدارة العامة لمشروعات FTTS',
  'الإدارة العامة لشبكات النقل',
  'الإدارة العامة للبنية التحتية',
  'الإدارة العامة للتشغيل ومراقبة الجودة',
];

// Exact administrations from the attached Excel sheet (media_1793612157416_abb63ac5.xlsx)
export const COMPETENT_ADMINS = [
  'أولى ساحل',
  'اسكندرية الأولى',
  'اسكندرية الثالثة',
  'اسكندرية الثانية',
  'الإسماعيلية ومدن القناة',
  'البحر الأحمر',
  'البحيرة الاولى',
  'البحيرة الثانية',
  'الدقهليه 1',
  'الدقهليه 2',
  'السويس وجنوب سيناء',
  'الشرقيه 1',
  'الشرقيه 2',
  'الغربية الأولى',
  'الغربية الثانية',
  'القليوبيه',
  'المنوفية',
  'دمياط',
  'ساحل ثالثة',
  'ساحل ثانية',
  'كفر الشيخ',
];

export const CENTRALS = [
  'سنترال الأوبرا',
  'سنترال المعادي',
  'سنترال مدينة نصر',
  'سنترال المهندسين',
  'سنترال سموحة',
  'سنترال المنصورة',
  'سنترال طنطا',
  'سنترال الإسماعيلية',
  'سنترال أسيوط',
  'سنترال الزقازيق',
];

export const CANONICAL_CLASSIFICATIONS = [
  'تم الانتهاء',
  'تم التشغيل فايبر',
  'تم مدني',
  'جاري العمل',
  'جاري المعاينة',
  'جاري تصريح',
  'متعذر',
  'معوقات',
] as const;

export type CanonicalClassification = typeof CANONICAL_CLASSIFICATIONS[number];

export const CLASSIFICATIONS = [
  'تم الانتهاء',
  'تم التشغيل فايبر',
  'تم مدني',
  'جاري العمل',
  'جاري المعاينة',
  'جاري تصريح',
  'متعذر',
  'معوقات',
];

export function normalizeToCanonicalClassification(raw: string): string {
  if (!raw) return 'جاري العمل';
  const s = String(raw).trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  // 1. تم التشغيل فايبر
  if (s.includes('تشغيل') || s.includes('فيبر') || s.includes('فايبر') || s === 'مشغل') {
    return 'تم التشغيل فايبر';
  }
  // 2. تم مدني
  if (s === 'تم مدني' || s.includes('تم مدني') || (s.includes('مدن') && s.startsWith('تم') && !s.includes('انتهاء'))) {
    return 'تم مدني';
  }
  // 3. تم الانتهاء / تم التسليم
  if (s.includes('انتهاء') || s.includes('تسليم') || s.includes('مكتمل') || s === 'تم الانتهاء' || s === 'تم التسليم') {
    return 'تم الانتهاء';
  }
  // 4. معوقات
  if (s.includes('معوق')) {
    return 'معوقات';
  }
  // 5. متعذر
  if (s.includes('متعذر') || s.includes('تعذر') || s.includes('متعثر') || s.includes('متعذرات')) {
    return 'متعذر';
  }
  // 6. جاري تصريح
  if (s.includes('تصريح') || s.includes('تصاريح')) {
    return 'جاري تصريح';
  }
  // 7. جاري المعاينة
  if (s.includes('معاين') || s.includes('مخطط')) {
    return 'جاري المعاينة';
  }
  // 8. جاري العمل
  if (s.includes('عمل') || s.includes('تنفيذ') || s.includes('خارجي') || s.includes('كهرب') || s.includes('جاري') || s.includes('جار')) {
    return 'جاري العمل';
  }
  return raw.trim() || 'جاري العمل';
}

export const OBSTACLE_REASONS = [
  'لا يوجد تعذر',
  'تأخر تصاريح حي وهيئة الطرق',
  'اعتراضات أهالي ومواطنين',
  'تعارض مسار مع خطوط مرافق غاز ومياه',
  'اشتراطات خاصة بالبيئة والآثار',
  'مشاكل تعاقدية وتوريدات مقاول',
];

// Helper to seed deterministic records summing EXACTLY to 121 sites and 185 links
function generateDetailedSites(): SiteRecord[] {
  const records: SiteRecord[] = [];

  const statusDefinitions: {
    status: StatusType;
    count: number;
    targetLinks: number;
    companies: ('Vodafone' | 'Orange' | 'WE')[];
    obstaclePool: string[];
    defaultDates: string[];
  }[] = [
      {
        status: 'جاري العمل كهربى',
        count: 3,
        targetLinks: 5, // 2, 2, 1
        companies: ['WE', 'Vodafone', 'Orange'],
        obstaclePool: ['لا يوجد تعذر'],
        defaultDates: ['2026-11-15', '2026-11-20', '2026-12-05'],
      },
      {
        status: 'متعثرات',
        count: 4,
        targetLinks: 8, // 2, 2, 2, 2
        companies: ['WE', 'Orange', 'Vodafone', 'WE'],
        obstaclePool: [
          'اعتراضات أهالي ومواطنين',
          'تأخر تصاريح حي وهيئة الطرق',
          'تعارض مسار مع خطوط مرافق غاز ومياه',
          'مشاكل تعاقدية وتوريدات مقاول',
        ],
        defaultDates: ['2027-01-30', '2027-02-15', '2027-01-10', '2027-03-01'],
      },
      {
        status: 'جاري العمل مدني',
        count: 5,
        targetLinks: 6, // 2, 1, 1, 1, 1
        companies: ['WE', 'Vodafone', 'Orange', 'WE', 'Vodafone'],
        obstaclePool: ['لا يوجد تعذر'],
        defaultDates: ['2026-11-25', '2026-11-30', '2026-12-10', '2026-12-15', '2026-12-20'],
      },
      {
        status: 'معوقات',
        count: 14,
        targetLinks: 22, // 8 sites with 2 links (16), 6 sites with 1 link (6) -> 22 links
        companies: [
          'WE', 'Orange', 'Vodafone', 'WE', 'Vodafone', 'Orange', 'WE',
          'Orange', 'Vodafone', 'WE', 'Vodafone', 'Vodafone', 'WE', 'Orange'
        ],
        obstaclePool: [
          'تأخر تصاريح حي وهيئة الطرق',
          'اعتراضات أهالي ومواطنين',
          'تعارض مسار مع خطوط مرافق غاز ومياه',
          'اشتراطات خاصة بالبيئة والآثار',
          'مشاكل تعاقدية وتوريدات مقاول',
        ],
        defaultDates: [
          '2026-12-15', '2026-12-20', '2027-01-10', '2026-12-30', '2027-01-15',
          '2027-01-20', '2027-02-01', '2026-12-25', '2027-01-05', '2027-02-10',
          '2026-12-18', '2027-01-25', '2027-02-05', '2027-01-12'
        ],
      },
      {
        status: 'تم التسليم',
        count: 24,
        targetLinks: 28, // 4 sites with 2 links (8), 20 sites with 1 link (20) -> 28 links
        companies: [
          'WE', 'Vodafone', 'Orange', 'WE', 'Vodafone', 'WE', 'Orange', 'Vodafone',
          'Orange', 'WE', 'Vodafone', 'Orange', 'Vodafone', 'WE', 'Vodafone', 'Orange',
          'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE'
        ],
        obstaclePool: ['لا يوجد تعذر'],
        defaultDates: [
          '2026-09-10', '2026-09-15', '2026-09-20', '2026-09-25', '2026-10-01',
          '2026-10-05', '2026-10-10', '2026-10-12', '2026-10-14', '2026-10-15',
          '2026-10-18', '2026-10-20', '2026-10-22', '2026-10-25', '2026-10-28',
          '2026-10-30', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04',
          '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'
        ],
      },
      {
        status: 'جاري المعاينة',
        count: 30,
        targetLinks: 53, // 23 sites with 2 links (46), 7 sites with 1 link (7) -> 53 links
        companies: [
          'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange',
          'Vodafone', 'WE', 'Orange', 'Vodafone', 'Orange', 'WE', 'Vodafone', 'Orange',
          'WE', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone',
          'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone'
        ],
        obstaclePool: ['لا يوجد تعذر'],
        defaultDates: [
          '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-16', '2026-11-18',
          '2026-11-20', '2026-11-22', '2026-11-24', '2026-11-26', '2026-11-28',
          '2026-11-30', '2026-12-02', '2026-12-04', '2026-12-06', '2026-12-08',
          '2026-12-10', '2026-12-12', '2026-12-14', '2026-12-16', '2026-12-18',
          '2026-12-20', '2026-12-22', '2026-12-24', '2026-12-26', '2026-12-28',
          '2026-12-30', '2027-01-02', '2027-01-04', '2027-01-06', '2027-01-08'
        ],
      },
      {
        status: 'جاري تصاريح',
        count: 41,
        targetLinks: 63, // 22 sites with 2 links (44), 19 sites with 1 link (19) -> 63 links
        companies: [
          'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE',
          'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone',
          'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange',
          'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE',
          'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone', 'WE', 'Orange', 'Vodafone',
          'WE'
        ],
        obstaclePool: ['لا يوجد تعذر'],
        defaultDates: [
          '2026-12-01', '2026-12-03', '2026-12-05', '2026-12-07', '2026-12-09',
          '2026-12-11', '2026-12-13', '2026-12-15', '2026-12-17', '2026-12-19',
          '2026-12-21', '2026-12-23', '2026-12-25', '2026-12-27', '2026-12-29',
          '2026-12-31', '2027-01-03', '2027-01-05', '2027-01-07', '2027-01-09',
          '2027-01-11', '2027-01-13', '2027-01-15', '2027-01-17', '2027-01-19',
          '2027-01-21', '2027-01-23', '2027-01-25', '2027-01-27', '2027-01-29',
          '2027-01-31', '2027-02-02', '2027-02-04', '2027-02-06', '2027-02-08',
          '2027-02-10', '2027-02-12', '2027-02-14', '2027-02-16', '2027-02-18',
          '2027-02-20'
        ],
      },
    ];

  let idCounter = 1;

  for (const group of statusDefinitions) {
    const linksDistribution: number[] = [];
    const count = group.count;
    const target = group.targetLinks;
    const twoLinksCount = target - count;
    for (let i = 0; i < count; i++) {
      linksDistribution.push(i < twoLinksCount ? 2 : 1);
    }

    for (let i = 0; i < group.count; i++) {
      const company = group.companies[i % group.companies.length];
      const sector = SECTORS[i % SECTORS.length];
      const generalAdmin = GENERAL_ADMINS[i % GENERAL_ADMINS.length];
      const competentAdmin = COMPETENT_ADMINS[i % COMPETENT_ADMINS.length];
      const central = CENTRALS[i % CENTRALS.length];
      const classification = CLASSIFICATIONS[i % CLASSIFICATIONS.length];
      const obstacleReason = group.obstaclePool[i % group.obstaclePool.length];
      const expectedDate = group.defaultDates[i] || '2026-12-31';

      let progressPercent = 0;
      switch (group.status) {
        case 'تم التسليم':
          progressPercent = 100;
          break;
        case 'جاري العمل كهربى':
          progressPercent = 85;
          break;
        case 'جاري العمل مدني':
          progressPercent = 60;
          break;
        case 'جاري تصاريح':
          progressPercent = 35;
          break;
        case 'جاري المعاينة':
          progressPercent = 20;
          break;
        case 'معوقات':
          progressPercent = 40;
          break;
        case 'متعثرات':
          progressPercent = 15;
          break;
      }

      const prefix = company === 'Orange' ? 'ORA' : company === 'Vodafone' ? 'VOD' : 'WE';

      records.push({
        id: `FTTS-${String(idCounter).padStart(4, '0')}`,
        siteCode: `${prefix}-${central.replace('سنترال ', '').substring(0, 3)}-${String(idCounter).padStart(3, '0')}`,
        siteName: `موقع ${central.replace('سنترال ', '')} ${i + 1}`,
        company,
        status: group.status,
        linksCount: linksDistribution[i],
        sector,
        generalAdmin,
        competentAdmin,
        central,
        classification,
        obstacleReason,
        expectedDate,
        progressPercent,
        civilContractor: ['المصرية لشبكات الفايبر', 'المقاولون المتحدون', 'مصر للمشروعات الهندسية', 'سيسكو فايبر'][i % 4],
        notes: group.status === 'معوقات' || group.status === 'متعثرات'
          ? `متابعة حل ${obstacleReason} مع الجهة المعنية`
          : 'العمل جاري طبقاً للجدول الزمني المعتمد',
      });

      idCounter++;
    }
  }

  return records;
}

export const INITIAL_SITES_DATA: SiteRecord[] = generateDetailedSites();

export const BASELINE_TOTAL_SITES = 121;
export const BASELINE_TOTAL_LINKS = 185;

/**
 * Universal helper: Extracts the EXACT classification strictly from the uploaded Excel sheet
 * without any hardcoded overrides or artificial reclassifications.
 */
export function getSiteClassification(site: SiteRecord): string {
  let raw = '';
  if (site.rawRecord && (site.rawRecord['التصنيف'] || site.rawRecord['التصنيف (مدني)'])) {
    raw = String(site.rawRecord['التصنيف'] || site.rawRecord['التصنيف (مدني)']).trim();
  } else if (site.classification && typeof site.classification === 'string') {
    const trimmed = site.classification.trim();
    if (trimmed && trimmed !== 'Sharing' && trimmed !== 'New' && trimmed !== 'GD') {
      raw = trimmed;
    }
  } else if (site.status && typeof site.status === 'string') {
    raw = site.status.trim();
  }
  if (!raw) return 'غير محدد';
  return normalizeToCanonicalClassification(raw);
}

/**
 * Checks if a classification is Completed / Achieved
 */
export function isClassificationCompleted(cat: string): boolean {
  const c = String(cat || '').toLowerCase();
  return (
    c.includes('انتهاء') ||
    c.includes('تسليم') ||
    c.includes('تشغيل') ||
    c.includes('مشغل') ||
    c.includes('فيبر') ||
    c.includes('فايبر') ||
    c.includes('on air') ||
    c.includes('مكتمل')
  );
}

/**
 * Checks if a classification is Blocked / Stalled / Obstacle
 */
export function isClassificationBlocked(cat: string): boolean {
  const c = String(cat || '').toLowerCase();
  return (
    c.includes('معوق') ||
    c.includes('متعذر') ||
    c.includes('تعذر') ||
    c.includes('متعثر') ||
    c.includes('مشاكل') ||
    c.includes('رفض')
  );
}

/**
 * Checks if a classification is Permits
 */
export function isClassificationPermits(cat: string): boolean {
  const c = String(cat || '').toLowerCase();
  return c.includes('تصاريح') || c.includes('تصريح') || c.includes('طرق');
}

/**
 * Checks if a classification is In Progress (Civil, Electricity, Execution)
 */
export function isClassificationInProgress(cat: string): boolean {
  const c = String(cat || '').toLowerCase();
  return (
    c.includes('عمل') ||
    c.includes('مدني') ||
    c.includes('كهرب') ||
    c.includes('تنفيذ') ||
    c.includes('خارجي') ||
    (c.includes('جاري') && !c.includes('معاين') && !c.includes('تصاريح')) ||
    (c.includes('جارى') && !c.includes('معاين') && !c.includes('تصاريح'))
  );
}

/**
 * Checks if a classification is Under Inspection / Planned
 */
export function isClassificationPlanned(cat: string): boolean {
  const c = String(cat || '').toLowerCase();
  return c.includes('معاين') || c.includes('مخطط');
}

/**
 * Returns dynamic, consistent color configuration for any classification
 */
export function getDynamicStatusConfig(category: string, index = 0): {
  en: string;
  color: string;
  bgLight: string;
  border: string;
  textColor: string;
} {
  if (STATUS_CONFIG[category]) {
    return STATUS_CONFIG[category];
  }

  // Smart keyword mapping
  if (isClassificationCompleted(category)) {
    return {
      en: category,
      color: '#16a34a',
      bgLight: '#dcfce7',
      border: '#4ade80',
      textColor: '#15803d',
    };
  }

  if (category === 'معوقات' || category.includes('معوق')) {
    return {
      en: category,
      color: '#ea580c',
      bgLight: '#ffedd5',
      border: '#fb923c',
      textColor: '#c2410c',
    };
  }

  if (category === 'متعذر' || category.includes('متعذر') || category.includes('تعذر')) {
    return {
      en: category,
      color: '#dc2626',
      bgLight: '#fee2e2',
      border: '#f87171',
      textColor: '#b91c1c',
    };
  }

  if (isClassificationPermits(category)) {
    return {
      en: category,
      color: '#0284c7',
      bgLight: '#e0f2fe',
      border: '#38bdf8',
      textColor: '#0369a1',
    };
  }

  if (category.includes('كهرب')) {
    return {
      en: category,
      color: '#d97706',
      bgLight: '#fef3c7',
      border: '#fcd34d',
      textColor: '#b45309',
    };
  }

  if (category.includes('معاين')) {
    return {
      en: category,
      color: '#0d9488',
      bgLight: '#ccfbf1',
      border: '#2dd4bf',
      textColor: '#0f766e',
    };
  }

  if (isClassificationInProgress(category)) {
    return {
      en: category,
      color: '#4f46e5',
      bgLight: '#e0e7ff',
      border: '#818cf8',
      textColor: '#3730a3',
    };
  }

  // Dynamic distinct color from EXTRA_PALETTE
  const fallbackColor = EXTRA_PALETTE[index % EXTRA_PALETTE.length];
  return {
    en: category,
    color: fallbackColor,
    bgLight: '#f8fafc',
    border: '#cbd5e1',
    textColor: '#334155',
  };
}

/**
 * Maps any site strictly into its Excel classification
 * (Backward-compatible: now returns exact Excel classification)
 */
export function getWeExactCategory(site: SiteRecord): string {
  return getSiteClassification(site);
}

// Backward-compatible alias
export const getSiteAggregateCategory = getSiteClassification;

/**
 * Computes status summaries strictly based on the exact classifications present in the uploaded Excel data
 */
export function calculateStatusSummaries(sites: SiteRecord[]): StatusSummary[] {
  const totalSites = sites.length || 1;
  const countMap = new Map<string, { count: number; links: number }>();

  sites.forEach((site) => {
    const category = getSiteClassification(site);
    if (!category || category === 'غير محدد') return;

    const entry = countMap.get(category) || { count: 0, links: 0 };
    entry.count += 1;
    entry.links += (site.linksCount || 1);
    countMap.set(category, entry);
  });

  // Sort by count descending
  const sorted = Array.from(countMap.entries()).sort((a, b) => b[1].count - a[1].count);

  return sorted.map(([category, data], index) => {
    const percentage = Number(((data.count / totalSites) * 100).toFixed(1));
    const config = getDynamicStatusConfig(category, index);

    return {
      status: category,
      statusEn: config.en,
      sitesCount: data.count,
      linksCount: data.links,
      percentage,
      color: config.color,
      badgeBg: config.bgLight,
      borderColor: config.border,
    };
  });
}
