// src/types/orange.ts
// Orange Data Types & Column Definitions for Fiber Tracking Port

export interface OrangeRecord {
  'HUBID'?: string;
  'Site code'?: string;
  'العميل'?: string;
  'رئاسة القطاعات '?: string;
  'القطاع'?: string; // الإدارة المختصة
  'قطاع المناطق'?: string;
  'قطاع التنفيذ'?: string;
  'الادارة العامة'?: string; // الإدارة العامة للتنفيذ
  'الادارة العامة للتنفيذ'?: string;
  'المنطقة'?: string; // إدارة المنطقة
  'المحافظه'?: string;
  'سنترال الربط'?: string;
  'مسئوليه التنفيذ'?: string;
  'العنوان'?: string;
  'الزياره  الاولي (تنفيذ)'?: string;
  'التصنيف (مدني)'?: string;
  'تاكيد التسليم للمنطقه'?: string;
  'موقف المرفقات'?: string;
  'الزيارة الاولي مرفقات'?: string;
  'الزياره  الثانيه'?: string;
  'الزياره  الثالثه'?: string;
  'ملحوظه خاصه بموقف الزيارات'?: string;
  'التصنيف (كهربي)'?: string;
  'المرحله الكهربيه'?: string;
  'موقف التسليم لاورنچ'?: string;
  'ملاحظات التسليمات'?: string;
  'TX avail'?: string;
  'نوع المعوق المدني'?: string;
  'توضيح تفاصيل المعوق و المتعذر '?: string;
  'احدثيات خط العرض'?: string | number;
  'احدثيات خط الطول'?: string | number;
  'صوره الكابل (تاكيد المنطقه )'?: string;
  'صوره OTDR  (تاكيد المنطقه )'?: string;
  'ورق التسليم  (تاكيد المنطقه )'?: string;
  'موقف التسليم من التنفيذ الي المنطقه  (تاكيد المنطقه )'?: string;
  'ملاحظات عامه'?: string;
  'تم التنفيذ بواسطة '?: string;
  'تكلفة اعمال'?: string | number;
  'تكلفة مهمات'?: string | number;
  'تكلفة استخراج تصاريح'?: string | number;
  'اجمالي تكلفة الموقع'?: string | number;
  'ملاحظات سنترال الربط'?: string;
  'ملاحظات سنترال الربط وغير منتهي'?: string;
  'ماتم تسليمة للمنطقة قبل نقل التابعية'?: string;
  'موقف من الإلغاء'?: string;
  'No. Links.'?: string | number;
  'No. .'?: string | number;
  'ملاحظات KAM'?: string;
  'Done Years'?: string | number;
  'Target 2026'?: string | number;
  'المستند'?: string;
  'الجهة المطلوب الدعم منها'?: string;
  'التاريخ المتوقع للانتهاء'?: string;
  'المسافة كم'?: string | number;
  'تكلفة الاعمال بالجنيه'?: string | number;
  'الملاحظات'?: string;
  specialTarget?: boolean;
  special_target?: boolean;
  'سبيشال تارجت'?: boolean;
  _id?: string;
  _createdAt?: string;
  _updatedAt?: string;
}

// ── Immutable Baseline Fields for Orange ──
// These fields are strictly READ-ONLY and locked against sector user modification
export const ORANGE_IMMUTABLE_FIELDS = [
  'HUBID',
  'Site code',
  'رئاسة القطاعات ',
  'الادارة العامة',
  'القطاع',
  'المنطقة',
  'المحافظه',
  'سنترال الربط',
  'مسئوليه التنفيذ',
] as const;

export const ORANGE_IMMUTABLE_SET = new Set<string>([
  'hubid',
  'HUBID',
  'Site code',
  'site code',
  'Site Code',
  'كود الموقع',
  'رئاسة القطاعات ',
  'رئاسة القطاعات',
  'القطاع الرئيسي',
  'الادارة العامة',
  'الإدارة العامة للتنفيذ',
  'الادارة العامة للتنفيذ',
  'القطاع',
  'الإدارة المختصة',
  'قطاع المناطق',
  'قطاع التنفيذ',
  'المنطقة',
  'إدارة المنطقة',
  'المحافظه',
  'المحافظة',
  'سنترال الربط',
  'السنترال',
  'مسئوليه التنفيذ',
  'مسؤولية التنفيذ',
]);

export function isOrangeFieldImmutable(colName: string): boolean {
  const norm = (colName || '').trim().toLowerCase();
  for (const f of ORANGE_IMMUTABLE_SET) {
    if (f.toLowerCase().trim() === norm) return true;
  }
  return false;
}

// Approved Classifications for Orange
export const ORANGE_APPROVED_CLASSIFICATIONS = [
  'تم الانتهاء',
  'تم التشغيل فايبر',
  'تم مدني',
  'تم الانتهاء مدني',
  'جاري تصاريح',
  'جاري مدني',
  'جاري المعاينة',
  'جاري كهربي',
  'متعذر',
  'معوقات',
] as const;

// Stall & Obstacle Reasons for Orange
export const ORANGE_STALL_REASONS = [
  'رفض استخراج تصاريح',
  'معوقات تصاريح دخول',
  'تكلفه مرتفعه',
  'معوقات (مالك)',
  'مؤجل من قبل اورنچ',
  'معوقات ملف انشاء',
  'عدم امكانية التنفيذ',
  'تعديل مسار',
  'أخرى',
] as const;

export const ORANGE_SUPPORT_ENTITIES = [
  'الجهاز القومي لتنظيم الاتصالات NTRA',
  'وزارة النقل / الطرق والكباري',
  'حي / مجلس مدينة',
  'إدارة المرور',
  'الشركة المصرية لنقل الكهرباء',
  'الهيئة العامة للطرق والكباري',
  'السكك الحديدية',
  'وزارة الري والموارد المائية',
  'الآثار',
  'جهات أمنية',
  'أخرى',
] as const;

export function normalizeOrangeClassification(raw?: string | null): string {
  if (!raw) return 'جاري المعاينة';
  const trimmed = String(raw).trim();
  if (trimmed === 'تم الانتهاء') {
    return 'تم الانتهاء';
  }
  if (trimmed.includes('تشغيل') || trimmed.includes('فايبر') || trimmed.includes('فيبر') || trimmed === 'تم التشغيل') {
    return 'تم التشغيل فايبر';
  }
  if (trimmed === 'تم مدني' || (trimmed.includes('مدني') && trimmed.startsWith('تم') && !trimmed.includes('انتهاء'))) {
    return 'تم مدني';
  }
  if (trimmed === 'تم الانتهاء مدني' || trimmed.includes('الانتهاء مدني')) {
    return 'تم الانتهاء مدني';
  }
  if (trimmed.includes('انتهاء') || trimmed.includes('تسليم')) {
    return 'تم الانتهاء';
  }
  if (trimmed.includes('تصاريح') || trimmed.includes('تصريح')) {
    return 'جاري تصاريح';
  }
  if (trimmed.includes('معاين')) {
    return 'جاري المعاينة';
  }
  if (trimmed.includes('كهرب')) {
    return 'جاري كهربي';
  }
  if (trimmed.includes('مدن') || trimmed.includes('عمل')) {
    return 'جاري مدني';
  }
  if (trimmed.includes('متعذر') || trimmed.includes('متعثر') || trimmed.includes('تعذر')) {
    return 'متعذر';
  }
  if (trimmed.includes('معوق')) {
    return 'معوقات';
  }
  return 'جاري المعاينة';
}

