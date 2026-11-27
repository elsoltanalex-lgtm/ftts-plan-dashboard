// src/components/TahawolAddDataModal.tsx
// Data-entry and modification modal for Digital Transformation (التحول الرقمي) projects

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TahawolRecord } from '../data/tahawolSites';
import type { SiteRecord } from '../types/dashboard';
import {
  X,
  PlusCircle,
  Edit3,
  Search,
  Save,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Compass,
  Building2,
} from 'lucide-react';

export interface TahawolAddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: TahawolRecord) => Promise<{ success: boolean; error?: string }>;
  allSiteCodes: string[];
  initialSiteCode?: string;
  initialRecord?: TahawolRecord | null;
  mode?: 'add' | 'edit';
  sitesData?: SiteRecord[];
}

const TARGET_OPTIONS = [
  'Target 2026',
  'جارى استكمال اعمال داخلي',
  'Backlog 2025',
];

const SECTOR_OPTIONS = [
  'قطاع تنفيذ شبكات الاسكندريه والساحل الشمالي',
  'قطاع تنفيذ الشبكات الشرقيه',
  'قطاع تنفيذ شبكات الغربيه',
];

const EXTERNAL_PATH_OPTIONS = [
  'تم التنفيذ',
  'جاري اعمال مدني',
  'جاري معاينة',
  'جارى تصاريح',
  'معوقات',
  'متعذرات',
  'غير مطلوب اعمال',
  'جاري حياه كريمه',
];

const INTERNAL_PATH_OPTIONS = [
  'تم التنفيذ',
  'مسئولية العميل',
  'غير مطلوب اعمال',
  'لم يتم الانتهاء من المسار الخارجي',
  'جاري التنفيذ',
  'منتظر شهادة الفايبر',
  'معوقات',
  'متعذرات',
];

const DELIVERY_STATUS_OPTIONS = [
  'تم التسليم',
  'لم يتم التسليم',
  '',
];

const FINAL_CLASSIFICATION_OPTIONS = [
  'تم الانتهاء خارجي و داخلي',
  'تم الانتهاء خارجي ومتوقف عميل',
  'تم الانتهاء خارجي وغير مطلوب اعمال داخلي',
  'تم الانتهاء خارجي وجاري مسار داخلي',
  'تم الانتهاء خارجي ومعوقات داخلي',
  'تم الانتهاء خارجي متعذرات مسار داخلي',
  'جاري مسار خارجي',
  'جاري معاينة',
  'جاري تصاريح',
  'معوقات مسار خارجي',
  'متعذرات',
  'حياة كريمة',
];

const BLANK_RECORD: TahawolRecord = {
  'الكود': '',
  'Target': 'Target 2026',
  'المرحلة النهائية': 'الرابعة',
  'قطاع التنفيذ': 'قطاع تنفيذ شبكات الاسكندريه والساحل الشمالي',
  'مسئولية المسار الداخلي': 'المصرية للاتصالات',
  'اسم الوزارة': '',
  'الجهات': '',
  'الجهة': '',
  'المحافظة': '',
  'رئاسة القطاعات': 'الغربيه',
  'الادارة العامة للتنفيذ': '',
  'اداره التنفيذ المختصة': '',
  'المبنى': '',
  'تاريخ التكليف': new Date().toISOString().slice(0, 10),
  'سنترال الربط': '',
  'قطاع المناطق': '',
  'الإدارة العامة للمنطقه': '',
  'المسار الخارجي': 'جاري معاينة',
  '( المعوقات / المتعذرات ) المسار الخارجي': '',
  'ملاحظات المسار الخارجي': '',
  'تاريخ تنفيذ المسار الخارجي': '',
  'المسار الداخلى': 'لم يتم الانتهاء من المسار الخارجي',
  '( المعوقات / المتعذرات ) المسار الداخلي': '',
  'ملاحظات المسار الداخلي': '',
  'تاريخ تنفيذ المسار الداخلي': '',
  'موقف التسليم': 'لم يتم التسليم',
  'موقف شهاده الفايبر': '',
  'الكابل المنفذ ( جديد / موجود سابقا )': 'جديد',
  'موقف المرفقات': '',
  'فيبر/تفعيل': '',
  'تكلفة اعمال': '',
  'تكلفة مهمات': '',
  'تكلفة استخراج تصاريح': '',
  'التصنيف النهائي': 'جاري معاينة',
};

export const TahawolAddDataModal: React.FC<TahawolAddDataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  allSiteCodes,
  initialSiteCode,
  initialRecord,
  mode = 'edit',
  sitesData = [],
}) => {
  const [activeMode, setActiveMode] = useState<'add' | 'edit'>(mode);
  const [step, setStep] = useState<'select-site' | 'fill-form'>(
    initialSiteCode || initialRecord || mode === 'add' ? 'fill-form' : 'select-site'
  );
  const [siteCodeSearch, setSiteCodeSearch] = useState('');
  const [formData, setFormData] = useState<TahawolRecord>({ ...BLANK_RECORD });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const sitesDataRef = useRef(sitesData);
  sitesDataRef.current = sitesData;
  const initKeyRef = useRef('');

  const filteredCodes = useMemo(() => {
    if (!siteCodeSearch.trim()) return allSiteCodes.slice(0, 50);
    const q = siteCodeSearch.trim().toLowerCase();
    return allSiteCodes.filter((c) => String(c || '').toLowerCase().includes(q)).slice(0, 50);
  }, [allSiteCodes, siteCodeSearch]);

  const handleSelectSiteCode = (code: string) => {
    const norm = String(code || '').trim().toUpperCase();
    const matched = (sitesDataRef.current || []).find(
      (s) => String(s?.siteCode || '').trim().toUpperCase() === norm
    );
    if (matched?.rawRecord) {
      setFormData({ ...BLANK_RECORD, ...(matched.rawRecord as TahawolRecord), 'الكود': matched.siteCode });
    } else {
      setFormData({ ...BLANK_RECORD, 'الكود': code });
    }
    setActiveMode('edit');
    setStep('fill-form');
    setErrors({});
    setSuccessMessage('');
  };

  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = '';
      return;
    }
    const recKey = initialRecord ? String(initialRecord['الكود'] || '') : '';
    const nextKey = `${mode}|${initialSiteCode || ''}|${recKey}`;
    if (initKeyRef.current === nextKey) return;
    initKeyRef.current = nextKey;

    setErrors({});
    setSuccessMessage('');

    if (initialRecord) {
      setFormData({ ...BLANK_RECORD, ...initialRecord });
      setActiveMode('edit');
      setStep('fill-form');
    } else if (initialSiteCode) {
      handleSelectSiteCode(initialSiteCode);
    } else if (mode === 'add') {
      setFormData({ ...BLANK_RECORD, 'تاريخ التكليف': new Date().toISOString().slice(0, 10) });
      setActiveMode('add');
      setStep('fill-form');
    } else {
      setActiveMode('edit');
      setStep('select-site');
      setSiteCodeSearch('');
    }
  }, [isOpen, mode, initialSiteCode, initialRecord]);

  const handleChange = (field: keyof TahawolRecord, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-sync Final Classification when both External & Internal paths are completed
      if (field === 'المسار الخارجي' || field === 'المسار الداخلى') {
        const ext = String(next['المسار الخارجي'] || '').trim();
        const intP = String(next['المسار الداخلى'] || '').trim();
        if (ext === 'تم التنفيذ' && intP === 'تم التنفيذ') {
          next['التصنيف النهائي'] = 'تم الانتهاء خارجي و داخلي';
          next['موقف التسليم'] = 'تم التسليم';
        } else if (ext === 'تم التنفيذ' && intP === 'مسئولية العميل') {
          next['التصنيف النهائي'] = 'تم الانتهاء خارجي ومتوقف عميل';
        } else if (ext === 'تم التنفيذ' && intP === 'غير مطلوب اعمال') {
          next['التصنيف النهائي'] = 'تم الانتهاء خارجي وغير مطلوب اعمال داخلي';
        }
      }
      return next;
    });
    if (errors[field as string]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field as string];
        return n;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!String(formData['الكود'] || '').trim()) {
      newErrors['الكود'] = 'كود الموقع مطلوب';
    }
    if (!String(formData['قطاع التنفيذ'] || '').trim()) {
      newErrors['قطاع التنفيذ'] = 'قطاع التنفيذ مطلوب';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await onSave({
        ...formData,
        'الكود': String(formData['الكود']).trim(),
        'الجهات': formData['الجهات'] || formData['الجهة'] || '',
      });
      if (res.success) {
        setSuccessMessage(`تم حفظ بيانات موقع التحول الرقمي (${formData['الكود']}) بنجاح ✅`);
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 900);
      } else {
        setErrors({ _general: res.error || 'حدث خطأ أثناء الحفظ' });
      }
    } catch (err: any) {
      setErrors({ _general: err?.message || 'فشل الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {activeMode === 'add'
                  ? 'إضافة موقع تحول رقمي جديد (Add Digital Transformation Site)'
                  : 'تعديل بيانات موقع التحول الرقمي (Edit Digital Transformation Site)'}
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                منظومة متابعة مشروعات التحول الرقمي (Digital Transformation 2025-2026)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errors._general && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errors._general}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'select-site' && activeMode === 'edit' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5 mb-2">
                  <Search className="w-4 h-4 text-amber-600" />
                  <span>ابحث عن كود موقع التحول الرقمي المراد تعديله:</span>
                </label>
                <input
                  type="text"
                  placeholder="اكتب كود الموقع (مثل: 03-20-1082-01)..."
                  value={siteCodeSearch}
                  onChange={(e) => setSiteCodeSearch(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                {filteredCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectSiteCode(code)}
                    className="p-2.5 bg-slate-50 hover:bg-amber-600 hover:text-white border border-slate-200 rounded-xl text-xs font-bold font-mono transition text-center cursor-pointer shadow-2xs"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form id="tahawol-data-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Section 1: Basic Site & Ministry Info */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <h3 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                    البيانات الأساسية للموقع والوزارة
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">الكود <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData['الكود'] || ''}
                      onChange={(e) => handleChange('الكود', e.target.value)}
                      readOnly={activeMode === 'edit'}
                      disabled={activeMode === 'edit'}
                      placeholder="مثال: 03-20-1650-31"
                      className={`w-full border rounded-lg px-3 py-1.5 font-mono font-bold ${
                        activeMode === 'edit'
                          ? 'bg-slate-200/70 border-slate-300 text-slate-700 cursor-not-allowed'
                          : 'bg-white border-amber-300 text-slate-900'
                      }`}
                    />
                    {errors['الكود'] && <p className="text-[11px] text-red-600 font-bold mt-1">{errors['الكود']}</p>}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target</label>
                    <select
                      value={formData['Target'] || 'Target 2026'}
                      onChange={(e) => handleChange('Target', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    >
                      {TARGET_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المرحلة النهائية</label>
                    <input
                      type="text"
                      value={formData['المرحلة النهائية'] || ''}
                      onChange={(e) => handleChange('المرحلة النهائية', e.target.value)}
                      placeholder="مثال: الرابعة"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">اسم الوزارة</label>
                    <input
                      type="text"
                      value={formData['اسم الوزارة'] || ''}
                      onChange={(e) => handleChange('اسم الوزارة', e.target.value)}
                      placeholder="مثال: الداخلية / الصحة / العدل"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">الجهة / المشروع</label>
                    <input
                      type="text"
                      value={formData['الجهة'] || ''}
                      onChange={(e) => handleChange('الجهة', e.target.value)}
                      placeholder="اسم الجهة أو المشروع"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المبنى</label>
                    <input
                      type="text"
                      value={formData['المبنى'] || ''}
                      onChange={(e) => handleChange('المبنى', e.target.value)}
                      placeholder="اسم المبنى أو العنوان"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">قطاع التنفيذ <span className="text-red-500">*</span></label>
                    <select
                      value={formData['قطاع التنفيذ'] || ''}
                      onChange={(e) => handleChange('قطاع التنفيذ', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    >
                      {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">الإدارة العامة للتنفيذ</label>
                    <input
                      type="text"
                      value={formData['الادارة العامة للتنفيذ'] || ''}
                      onChange={(e) => handleChange('الادارة العامة للتنفيذ', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">إدارة التنفيذ المختصة</label>
                    <input
                      type="text"
                      value={formData['اداره التنفيذ المختصة'] || ''}
                      onChange={(e) => handleChange('اداره التنفيذ المختصة', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المحافظة</label>
                    <input
                      type="text"
                      value={formData['المحافظة'] || ''}
                      onChange={(e) => handleChange('المحافظة', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">سنترال الربط</label>
                    <input
                      type="text"
                      value={formData['سنترال الربط'] || ''}
                      onChange={(e) => handleChange('سنترال الربط', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">مسئولية المسار الداخلي</label>
                    <input
                      type="text"
                      value={formData['مسئولية المسار الداخلي'] || ''}
                      onChange={(e) => handleChange('مسئولية المسار الداخلي', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Execution Paths & Final Classification */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                    المسار الخارجي والداخلي وموقف التسليم والتصنيف النهائي
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المسار الخارجي</label>
                    <select
                      value={formData['المسار الخارجي'] || 'جاري معاينة'}
                      onChange={(e) => handleChange('المسار الخارجي', e.target.value)}
                      className="w-full bg-white border border-teal-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    >
                      {EXTERNAL_PATH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المسار الداخلي</label>
                    <select
                      value={formData['المسار الداخلى'] || 'لم يتم الانتهاء من المسار الخارجي'}
                      onChange={(e) => handleChange('المسار الداخلى', e.target.value)}
                      className="w-full bg-white border border-teal-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    >
                      {INTERNAL_PATH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">موقف التسليم</label>
                    <select
                      value={formData['موقف التسليم'] || ''}
                      onChange={(e) => handleChange('موقف التسليم', e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
                    >
                      <option value="">غير محدد</option>
                      {DELIVERY_STATUS_OPTIONS.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">التصنيف النهائي</label>
                    <select
                      value={formData['التصنيف النهائي'] || 'جاري معاينة'}
                      onChange={(e) => handleChange('التصنيف النهائي', e.target.value)}
                      className="w-full bg-white border-2 border-amber-400 rounded-lg px-3 py-1.5 font-bold text-amber-950"
                    >
                      {FINAL_CLASSIFICATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">ملاحظات المسار الخارجي</label>
                    <input
                      type="text"
                      value={formData['ملاحظات المسار الخارجي'] || ''}
                      onChange={(e) => handleChange('ملاحظات المسار الخارجي', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">ملاحظات المسار الداخلي</label>
                    <input
                      type="text"
                      value={formData['ملاحظات المسار الداخلي'] || ''}
                      onChange={(e) => handleChange('ملاحظات المسار الداخلي', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">تكلفة أعمال</label>
                    <input
                      type="text"
                      value={formData['تكلفة اعمال'] || ''}
                      onChange={(e) => handleChange('تكلفة اعمال', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">تكلفة مهمات</label>
                    <input
                      type="text"
                      value={formData['تكلفة مهمات'] || ''}
                      onChange={(e) => handleChange('تكلفة مهمات', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">تكلفة تصاريح</label>
                    <input
                      type="text"
                      value={formData['تكلفة استخراج تصاريح'] || ''}
                      onChange={(e) => handleChange('تكلفة استخراج تصاريح', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">موقف شهادة الفايبر</label>
                    <input
                      type="text"
                      value={formData['موقف شهاده الفايبر'] || ''}
                      onChange={(e) => handleChange('موقف شهاده الفايبر', e.target.value)}
                      placeholder="تم / لم يتم"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition"
          >
            إلغاء
          </button>
          {step === 'fill-form' && (
            <button
              type="submit"
              form="tahawol-data-form"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition"
            >
              {activeMode === 'add' ? <PlusCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'جاري الحفظ...' : activeMode === 'add' ? 'حفظ وإضافة الموقع' : 'حفظ التعديلات'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
