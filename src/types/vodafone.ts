// src/types/vodafone.ts
// Type definitions for Vodafone FTTS Sites and Records

export interface VodafoneRecord {
  ' Site code'?: string | number;
  'Site code'?: string | number;
  'site code'?: string | number;
  site_code?: string | number;
  'رئاسة قطاعات التنفيذ'?: string;
  'قطاع التنفيذ'?: string;
  'قطاع المناطق'?: string;
  'الادارة العامة للمنطقة'?: string;
  'الادارة العامة لتنفيذ الشبكات'?: string;
  'ادارة التنفيذ الفرعية'?: string;
  'مسئولية التنفيذ'?: string;
  'Type'?: string;
  'التصنيف'?: string;
  'سنترال الربط'?: string;
  'خطة'?: string | number;
  'المحافظه'?: string;
  'احدثيات خط العرض'?: number | string;
  'احدثيات خط الطول'?: number | string;
  'تكلفة اعمال'?: number | string;
  'تكلفة مهمات'?: number | string;
  'تكلفة استخراج تصاريح'?: number | string;
  'التصنيف (مدني)'?: string;
  'تاكيد التسليم للمنطقه'?: string;
  'التصنيف (كهربي)'?: string;
  'المرحله الكهربيه'?: string;
  'الملاحظات'?: string;
  'اسباب التعّذر'?: string;
  'اسباب التعذر'?: string;
  'اسباب المعوق'?: string;
  'الجهة المطلوب الدعم منها'?: string;
  'التاريخ المتوقع للانتهاء'?: string;
  specialTarget?: boolean;
  special_target?: boolean;
  'سبيشال تارجت'?: boolean;
  _id?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _createdBy?: string;
  [key: string]: any;
}

export function normalizeVodafoneClassification(raw?: string | null): string {
  if (!raw) return 'جاري المعاينة';
  const t = String(raw).trim();
  if (t === 'تم التسليم' || t.includes('تسليم')) return 'تم الانتهاء';
  if (t === 'تم الانتهاء كهربي' || t.includes('انتهاء')) return 'تم الانتهاء';
  if (t.includes('تصاريح')) return 'جاري تصاريح';
  if (t.includes('معوق')) return 'معوقات';
  if (t.includes('تعذر') || t.includes('متعذر')) return 'متعذر';
  if (t.includes('كهرب')) return 'جاري كهربي';
  if (t.includes('مدن') || t.includes('عمل')) return 'جاري مدني';
  if (t.includes('معاين')) return 'جاري المعاينة';
  return t;
}

