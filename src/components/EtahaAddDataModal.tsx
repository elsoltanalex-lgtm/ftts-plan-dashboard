// src/components/EtahaAddDataModal.tsx
// Data-entry and modification modal for Availability (الإتاحة) projects
// Strict 100% match with Availability Excel schema (No mobile/cellular fields)

import React, { useState, useEffect, useMemo } from 'react';
import type { EtahaRecord } from '../data/etahaSites';
import type { SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
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
  Phone,
  Compass,
  Layers,
  MapPin,
  ClipboardList,
  ShieldCheck,
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

// Approved Standard Values matching Availability Dataset
const APPROVED_SECTORS = [
  'المناطق الغربية',
  'المناطق الشرقية',
  'القاهرة الكبرى',
  'المناطق الجنوبية',
  'الإسكندرية والساحل',
  'قطاع عام',
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

const APPROVED_DELIVERY_STATUSES = [
  'تم التسليم',
  'لم يتم',
  'متوقف علي العميل',
  'تم التسليم للمنطقة',
];

const APPROVED_CLASSIFICATIONS = [
  'تم الانتهاء والتسليم',
  'تصاريح',
  'جاري العمل',
  'معوقات',
  'متعذر',
  'متوقف علي العميل',
  'جاري المعاينة',
];

const APPROVED_SPLICING_STATUSES = [
  'تم الانتهاء',
  'جاري اللحام',
  'لم يتم البدء',
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
  const { user, isAdmin } = useAuth();
  const [activeMode, setActiveMode] = useState<'add' | 'edit'>(mode);
  const [step, setStep] = useState<'select-site' | 'fill-form'>(
    initialSiteCode || initialRecord || mode === 'add' ? 'fill-form' : 'select-site'
  );
  const [siteCodeSearch, setSiteCodeSearch] = useState('');
  const [masterRecord, setMasterRecord] = useState<EtahaRecord | null>(initialRecord || null);

  const [formData, setFormData] = useState<EtahaRecord>({
    Code: '',
    المشروع: 'اتاحة',
    'اسم العميل': '',
    'اسم الفرع': '',
    العنوان: '',
    القطاعات: 'المناطق الغربية',
    'الادارة العامة المنفذة': '',
    'قطاع التنفيذ': '',
    المحافظة: 'الغربية',
    'مسئوليه التنفيذ': 'التنفيذ',
    'ادارة التنفيذ': '',
    'اسم ورقم تليفون مدير الادارة': '',
    '  Order Service': '',
    'تاريخ السداد و البدء فى التنفيذ': '',
    'المسار الخارجي': 'جاري استخراج تصاريح',
    'المسار الداخلى': 'لم يتم البدء',
    'موقف اللحامات': 'لم يتم البدء',
    'موقف التسليم': 'لم يتم',
    'التصنيف': 'تصاريح',
    'سبب المعوق او التعذر': '',
    'ملحوظه في حاله عدم الانتهاء': '',
    'تاريخ التسليم ': '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Synchronize state when opened
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
        العنوان: '',
        القطاعات: 'المناطق الغربية',
        'الادارة العامة المنفذة': '',
        'قطاع التنفيذ': '',
        المحافظة: 'الغربية',
        'مسئوليه التنفيذ': 'التنفيذ',
        'ادارة التنفيذ': '',
        'اسم ورقم تليفون مدير الادارة': '',
        '  Order Service': '',
        'تاريخ السداد و البدء فى التنفيذ': '',
        'المسار الخارجي': 'جاري استخراج تصاريح',
        'المسار الداخلى': 'لم يتم البدء',
        'موقف اللحامات': 'لم يتم البدء',
        'موقف التسليم': 'لم يتم',
        'التصنيف': 'تصاريح',
        'سبب المعوق او التعذر': '',
        'ملحوظه في حاله عدم الانتهاء': '',
        'تاريخ التسليم ': '',
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

  // Filtered site codes for search
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
        العنوان: site?.address || '',
        القطاعات: site?.sector || 'المناطق الغربية',
        'الادارة العامة المنفذة': site?.generalAdmin || '',
        'ادارة التنفيذ': site?.competentAdmin || '',
        المحافظة: site?.governorate || '',
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.Code?.trim()) {
      newErrors.Code = 'كود المشروع مطلوب';
    }
    if (!formData['اسم العميل']?.trim()) {
      newErrors['اسم العميل'] = 'اسم العميل / الجهة مطلوب';
    }
    if (!formData.القطاعات?.trim()) {
      newErrors.القطاعات = 'القطاع مطلوب';
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
      const payload: EtahaRecord = {
        ...formData,
        Code: code,
        المشروع: 'اتاحة',
        _id: `ETAHA-${code}`,
        _updatedAt: new Date().toISOString(),
        _createdBy: 'Availability Form UI',
      };

      const res = await onSave(payload);
      if (res.success) {
        setSuccessMessage(`تم حفظ المشروع ${code} بنجاح في قاعدة بيانات Availability سحابياً ✅`);
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
                إدخال وتحديث بيانات مشروعات الإتاحة المطابقة لملف الإكسيل مع الحفظ المباشر في Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                <span>وضع الأدمن الكامل (Full Admin)</span>
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {errors.general && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600" />
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
                    placeholder="ابحث بكود المشروع (مثال: 40-1-8 أو 055-1-92)..."
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

              {/* 1. بيانات المشروع والعميل الأساسية */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. بيانات المشروع والعميل (Availability Core Data)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* كود المشروع */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كود المشروع (Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Code}
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
                      اسم العميل / الجهة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData['اسم العميل']}
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

                  {/* اسم الفرع */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الفرع / المقر
                    </label>
                    <input
                      type="text"
                      value={formData['اسم الفرع']}
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
                      value={formData.المحافظة}
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

                  {/* رقم أمر الخدمة Order Service */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم أمر الخدمة (Order Service)
                    </label>
                    <input
                      type="text"
                      value={formData['  Order Service'] || ''}
                      onChange={(e) => handleInputChange('  Order Service', e.target.value)}
                      placeholder="مثال: 6358189"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dir-ltr"
                    />
                  </div>

                  {/* العنوان التفصيلي */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      العنوان التفصيلي للموقع
                    </label>
                    <input
                      type="text"
                      value={formData.العنوان}
                      onChange={(e) => handleInputChange.bind(null, 'العنوان')(e.target.value)}
                      placeholder="العنوان التفصيلي وموقع المبنى..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 2. النطاق الجغرافي والإداري */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. النطاق الإداري والتنفيذي (Administrative Scope)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* القطاع */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      القطاع الجغرافي <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.القطاعات}
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

                  {/* الإدارة العامة المنفذة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الإدارة العامة المنفذة
                    </label>
                    <input
                      type="text"
                      value={formData['الادارة العامة المنفذة']}
                      onChange={(e) => handleInputChange('الادارة العامة المنفذة', e.target.value)}
                      placeholder="مثال: تنفيذ شبكات وسط الدلتا"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* قطاع التنفيذ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      قطاع التنفيذ
                    </label>
                    <input
                      type="text"
                      value={formData['قطاع التنفيذ']}
                      onChange={(e) => handleInputChange('قطاع التنفيذ', e.target.value)}
                      placeholder="مثال: قطاع تنفيذ شبكات الغربية"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* إدارة التنفيذ المختصة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      إدارة التنفيذ المختصة
                    </label>
                    <input
                      type="text"
                      value={formData['ادارة التنفيذ']}
                      onChange={(e) => handleInputChange('ادارة التنفيذ', e.target.value)}
                      placeholder="مثال: الغربية الأولى - الزقازيق..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* اسم ورقم هاتف مدير الإدارة */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم ورقم تليفون مدير الإدارة
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData['اسم ورقم تليفون مدير الادارة']}
                        onChange={(e) => handleInputChange('اسم ورقم تليفون مدير الادارة', e.target.value)}
                        placeholder="مثال: م / عمرو جعفر - 010xxxxxxxx"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. المسارات الثلاثة وموقف التسليم */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    3. المسارات وموقف التسليم (Availability Routes & Status)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* المسار الداخلي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المسار الداخلي (Internal Route)
                    </label>
                    <select
                      value={formData['المسار الداخلى']}
                      onChange={(e) => handleInputChange('المسار الداخلى', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-teal-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {APPROVED_INTERNAL_PATHS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* المسار الخارجي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المسار الخارجي (External Route)
                    </label>
                    <select
                      value={formData['المسار الخارجي']}
                      onChange={(e) => handleInputChange('المسار الخارجي', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-teal-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
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
                      value={formData['موقف اللحامات']}
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

                  {/* موقف التسليم */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      موقف التسليم النهائي
                    </label>
                    <select
                      value={formData['موقف التسليم']}
                      onChange={(e) => handleInputChange('موقف التسليم', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {APPROVED_DELIVERY_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* التصنيف العام */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      التصنيف العام (Overall Classification)
                    </label>
                    <select
                      value={formData['التصنيف']}
                      onChange={(e) => handleInputChange('التصنيف', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {APPROVED_CLASSIFICATIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. المعوقات والملاحظات والتواريخ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    4. المعوقات والتواريخ والملاحظات (Obstacles & Dates)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* سبب المعوق او التعذر */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      أسباب التعذر أو المعوقات
                    </label>
                    <textarea
                      rows={2}
                      value={formData['سبب المعوق او التعذر'] || ''}
                      onChange={(e) => handleInputChange('سبب المعوق او التعذر', e.target.value)}
                      placeholder="اذكر تفاصيل المعوقات إن وجدت (مثال: تصاريح هيئة الطرق، معارضة جهة، إلخ)..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* ملاحظات المتابعة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظات في حالة عدم الانتهاء
                    </label>
                    <textarea
                      rows={2}
                      value={formData['ملحوظه في حاله عدم الانتهاء'] || ''}
                      onChange={(e) => handleInputChange('ملحوظه في حاله عدم الانتهاء', e.target.value)}
                      placeholder="ملاحظات المتابعة الميدانية وموقف التنفيذ..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
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
                    disabled={saving}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 rounded-xl transition shadow-md hover:shadow-teal-500/25 cursor-pointer flex items-center gap-2 disabled:opacity-50"
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
