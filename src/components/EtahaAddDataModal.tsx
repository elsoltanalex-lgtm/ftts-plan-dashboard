// src/components/EtahaAddDataModal.tsx
// Data-entry and modification modal for Availability (الإتاحة) projects
// Strict match with Availability requirements and conditional logic

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EtahaRecord } from '../data/etahaSites';
import type { SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import { uploadAttachment } from '../lib/supabase';
import {
  X,
  PlusCircle,
  Edit3,
  Search,
  Save,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Compass,
  MapPin,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  FileText,
} from 'lucide-react';

export interface EtahaAddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: EtahaRecord) => Promise<{ success: boolean; error?: string }>;
  allSiteCodes: string[];
  initialSiteCode?: string;
  initialRecord?: EtahaRecord | null;
  mode?: 'add' | 'edit';
  sitesData?: SiteRecord[];
  onSwitchToBulk?: () => void;
}

// Approved Standard Values matching Availability Dataset & Requirements
const APPROVED_SECTORS = [
  'قطاعات المنطقة الشرقية',
  'قطاعات المنطقة الغربية',
  'قطاعات مناطق القاهرة الكبرى',
  'قطاعات المناطق الجنوبية',
  'قطاعات الإسكندرية والساحل',
  'قطاع عام',
  'المناطق الغربية',
  'المناطق الشرقية',
  'القاهرة الكبرى',
  'المناطق الجنوبية',
  'الإسكندرية والساحل',
];

const APPROVED_INTERNAL_PATHS = [
  'تم الانتهاء',
  'جاري العمل',
  'لم يتم البدء',
  'متوقف علي العميل',
  'لا يوجد مسار داخلي',
];

const APPROVED_EXTERNAL_PATHS = [
  'تم الانتهاء',
  'جاري استخراج تصاريح',
  'جاري العمل مدني',
  'جاري السحب واللحام',
  'معوقات',
  'متعذر',
  'لم يتم البدء',
];

const APPROVED_SPLICING_STATUSES = [
  'تم الانتهاء',
  'جاري اللحام',
  'لم يتم البدء',
];

const APPROVED_CLASSIFICATIONS = [
  'تم الانتهاء والتسليم',
  'جاري العمل',
  'تصاريح',
  'معوقات',
  'متعذرات',
  'متعذر',
  'متوقف علي العميل',
  'جاري المعاينة',
];

const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الغربية',
  'الشرقية',
  'الدقهلية',
  'القليوبية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
];

export const EtahaAddDataModal: React.FC<EtahaAddDataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  allSiteCodes,
  initialSiteCode,
  initialRecord,
  mode = 'edit',
  sitesData = [],
  onSwitchToBulk,
}) => {
  const { isAdmin } = useAuth();
  const [activeMode, setActiveMode] = useState<'add' | 'edit'>(mode);
  const [step, setStep] = useState<'select-site' | 'fill-form'>(
    initialSiteCode || initialRecord || mode === 'add' ? 'fill-form' : 'select-site'
  );
  const [siteCodeSearch, setSiteCodeSearch] = useState('');
  const [masterRecord, setMasterRecord] = useState<EtahaRecord | null>(initialRecord || null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<EtahaRecord>({
    Code: '',
    المشروع: 'اتاحة',
    'اسم العميل': '',
    'اسم الفرع': '',
    المحافظة: 'الغربية',
    العنوان: '',
    القطاعات: 'قطاعات المنطقة الغربية',
    'قطاع التنفيذ': '',
    'الادارة العامة المنفذة': '',
    'ادارة التنفيذ': '',
    'المسار الداخلى': 'لم يتم البدء',
    'المسار الخارجي': 'جاري استخراج تصاريح',
    'موقف اللحامات': 'لم يتم البدء',
    'التصنيف': 'جاري العمل',
    'موقف التسليم': 'لم يتم',
    'سبب المعوق او التعذر': '',
    'ملحوظه في حاله عدم الانتهاء': '',
    'الملاحظات': '',
    'تاريخ المعوق': '',
    'تاريخ التعذر': '',
    المستند: '',
    'مستند الإثبات': '',
    documentUrl: '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Check if both internal and external routes are completed
  const internalRoute = String(formData['المسار الداخلى'] || '').trim();
  const externalRoute = String(formData['المسار الخارجي'] || '').trim();
  const isInternalDone = internalRoute === 'تم الانتهاء';
  const isExternalDone = externalRoute === 'تم الانتهاء';
  const isBothPathsCompleted = isInternalDone && isExternalDone;

  const currentClassification = String(formData['التصنيف'] || '').trim();
  const isDeliverySelected = currentClassification === 'تم الانتهاء والتسليم' || currentClassification === 'تم التسليم';
  const isBlockedObstacles = currentClassification === 'معوقات' || currentClassification.includes('معوق');
  const isStalled = currentClassification === 'متعذرات' || currentClassification === 'متعذر' || currentClassification.includes('تعذر');

  // Synchronize state when modal is opened or mode/code changes
  useEffect(() => {
    setActiveMode(mode);
    if (mode === 'add') {
      setStep('fill-form');
      setMasterRecord(null);
      setFormData({
        Code: '',
        المشروع: 'اتاحة',
        'اسم العميل': '',
        'اسم الفرع': '',
        المحافظة: 'الغربية',
        العنوان: '',
        القطاعات: 'قطاعات المنطقة الغربية',
        'قطاع التنفيذ': '',
        'الادارة العامة المنفذة': '',
        'ادارة التنفيذ': '',
        'المسار الداخلى': 'لم يتم البدء',
        'المسار الخارجي': 'جاري استخراج تصاريح',
        'موقف اللحامات': 'لم يتم البدء',
        'التصنيف': 'جاري العمل',
        'موقف التسليم': 'لم يتم',
        'سبب المعوق او التعذر': '',
        'ملحوظه في حاله عدم الانتهاء': '',
        'الملاحظات': '',
        'تاريخ المعوق': '',
        'تاريخ التعذر': '',
        المستند: '',
        'مستند الإثبات': '',
        documentUrl: '',
      });
    } else {
      if (initialRecord) {
        setMasterRecord(initialRecord);
        setFormData({ ...initialRecord });
        setStep('fill-form');
      } else if (initialSiteCode) {
        handleSelectSiteCode(initialSiteCode);
      } else {
        setStep('select-site');
      }
    }
    setErrors({});
    setSuccessMessage('');
  }, [isOpen, mode, initialSiteCode, initialRecord]);

  // Filtered site codes for search in Edit mode
  const filteredCodes = useMemo(() => {
    if (!siteCodeSearch.trim()) return allSiteCodes.slice(0, 40);
    const q = siteCodeSearch.trim().toLowerCase();
    return allSiteCodes.filter((c) => String(c || '').toLowerCase().includes(q)).slice(0, 40);
  }, [allSiteCodes, siteCodeSearch]);

  const handleSelectSiteCode = (code: string) => {
    const norm = String(code || '').trim().toUpperCase();
    const site = sitesData.find(
      (s) => String(s?.siteCode || '').trim().toUpperCase() === norm
    );
    const raw = (site?.rawRecord as EtahaRecord) || null;
    if (raw) {
      setMasterRecord(raw);
      setFormData({ ...raw });
    } else {
      setFormData((prev) => ({
        ...prev,
        Code: code,
        'اسم العميل': site?.siteName || '',
        'اسم الفرع': site?.branchName || '',
        العنوان: site?.address || '',
        القطاعات: site?.sector || 'قطاعات المنطقة الغربية',
        'قطاع التنفيذ': site?.subSector || '',
        'الادارة العامة المنفذة': site?.generalAdmin || '',
        'ادارة التنفيذ': site?.competentAdmin || '',
        المحافظة: site?.governorate || 'الغربية',
        'المسار الداخلى': site?.rawRecord?.['المسار الداخلى'] || 'لم يتم البدء',
        'المسار الخارجي': site?.rawRecord?.['المسار الخارجي'] || 'جاري العمل مدني',
        'موقف اللحامات': site?.rawRecord?.['موقف اللحامات'] || 'لم يتم البدء',
        'التصنيف': site?.classification || 'جاري العمل',
      }));
    }
    setStep('fill-form');
  };

  const handleInputChange = (field: keyof EtahaRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  // Special handler for classification changes with conditional cleanup
  const handleClassificationChange = (newCls: string) => {
    handleInputChange('التصنيف', newCls);

    // Clear conditional errors when switching
    setErrors((prev) => {
      const next = { ...prev };
      delete next['التصنيف'];
      delete next['المستند'];
      delete next['سبب المعوق او التعذر'];
      return next;
    });

    // Clean up or synchronize delivery status
    if (newCls === 'تم الانتهاء والتسليم') {
      handleInputChange('موقف التسليم', 'تم التسليم');
    }
  };

  // Document file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    setFormData((prev) => ({
      ...prev,
      المستند: fileName,
      'مستند الإثبات': fileName,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next['المستند'];
      return next;
    });

    // Upload to Supabase Storage in the background
    uploadAttachment(file, 'documents')
      .then((res) => {
        if (res.success && res.url) {
          setFormData((prev) => ({ ...prev, documentUrl: res.url }));
        }
      })
      .catch((err) => console.warn('Supabase attachment upload:', err));
  };

  const handleRemoveDocument = () => {
    setFormData((prev) => ({
      ...prev,
      المستند: '',
      'مستند الإثبات': '',
      documentUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Core Project & Client fields
    if (!String(formData.Code || '').trim()) {
      newErrors.Code = 'كود المشروع مطلوب';
    }
    if (!String(formData['اسم العميل'] || '').trim()) {
      newErrors['اسم العميل'] = 'اسم العميل / الجهة مطلوب';
    }
    if (!String(formData.القطاعات || '').trim()) {
      newErrors.القطاعات = 'القطاع مطلوب';
    }

    // 2. Classification & Conditional Rules
    const cls = String(formData['التصنيف'] || '').trim();

    if (cls === 'تم الانتهاء والتسليم' || cls === 'تم التسليم') {
      if (!isBothPathsCompleted) {
        newErrors['التصنيف'] = '⛔ لا يمكن اختيار أو اعتماد "تم الانتهاء والتسليم" طالما أن المسار الداخلي أو المسار الخارجي ليس "تم الانتهاء".';
      } else {
        const doc = String(formData.المستند || formData.documentUrl || formData['مستند الإثبات'] || '').trim();
        if (!doc) {
          newErrors.المستند = '⛔ إلزامي: يجب إرفاق مستند أو شهادة إثبات الانتهاء والتسليم (ملف PDF أو صورة) لحفظ المشروع.';
        }
      }
    } else if (cls === 'معوقات' || cls.includes('معوق')) {
      if (!String(formData['سبب المعوق او التعذر'] || '').trim()) {
        newErrors['سبب المعوق او التعذر'] = 'يرجى إدخال أسباب وتفاصيل المعوقات الحالية للمشروع.';
      }
    } else if (cls === 'متعذرات' || cls === 'متعذر' || cls.includes('تعذر')) {
      if (!String(formData['سبب المعوق او التعذر'] || '').trim()) {
        newErrors['سبب المعوق او التعذر'] = 'يرجى إدخال أسباب وتفاصيل التعذر الحالية للمشروع.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setSuccessMessage('');
    try {
      const code = String(formData.Code).trim();
      const cls = String(formData['التصنيف'] || '').trim();

      // Clean non-selected conditional fields before saving so they don't block
      const cleanedData: EtahaRecord = { ...formData };
      if (cls !== 'تم الانتهاء والتسليم') {
        // Not delivery
      }
      if (cls !== 'معوقات' && cls !== 'متعذرات' && cls !== 'متعذر') {
        // Clear obstacle reasons if not applicable
      }

      const payload: EtahaRecord = {
        ...cleanedData,
        Code: code,
        المشروع: 'اتاحة',
        _id: `ETAHA-${code}`,
        _updatedAt: new Date().toISOString(),
        _createdBy: 'Availability Form UI',
      };

      const res = await onSave(payload);
      if (res.success) {
        setSuccessMessage(`تم حفظ وتحديث بيانات المشروع ${code} بنجاح في قاعدة بيانات Availability سحابياً ✅`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrors({ general: res.error || 'حدث خطأ أثناء حفظ المشروع' });
      }
    } catch (err: any) {
      setErrors({ general: err?.message || 'حدث خطأ في الاتصال بقاعدة البيانات' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-teal-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              {activeMode === 'add' ? (
                <PlusCircle className="w-6 h-6" />
              ) : (
                <Edit3 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {activeMode === 'add'
                    ? 'إضافة مشروع إتاحة جديد (New Availability Project)'
                    : 'تعديل بيانات مشروع إتاحة (Edit Availability Project)'}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  Availability المعتمدة
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                إدخال وتحديث بيانات مشروعات الإتاحة مع التحقق الشرطي للمسارات والمستندات والحفظ في Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                <span>وضع الأدمن الكامل</span>
              </span>
            )}

            {/* Mode Switcher */}
            <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/15">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('add');
                  setStep('fill-form');
                  setMasterRecord(null);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeMode === 'add'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                إضافة جديد
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('edit');
                  setStep('select-site');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeMode === 'edit'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                تعديل مشروع
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {errors.general && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: Search and Select Site (Edit Mode Only) */}
          {activeMode === 'edit' && step === 'select-site' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl">
                <label className="block text-xs font-bold text-teal-950 mb-2">
                  اختر كود المشروع أو ابحث عنه لتعديل بياناته في قاعدة بيانات Availability:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={siteCodeSearch}
                    onChange={(e) => setSiteCodeSearch(e.target.value)}
                    placeholder="ابحث بكود المشروع أو اسم العميل (مثال: 40-1-8 أو 055-1-92)..."
                    className="w-full px-4 py-3 bg-white border border-teal-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                  />
                  <Search className="w-5 h-5 text-teal-500 absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                {filteredCodes.map((code) => {
                  const site = sitesData.find(
                    (s) => String(s.siteCode).toUpperCase() === code.toUpperCase()
                  );
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectSiteCode(code)}
                      className="p-2.5 text-right bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl transition cursor-pointer group"
                    >
                      <div className="font-mono text-xs font-bold text-teal-700 group-hover:text-teal-900 dir-ltr">
                        {code}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {site?.siteName || 'مشروع إتاحة'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Fill or Edit Form */}
          {(activeMode === 'add' || step === 'fill-form') && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeMode === 'edit' && masterRecord && (
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-teal-900">
                      تعديل المشروع المحدد: <strong className="font-mono text-sm">{formData.Code}</strong> ({formData['اسم العميل']})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select-site')}
                    className="text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    تغيير المشروع
                  </button>
                </div>
              )}

              {/* ============================================================== */}
              {/* القسم الأول: بيانات المشروع والعميل الأساسية */}
              {/* ============================================================== */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    القسم الأول - بيانات المشروع والعميل
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* كود المشروع */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كود المشروع <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Code || ''}
                      onChange={(e) => handleInputChange('Code', e.target.value)}
                      placeholder="مثال: 40-1-8 أو 055-1-92"
                      disabled={activeMode === 'edit' && !isAdmin}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dir-ltr ${
                        errors.Code ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                      }`}
                    />
                    {errors.Code && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.Code}</p>}
                  </div>

                  {/* اسم العميل */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم العميل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData['اسم العميل'] || ''}
                      onChange={(e) => handleInputChange('اسم العميل', e.target.value)}
                      placeholder="مثال: جامعة الأزهر - بنك مصر - مستشفى..."
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        errors['اسم العميل'] ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                      }`}
                    />
                    {errors['اسم العميل'] && (
                      <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors['اسم العميل']}</p>
                    )}
                  </div>

                  {/* اسم الفرع أو المقر */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الفرع أو المقر
                    </label>
                    <input
                      type="text"
                      value={formData['اسم الفرع'] || ''}
                      onChange={(e) => handleInputChange('اسم الفرع', e.target.value)}
                      placeholder="مثال: طنطا - القنايات - المعادي..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* المحافظة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المحافظة
                    </label>
                    <select
                      value={formData.المحافظة || 'الغربية'}
                      onChange={(e) => handleInputChange('المحافظة', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>
                          {gov}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* العنوان التفصيلي للموقع */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      العنوان التفصيلي للموقع
                    </label>
                    <input
                      type="text"
                      value={formData.العنوان || ''}
                      onChange={(e) => handleInputChange('العنوان', e.target.value)}
                      placeholder="العنوان التفصيلي وموقع المبنى..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* القسم الثاني: النطاق الإداري والتنفيذي */}
              {/* الترتيب المطلوب: */}
              {/* 1) القطاعات */}
              {/* 2) قطاع التنفيذ */}
              {/* 3) الإدارة العامة للتنفيذ */}
              {/* 4) إدارة التنفيذ المختصة */}
              {/* (تمت إزالة اسم وتليفون مدير الإدارة تماماً) */}
              {/* ============================================================== */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    القسم الثاني - النطاق الإداري والتنفيذي
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3.5">
                  {/* 1. القطاعات */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1) القطاعات (مثل قطاعات المنطقة الشرقية / قطاعات المنطقة الغربية) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.القطاعات || 'قطاعات المنطقة الغربية'}
                      onChange={(e) => handleInputChange('القطاعات', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {APPROVED_SECTORS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. قطاع التنفيذ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2) قطاع التنفيذ
                    </label>
                    <input
                      type="text"
                      value={formData['قطاع التنفيذ'] || ''}
                      onChange={(e) => handleInputChange('قطاع التنفيذ', e.target.value)}
                      placeholder="مثال: قطاع تنفيذ شبكات الغربية"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* 3. الإدارة العامة للتنفيذ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      3) الإدارة العامة للتنفيذ
                    </label>
                    <input
                      type="text"
                      value={formData['الادارة العامة المنفذة'] || ''}
                      onChange={(e) => handleInputChange('الادارة العامة المنفذة', e.target.value)}
                      placeholder="مثال: تنفيذ شبكات وسط الدلتا"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* 4. إدارة التنفيذ المختصة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      4) إدارة التنفيذ المختصة
                    </label>
                    <input
                      type="text"
                      value={formData['ادارة التنفيذ'] || ''}
                      onChange={(e) => handleInputChange('ادارة التنفيذ', e.target.value)}
                      placeholder="مثال: الغربية الأولى - الزقازيق..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* القسم الثالث: المسار وموقف التسليم والتصنيف العام */}
              {/* ============================================================== */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    القسم الثالث - المسار وموقف التسليم
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* المسار الداخلي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المسار الداخلي
                    </label>
                    <select
                      value={formData['المسار الداخلى'] || 'لم يتم البدء'}
                      onChange={(e) => handleInputChange('المسار الداخلى', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                        isInternalDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      {APPROVED_INTERNAL_PATHS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* بيانات المسار الخارجي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      بيانات المسار الخارجي
                    </label>
                    <select
                      value={formData['المسار الخارجي'] || 'لم يتم البدء'}
                      onChange={(e) => handleInputChange('المسار الخارجي', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                        isExternalDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      {APPROVED_EXTERNAL_PATHS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* موقف اللحامات */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      موقف اللحامات
                    </label>
                    <select
                      value={formData['موقف اللحامات'] || 'لم يتم البدء'}
                      onChange={(e) => handleInputChange('موقف اللحامات', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {APPROVED_SPLICING_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* التصنيف العام / النهائي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      التصنيف العام / النهائي <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData['التصنيف'] || 'جاري العمل'}
                      onChange={(e) => handleClassificationChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                        isDeliverySelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                          : isBlockedObstacles
                          ? 'bg-amber-50 border-amber-400 text-amber-900'
                          : isStalled
                          ? 'bg-rose-50 border-rose-400 text-rose-900'
                          : 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      }`}
                    >
                      {APPROVED_CLASSIFICATIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {errors['التصنيف'] && (
                  <p className="text-xs text-rose-600 mt-1 font-bold">{errors['التصنيف']}</p>
                )}
              </div>

              {/* ============================================================== */}
              {/* القسم الرابع: قواعد الربط الشرطي للتصنيف العام */}
              {/* ============================================================== */}
              <div className="space-y-4">
                {/* ── الحالة 1: تم اختيار "تم الانتهاء والتسليم" ── */}
                {isDeliverySelected && (
                  <div className="space-y-4">
                    {/* فحص المسارات: إذا كان المسار الداخلي أو الخارجي ليس "تم الانتهاء" */}
                    {!isBothPathsCompleted ? (
                      <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl flex flex-col gap-3 text-amber-950 shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>⛔ تنبيه: لا يمكن اختيار أو اعتماد "تم الانتهاء والتسليم" للمشروع حالياً!</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                          لا يمكن اختيار أو اعتماد <strong>"تم الانتهاء والتسليم"</strong> طالما أن المسار الداخلي أو المسار الخارجي ليس <strong>"تم الانتهاء"</strong>. يرجى مراجعة وتحديث الموقف في القسم السابق:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isInternalDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                            }`}
                          >
                            <span>المسار الداخلي:</span>
                            <span className="font-mono">{internalRoute || 'غير محدد'}</span>
                            <span>{isInternalDone ? '✅ مكتمل' : '❌ غير مكتمل'}</span>
                          </div>
                          <div
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isExternalDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                            }`}
                          >
                            <span>المسار الخارجي:</span>
                            <span className="font-mono">{externalRoute || 'غير محدد'}</span>
                            <span>{isExternalDone ? '✅ مكتمل' : '❌ غير مكتمل'}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-amber-700 font-bold">
                          💡 لتفعيل التسليم: قم بتغيير حالة كل من المسار الداخلي والخارجي إلى "تم الانتهاء" ليتاح لك إرفاق شهادة الإثبات وحفظ المشروع.
                        </p>
                      </div>
                    ) : (
                      /* كلا المسارين "تم الانتهاء" -> إرفاق مستند الإثبات إلزامي */
                      <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✅ كلا المسارين مكتمل (تم الانتهاء) - إرفاق مستند/شهادة إثبات التسليم إلزامي (Required)</span>
                        </div>

                        {/* Document Upload Area */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            إرفاق مستند أو شهادة إثبات الانتهاء والتسليم <span className="text-rose-500">* (إلزامي)</span>
                          </label>

                          {formData.المستند ? (
                            <div className="flex items-center justify-between p-3 bg-white border border-emerald-300 rounded-xl text-xs">
                              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-xs">{formData.المستند}</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveDocument}
                                className="text-rose-600 font-bold hover:underline cursor-pointer px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                              >
                                إزالة المستند
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className={`border-2 border-dashed p-4 rounded-xl text-center cursor-pointer transition bg-white ${
                                errors.المستند ? 'border-rose-400 bg-rose-50/50' : 'border-emerald-300 hover:border-emerald-500'
                              }`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                              <UploadCloud className="w-7 h-7 mx-auto text-emerald-600 mb-1" />
                              <p className="text-xs font-bold text-slate-800">
                                انقر هنا لاختيار ورفع مستند إثبات التسليم (PDF أو صورة)
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                يدعم ملفات PDF والصور ومستندات Word/Excel (حتى 15 ميجابايت)
                              </p>
                            </div>
                          )}

                          {errors.المستند && (
                            <p className="text-xs text-rose-600 mt-1.5 font-bold">{errors.المستند}</p>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ملاحظات التسليم والانتهاء
                          </label>
                          <textarea
                            rows={2}
                            value={formData['ملحوظه في حاله عدم الانتهاء'] || formData['الملاحظات'] || ''}
                            onChange={(e) => {
                              handleInputChange('ملحوظه في حاله عدم الانتهاء', e.target.value);
                              handleInputChange('الملاحظات', e.target.value);
                            }}
                            placeholder="ملاحظات محضر التسليم أو تفاصيل الاعتماد..."
                            className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── الحالة 2: تم اختيار "معوقات" ── */}
                {isBlockedObstacles && (
                  <div className="space-y-3 p-4 bg-amber-50/70 border border-amber-300 rounded-2xl animate-in fade-in">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                      <ClipboardList className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                        قسم المعوقات والتواريخ والملاحظات (Obstacles & Dates)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* تفاصيل أسباب المعوقات */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          أسباب وتفاصيل المعوقات <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={formData['سبب المعوق او التعذر'] || ''}
                          onChange={(e) => handleInputChange('سبب المعوق او التعذر', e.target.value)}
                          placeholder="اذكر أسباب المعوقات الحالية بالتفصيل (مثل تصاريح طرق، حي، معارضة أهالي، إلخ)..."
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
                            errors['سبب المعوق او التعذر'] ? 'border-rose-400 bg-rose-50' : 'border-amber-300'
                          }`}
                        />
                        {errors['سبب المعوق او التعذر'] && (
                          <p className="text-xs text-rose-600 mt-1 font-bold">{errors['سبب المعوق او التعذر']}</p>
                        )}
                      </div>

                      {/* تاريخ ظهور / رصد المعوق */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          تاريخ رصد المعوق
                        </label>
                        <input
                          type="date"
                          value={formData['تاريخ المعوق'] || ''}
                          onChange={(e) => handleInputChange('تاريخ المعوق', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      {/* ملاحظات المتابعة */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ملاحظات متابعة المعوق
                        </label>
                        <textarea
                          rows={2}
                          value={formData['ملحوظه في حاله عدم الانتهاء'] || ''}
                          onChange={(e) => handleInputChange('ملحوظه في حاله عدم الانتهاء', e.target.value)}
                          placeholder="موقف المتابعة مع الجهات المعنية..."
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── الحالة 3: تم اختيار "متعذرات" أو "متعذر" ── */}
                {isStalled && (
                  <div className="space-y-3 p-4 bg-rose-50/70 border border-rose-300 rounded-2xl animate-in fade-in">
                    <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-700" />
                      <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                        قسم المتعذرات والتواريخ والملاحظات (Stalled Reasons & Dates)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* تفاصيل أسباب التعذر */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          أسباب وتفاصيل التعذر <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={formData['سبب المعوق او التعذر'] || ''}
                          onChange={(e) => handleInputChange('سبب المعوق او التعذر', e.target.value)}
                          placeholder="اذكر أسباب التعذر الحالية بالتفصيل (تعذر نهائي، عدم وجود بنية تحتية، إلخ)..."
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                            errors['سبب المعوق او التعذر'] ? 'border-rose-400 bg-rose-50' : 'border-rose-300'
                          }`}
                        />
                        {errors['سبب المعوق او التعذر'] && (
                          <p className="text-xs text-rose-600 mt-1 font-bold">{errors['سبب المعوق او التعذر']}</p>
                        )}
                      </div>

                      {/* تاريخ التعذر */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          تاريخ التعذر
                        </label>
                        <input
                          type="date"
                          value={formData['تاريخ التعذر'] || ''}
                          onChange={(e) => handleInputChange('تاريخ التعذر', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>

                      {/* ملاحظات المتابعة */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ملاحظات المتابعة والقرار
                        </label>
                        <textarea
                          rows={2}
                          value={formData['ملحوظه في حاله عدم الانتهاء'] || ''}
                          onChange={(e) => handleInputChange('ملحوظه في حاله عدم الانتهاء', e.target.value)}
                          placeholder="الموقف النهائي أو البدائل المقترحة..."
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── الحالة 4: أي تصنيف آخر غير الثلاثة المذكورة ── */}
                {!isDeliverySelected && !isBlockedObstacles && !isStalled && (
                  <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الملاحظات العامة وموقف المتابعة
                    </label>
                    <textarea
                      rows={2}
                      value={formData['ملحوظه في حاله عدم الانتهاء'] || formData['الملاحظات'] || ''}
                      onChange={(e) => {
                        handleInputChange('ملحوظه في حاله عدم الانتهاء', e.target.value);
                        handleInputChange('الملاحظات', e.target.value);
                      }}
                      placeholder="ملاحظات المتابعة الميدانية وموقف التنفيذ للمشروع..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                {onSwitchToBulk && (
                  <button
                    type="button"
                    onClick={onSwitchToBulk}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📤 التبديل للرفع الجماعي عبر ملف إكسيل</span>
                  </button>
                )}

                <div className="flex items-center gap-2.5 mr-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (isDeliverySelected && !isBothPathsCompleted)}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 rounded-xl transition shadow-md hover:shadow-teal-500/25 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isDeliverySelected && !isBothPathsCompleted ? 'لا يمكن الحفظ: المسار الداخلي أو الخارجي لم يكتمل بعد' : undefined}
                  >
                    <Save className="w-4 h-4 text-teal-200" />
                    <span>{saving ? 'جارِ الحفظ السحابي...' : 'حفظ في قاعدة بيانات Availability'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
