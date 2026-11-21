// src/components/VodafoneAddDataModal.tsx
// Data-entry and modification modal for Vodafone FTTS sites
// Matches Vodafone schema with full Supabase integration & Admin access

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { VodafoneRecord } from '../types/vodafone';
import type { SiteRecord } from '../types/dashboard';
import { VODAFONE_RAW_RECORDS } from '../data/vodafoneSites';
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
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
  UploadCloud,
  FileCheck,
} from 'lucide-react';

export interface VodafoneAddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: VodafoneRecord) => Promise<{ success: boolean; error?: string; message?: string }>;
  allSiteCodes: string[];
  initialSiteCode?: string;
  initialRecord?: VodafoneRecord | null;
  mode?: 'add' | 'edit';
  sitesData?: SiteRecord[];
  onSwitchToBulk?: () => void;
}

export const VODAFONE_OFFICIAL_CLASSIFICATIONS = [
  'تم التسليم',
  'تم الانتهاء كهربي',
  'تم الانتهاء كهربي ولم يتم التسليم للمنطقة',
  'جاري تصاريح',
  'جاري العمل مدني',
  'جاري العمل كهربي',
  'جاري المعاينة',
  'متعذرات',
  'معوقات',
];

export const VodafoneAddDataModal: React.FC<VodafoneAddDataModalProps> = ({
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
  const [masterRecord, setMasterRecord] = useState<VodafoneRecord | null>(initialRecord || null);

  const [formData, setFormData] = useState<VodafoneRecord>({
    'Site code': '',
    'سنترال الربط': '',
    'المحافظه': '',
    'قطاع التنفيذ': '',
    'قطاع المناطق': '',
    'الادارة العامة للمنطقة': '',
    'الادارة العامة لتنفيذ الشبكات': '',
    'ادارة التنفيذ الفرعية': '',
    'رئاسة قطاعات التنفيذ': '',
    'مسئولية التنفيذ': 'التنفيذ',
    'التصنيف': 'جاري العمل مدني',
    'اسباب التعذر': '',
    'اسباب المعوق': '',
    'الجهة المطلوب الدعم منها': '',
    'التاريخ المتوقع للانتهاء': '',
    'الملاحظات': '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Master records list for Vodafone (official dataset + any live loaded records)
  const vodafoneMasterList = useMemo<VodafoneRecord[]>(() => {
    const list: VodafoneRecord[] = [...VODAFONE_RAW_RECORDS];
    if (sitesData && sitesData.length > 0) {
      sitesData.forEach((s) => {
        if (s.rawRecord && s.company === 'Vodafone') {
          list.push(s.rawRecord as VodafoneRecord);
        }
      });
    }
    return list;
  }, [sitesData]);

  // 1. قطاع التنفيذ Options
  const executionSectorOptions = useMemo(() => {
    const set = new Set<string>();
    vodafoneMasterList.forEach((r) => {
      const v = (r['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();
      if (v) set.add(v);
    });
    const cur = (formData['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set).sort();
  }, [vodafoneMasterList, formData['قطاع التنفيذ']]);

  // 2. قطاع المناطق Options (cascading from قطاع التنفيذ)
  const regionalSectorOptions = useMemo(() => {
    const set = new Set<string>();
    const selectedExecSector = (formData['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();

    const pool = selectedExecSector
      ? vodafoneMasterList.filter((r) => (r['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim() === selectedExecSector)
      : vodafoneMasterList;

    pool.forEach((r) => {
      const v = (r['قطاع المناطق'] || '').replace(/\s+/g, ' ').trim();
      if (v) set.add(v);
    });

    const cur = (formData['قطاع المناطق'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set).sort();
  }, [vodafoneMasterList, formData['قطاع التنفيذ'], formData['قطاع المناطق']]);

  // 3. الإدارة العامة للمنطقة Options (cascading from قطاع المناطق or قطاع التنفيذ)
  const generalAreaAdminOptions = useMemo(() => {
    const set = new Set<string>();
    const selectedRegSector = (formData['قطاع المناطق'] || '').replace(/\s+/g, ' ').trim();
    const selectedExecSector = (formData['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();

    let pool = vodafoneMasterList;
    if (selectedRegSector) {
      pool = pool.filter((r) => (r['قطاع المناطق'] || '').replace(/\s+/g, ' ').trim() === selectedRegSector);
    } else if (selectedExecSector) {
      pool = pool.filter((r) => (r['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim() === selectedExecSector);
    }

    pool.forEach((r) => {
      const v = (r['الادارة العامة للمنطقة'] || '').replace(/\s+/g, ' ').trim();
      if (v) set.add(v);
    });

    const cur = (formData['الادارة العامة للمنطقة'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set).sort();
  }, [vodafoneMasterList, formData['قطاع المناطق'], formData['قطاع التنفيذ'], formData['الادارة العامة للمنطقة']]);

  // 4. الإدارة العامة لتنفيذ الشبكات Options (cascading from قطاع التنفيذ)
  const generalNetworkAdminOptions = useMemo(() => {
    const set = new Set<string>();
    const selectedExecSector = (formData['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();

    const pool = selectedExecSector
      ? vodafoneMasterList.filter((r) => (r['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim() === selectedExecSector)
      : vodafoneMasterList;

    pool.forEach((r) => {
      const v = (r['الادارة العامة لتنفيذ الشبكات'] || '').replace(/\s+/g, ' ').trim();
      if (v) set.add(v);
    });

    const cur = (formData['الادارة العامة لتنفيذ الشبكات'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set).sort();
  }, [vodafoneMasterList, formData['قطاع التنفيذ'], formData['الادارة العامة لتنفيذ الشبكات']]);

  // 5. إدارة التنفيذ الفرعية Options (cascading from الادارة العامة لتنفيذ الشبكات or قطاع التنفيذ)
  const subExecutionAdminOptions = useMemo(() => {
    const set = new Set<string>();
    const selectedNetAdmin = (formData['الادارة العامة لتنفيذ الشبكات'] || '').replace(/\s+/g, ' ').trim();
    const selectedExecSector = (formData['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim();

    let pool = vodafoneMasterList;
    if (selectedNetAdmin) {
      pool = pool.filter((r) => (r['الادارة العامة لتنفيذ الشبكات'] || '').replace(/\s+/g, ' ').trim() === selectedNetAdmin);
    } else if (selectedExecSector) {
      pool = pool.filter((r) => (r['قطاع التنفيذ'] || '').replace(/\s+/g, ' ').trim() === selectedExecSector);
    }

    pool.forEach((r) => {
      const v = (r['ادارة التنفيذ الفرعية'] || '').replace(/\s+/g, ' ').trim();
      if (v) set.add(v);
    });

    const cur = (formData['ادارة التنفيذ الفرعية'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set).sort();
  }, [vodafoneMasterList, formData['الادارة العامة لتنفيذ الشبكات'], formData['قطاع التنفيذ'], formData['ادارة التنفيذ الفرعية']]);

  // 6. التصنيف Options (strictly matching Vodafone Excel dataset)
  const classificationOptions = useMemo(() => {
    const set = new Set<string>();
    VODAFONE_OFFICIAL_CLASSIFICATIONS.forEach((c) => set.add(c));
    const cur = (formData['التصنيف'] || masterRecord?.['التصنيف'] || '').replace(/\s+/g, ' ').trim();
    if (cur) set.add(cur);
    return Array.from(set);
  }, [formData['التصنيف'], masterRecord]);

  // Normalized Classification & Conditional States
  const normClassification = useMemo(() => {
    return String(formData['التصنيف'] || '').replace(/\s+/g, ' ').trim();
  }, [formData['التصنيف']]);

  const isStalled = useMemo(() => {
    return (
      normClassification.includes('متعذر') ||
      normClassification.includes('متعثر') ||
      normClassification === 'متعذرات'
    );
  }, [normClassification]);

  const isObstacle = useMemo(() => {
    return normClassification.includes('معوق');
  }, [normClassification]);

  const isFinishedOrStalled = useMemo(() => {
    return (
      isStalled ||
      normClassification.includes('انتهاء') ||
      normClassification.includes('تسليم') ||
      normClassification.includes('تشغيل فايبر')
    );
  }, [isStalled, normClassification]);

  const showExpectedDate = !isFinishedOrStalled;

  const isDocRequired = useMemo(() => {
    return (
      normClassification === 'جاري تصاريح' ||
      normClassification.includes('تصاريح') ||
      normClassification.includes('انتهاء') ||
      normClassification.includes('تسليم') ||
      normClassification.includes('تشغيل فايبر')
    );
  }, [normClassification]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    handleInputChange('المستند', fileName);
    handleInputChange('موقف المرفقات', 'تم الارفاق');
    uploadAttachment(file, 'documents')
      .then((res) => {
        if (res.success && res.url) {
          handleInputChange('documentUrl', res.url);
        }
      })
      .catch((err) => console.warn('Supabase attachment upload:', err));
  };

  const handleRemoveDocument = () => {
    handleInputChange('المستند', '');
    handleInputChange('موقف المرفقات', 'لم يتم الارفاق');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Synchronize initial record or code
  useEffect(() => {
    setActiveMode(mode);
    if (mode === 'add') {
      setStep('fill-form');
      setMasterRecord(null);
      setFormData({
        'Site code': '',
        'سنترال الربط': '',
        'المحافظه': '',
        'قطاع التنفيذ': '',
        'قطاع المناطق': '',
        'الادارة العامة للمنطقة': '',
        'الادارة العامة لتنفيذ الشبكات': '',
        'ادارة التنفيذ الفرعية': '',
        'رئاسة قطاعات التنفيذ': '',
        'مسئولية التنفيذ': 'التنفيذ',
        'التصنيف': 'جاري العمل مدني',
        'اسباب التعذر': '',
        'اسباب المعوق': '',
        'الجهة المطلوب الدعم منها': '',
        'التاريخ المتوقع للانتهاء': '',
        'الملاحظات': '',
      });
    } else {
      if (initialRecord) {
        setMasterRecord(initialRecord);
        const obstacleVal = initialRecord['اسباب المعوق'] || (initialRecord['التصنيف']?.includes('معوق') ? (initialRecord['اسباب التعذر'] || initialRecord['اسباب التعّذر'] || '') : '');
        setFormData({
          ...initialRecord,
          'اسباب المعوق': obstacleVal,
        });
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

  // Search filtered site codes
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
    const raw = (site?.rawRecord as VodafoneRecord) || null;
    if (raw) {
      setMasterRecord(raw);
      const obstacleVal = raw['اسباب المعوق'] || (raw['التصنيف']?.includes('معوق') ? (raw['اسباب التعذر'] || raw['اسباب التعّذر'] || '') : '');
      setFormData({
        ...raw,
        'اسباب المعوق': obstacleVal,
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        'Site code': code,
        'سنترال الربط': site?.central || '',
        'المحافظه': site?.governorate || '',
        'قطاع التنفيذ': (site as any)?.executionSector || '',
        'قطاع المناطق': (site as any)?.subSector || '',
        'الادارة العامة لتنفيذ الشبكات': site?.generalAdmin || '',
        'ادارة التنفيذ الفرعية': site?.competentAdmin || '',
        'التصنيف': site?.classification || 'جاري العمل مدني',
        'اسباب التعذر': site?.obstacleReason || '',
        'اسباب المعوق': site?.classification?.includes('معوق') ? (site?.obstacleReason || '') : '',
        'الملاحظات': site?.notes || '',
      }));
    }
    setStep('fill-form');
  };

  const handleClassificationChange = (newClassification: string) => {
    const norm = (newClassification || '').replace(/\s+/g, ' ').trim();

    const willBeStalled = norm.includes('متعذر') || norm.includes('متعثر') || norm === 'متعذرات';
    const willBeObstacle = norm.includes('معوق');
    const willBeFinishedOrStalled =
      willBeStalled ||
      norm.includes('انتهاء') ||
      norm.includes('تسليم') ||
      norm.includes('تشغيل فايبر');

    const willRequireDoc =
      norm === 'جاري تصاريح' ||
      norm.includes('تصاريح') ||
      norm.includes('انتهاء') ||
      norm.includes('تسليم') ||
      norm.includes('تشغيل فايبر');

    setFormData((prev) => {
      const updated: VodafoneRecord = {
        ...prev,
        'التصنيف': newClassification,
      };

      // Reset conditional fields that do NOT match the new classification
      if (!willBeStalled) {
        updated['اسباب التعذر'] = '';
        updated['اسباب التعّذر'] = '';
      }
      if (!willBeObstacle) {
        updated['اسباب المعوق'] = '';
      }
      if (willBeFinishedOrStalled) {
        updated['التاريخ المتوقع للانتهاء'] = '';
      }

      return updated;
    });

    // Reset validation errors for hidden / non-matching fields
    setErrors((prev) => {
      const next = { ...prev };
      delete next['التصنيف'];
      if (!willBeStalled) delete next['اسباب التعذر'];
      if (!willBeObstacle) delete next['اسباب المعوق'];
      if (willBeFinishedOrStalled) delete next['التاريخ المتوقع للانتهاء'];
      if (!willRequireDoc) delete next['المستند'];
      return next;
    });
  };

  const handleInputChange = (field: keyof VodafoneRecord, value: any) => {
    if (field === 'التصنيف') {
      handleClassificationChange(value);
      return;
    }

    setFormData((prev) => {
      const updated: VodafoneRecord = {
        ...prev,
        [field]: value,
      };

      // If execution sector changes, optionally keep رئاسة قطاعات التنفيذ in sync
      if (field === 'قطاع التنفيذ') {
        const matching = vodafoneMasterList.find(
          (r) => (r['قطاع التنفيذ'] || '').trim() === String(value).trim()
        );
        if (matching && matching['رئاسة قطاعات التنفيذ']) {
          updated['رئاسة قطاعات التنفيذ'] = matching['رئاسة قطاعات التنفيذ'];
        }
      }

      return updated;
    });

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
    const code = formData['Site code'] || formData['site code'] || formData.site_code;
    if (!String(code || '').trim()) {
      newErrors['Site code'] = 'كود الموقع مطلوب (Site Code)';
    }
    if (!String(formData['التصنيف'] || '').trim()) {
      newErrors['التصنيف'] = 'التصنيف الميداني مطلوب';
    }

    // Conditional: أسباب التعذر
    if (isStalled) {
      const reason = String(formData['اسباب التعذر'] || formData['اسباب التعّذر'] || '').trim();
      if (!reason) {
        newErrors['اسباب التعذر'] = 'أسباب التعذر مطلوبة لحالة متعذر (* مطلوب)';
      }
    }

    // Conditional: أسباب المعوق
    if (isObstacle) {
      const obstacleReason = String(formData['اسباب المعوق'] || formData['اسباب التعذر'] || '').trim();
      if (!obstacleReason) {
        newErrors['اسباب المعوق'] = 'أسباب المعوق مطلوبة لحالة معوقات (* مطلوب)';
      }
    }

    // Conditional: مستند إثبات وتوثيق الموقف
    if (isDocRequired) {
      const doc = String(formData['المستند'] || '').trim();
      if (!doc) {
        newErrors['المستند'] = 'إرفاق مستند إثبات وتوثيق الموقف الحالي إلزامي لهذه الحالة (* مطلوب)';
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
      const rawCode = formData['Site code'] || formData['site code'] || formData.site_code;
      const code = String(rawCode).trim().toUpperCase();

      const finalObstacleReason = isObstacle
        ? (formData['اسباب المعوق'] || formData['اسباب التعذر'] || '')
        : (isStalled ? (formData['اسباب التعذر'] || formData['اسباب التعّذر'] || '') : '');

      const payload: VodafoneRecord = {
        ...formData,
        'Site code': code,
        'site code': code,
        'مسئولية التنفيذ': masterRecord?.['مسئولية التنفيذ'] || 'التنفيذ',
        'اسباب التعذر': finalObstacleReason,
        'اسباب التعّذر': finalObstacleReason,
        'اسباب المعوق': formData['اسباب المعوق'] || '',
        _id: `VDF-${code}`,
        _updatedAt: new Date().toISOString(),
        _createdBy: user?.displayName || 'Vodafone Form UI',
      };

      const res = await onSave(payload);
      if (res.success) {
        setSuccessMessage(res.message || `تم حفظ وتحديث بيانات موقع Vodafone (${code}) بنجاح في قاعدة البيانات ✅`);
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 1200);
      } else {
        setErrors({ _general: res.error || 'فشل حفظ بيانات الموقع' });
      }
    } catch (err: any) {
      setErrors({ _general: err?.message || 'حدث خطأ أثناء حفظ البيانات' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
              {activeMode === 'add' ? (
                <PlusCircle className="w-5 h-5 text-rose-200" />
              ) : (
                <Edit3 className="w-5 h-5 text-rose-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  {activeMode === 'add' ? 'إضافة موقع جديد (Vodafone FTTS)' : 'تعديل وتحديث بيانات موقع Vodafone'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                  Vodafone Red
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                تحديث وحفظ مباشر في قاعدة بيانات Supabase المركزية لمواقع فودافون
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/25 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-200" />
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
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${activeMode === 'add'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white'
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
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${activeMode === 'edit'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white'
                  }`}
              >
                تعديل موقع
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
          {/* General Error Notification */}
          {errors._general && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errors._general}</span>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Site (for edit mode) */}
          {step === 'select-site' && activeMode === 'edit' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm max-w-xl mx-auto">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-rose-100">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">اختر كود موقع Vodafone للتعديل</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ابحث باسم أو كود الموقع لتحديث بياناته وسجلاته
                </p>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
                <input
                  type="text"
                  value={siteCodeSearch}
                  onChange={(e) => setSiteCodeSearch(e.target.value)}
                  placeholder="ابحث بكود الموقع... (مثال: VDF-0100 أو CAI-102)"
                  className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {filteredCodes.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">لم يتم العثور على أكواد مطابقة</p>
                ) : (
                  filteredCodes.map((code) => {
                    const site = sitesData.find(
                      (s) => String(s.siteCode || '').toUpperCase() === code.toUpperCase()
                    );
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectSiteCode(code)}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-rose-50/80 border border-transparent hover:border-rose-200 transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-rose-700">
                            {code}
                          </span>
                          {site && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {site.central} • {site.sector}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition">
                          تعديل ←
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {onSwitchToBulk && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={onSwitchToBulk}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                  >
                    أو انتقل إلى الرفع الجماعي عبر ملف إكسيل (Bulk Import)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Fill Form */}
          {step === 'fill-form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Top Navigation in Form */}
              {activeMode === 'edit' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">الموقع قيد التعديل:</span>
                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                      {formData['Site code'] || formData['site code'] || formData.site_code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select-site')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
                  >
                    ← اختيار موقع آخر
                  </button>
                </div>
              )}

              {/* 1. Base Information Section */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. بيانات الموقع والسنترال
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* كود الموقع */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كود الموقع (Site Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData['Site code'] || formData['site code'] || formData.site_code || ''}
                      onChange={(e) => handleInputChange('Site code', e.target.value)}
                      placeholder="مثال: VDF-0100 أو CAI-102"
                      disabled={activeMode === 'edit' && !isAdmin}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 dir-ltr ${errors['Site code'] ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                        }`}
                    />
                    {errors['Site code'] && (
                      <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors['Site code']}</p>
                    )}
                  </div>

                  {/* سنترال الربط */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سنترال الربط
                    </label>
                    <input
                      type="text"
                      value={formData['سنترال الربط'] || ''}
                      onChange={(e) => handleInputChange('سنترال الربط', e.target.value)}
                      placeholder="اسم السنترال الرئيسي"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  {/* المحافظة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المحافظة
                    </label>
                    <input
                      type="text"
                      value={formData['المحافظه'] || ''}
                      onChange={(e) => handleInputChange('المحافظه', e.target.value)}
                      placeholder="المحافظة"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Administrative Structure with Cascading Dropdowns */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. الهيكل الإداري والتنفيذي (قوائم منسدلة مطابقة للإكسيل)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* 1. قطاع التنفيذ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      قطاع التنفيذ
                    </label>
                    <select
                      value={formData['قطاع التنفيذ'] || ''}
                      onChange={(e) => handleInputChange('قطاع التنفيذ', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر قطاع التنفيذ --</option>
                      {executionSectorOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. قطاع المناطق */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      قطاع المناطق
                    </label>
                    <select
                      value={formData['قطاع المناطق'] || ''}
                      onChange={(e) => handleInputChange('قطاع المناطق', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر قطاع المناطق --</option>
                      {regionalSectorOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. الإدارة العامة للمنطقة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الإدارة العامة للمنطقة
                    </label>
                    <select
                      value={formData['الادارة العامة للمنطقة'] || ''}
                      onChange={(e) => handleInputChange('الادارة العامة للمنطقة', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر الإدارة العامة للمنطقة --</option>
                      {generalAreaAdminOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. الإدارة العامة لتنفيذ الشبكات */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الإدارة العامة لتنفيذ الشبكات
                    </label>
                    <select
                      value={formData['الادارة العامة لتنفيذ الشبكات'] || ''}
                      onChange={(e) => handleInputChange('الادارة العامة لتنفيذ الشبكات', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر الإدارة العامة لتنفيذ الشبكات --</option>
                      {generalNetworkAdminOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* 5. إدارة التنفيذ الفرعية */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      إدارة التنفيذ الفرعية
                    </label>
                    <select
                      value={formData['ادارة التنفيذ الفرعية'] || ''}
                      onChange={(e) => handleInputChange('ادارة التنفيذ الفرعية', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر إدارة التنفيذ الفرعية --</option>
                      {subExecutionAdminOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Site Status & Classification */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. الموقف التنفيذي والتصنيف الميداني
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* التصنيف */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      التصنيف (Classification) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData['التصنيف'] || ''}
                      onChange={(e) => handleClassificationChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="">-- اختر التصنيف --</option>
                      {classificationOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* التاريخ المتوقع للانتهاء (يُخفى في حالات: متعذر، تم الانتهاء، تم التشغيل فايبر، تم التسليم) */}
                  {showExpectedDate && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        التاريخ المتوقع للانتهاء
                      </label>
                      <input
                        type="date"
                        value={formData['التاريخ المتوقع للانتهاء'] || ''}
                        onChange={(e) => handleInputChange('التاريخ المتوقع للانتهاء', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  )}

                  {/* الجهة المطلوب الدعم منها */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الجهة المطلوب الدعم منها
                    </label>
                    <input
                      type="text"
                      value={formData['الجهة المطلوب الدعم منها'] || ''}
                      onChange={(e) => handleInputChange('الجهة المطلوب الدعم منها', e.target.value)}
                      placeholder="الجهة المطلوبة"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  {/* أسباب التعذر (شرطي: فقط إذا كان التصنيف متعذر) */}
                  {isStalled && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        أسباب التعذر <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData['اسباب التعذر'] || formData['اسباب التعّذر'] || ''}
                        onChange={(e) => handleInputChange('اسباب التعذر', e.target.value)}
                        placeholder="توضيح تفاصيل وأسباب التعذر الميداني..."
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${errors['اسباب التعذر'] ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                          }`}
                      />
                      {errors['اسباب التعذر'] && (
                        <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors['اسباب التعذر']}</p>
                      )}
                    </div>
                  )}

                  {/* أسباب المعوق (شرطي: فقط إذا كان التصنيف معوق أو معوقات) */}
                  {isObstacle && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        أسباب المعوق <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData['اسباب المعوق'] || formData['اسباب التعذر'] || ''}
                        onChange={(e) => {
                          handleInputChange('اسباب المعوق', e.target.value);
                          handleInputChange('اسباب التعذر', e.target.value);
                        }}
                        placeholder="توضيح تفاصيل وأسباب المعوقات الميدانية..."
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${errors['اسباب المعوق'] ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                          }`}
                      />
                      {errors['اسباب المعوق'] && (
                        <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors['اسباب المعوق']}</p>
                      )}
                    </div>
                  )}

                  {/* الملاحظات */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الملاحظات (Notes)
                    </label>
                    <textarea
                      rows={2}
                      value={formData['الملاحظات'] || ''}
                      onChange={(e) => handleInputChange('الملاحظات', e.target.value)}
                      placeholder="أي ملاحظات تفصيلية إضافية..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* CONDITIONAL DOCUMENT UPLOAD */}
              {isDocRequired && (
                <div
                  className={`border-2 rounded-2xl p-4 sm:p-5 transition ${errors['المستند']
                      ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200'
                      : formData['المستند']
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-200/60">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-rose-700" />
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        📎 إرفاق مستند إثبات وتوثيق الموقف الحالي (Document Upload):
                      </h3>
                    </div>
                    <span className="text-[11px] font-extrabold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300">
                      * إلزامي لهذه الحالة (* مطلوب)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    يجب إرفاق ملف أو محضر أو خطاب رسمي يوثق الموقف الحالي للموقع (مثل: تصريح الحفر، محضر الاستلام، أو إفادة التشغيل).
                  </p>

                  {errors['المستند'] && (
                    <p className="text-xs font-bold text-rose-700 mb-3 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{errors['المستند']}</span>
                    </p>
                  )}

                  {formData['المستند'] ? (
                    <div className="p-3.5 bg-white border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{formData['المستند']}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">مستند معتمد ومرفق بنجاح ✅</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDocument}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                      >
                        إزالة المستند
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white/80 p-5 rounded-xl text-center cursor-pointer transition group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                      />
                      <UploadCloud className="w-8 h-8 mx-auto text-rose-600 group-hover:scale-110 transition mb-2" />
                      <p className="text-xs font-bold text-slate-800">
                        انقر هنا لاختيار ورفع مستند إثبات الموقف الحالي للموقع
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        يدعم ملفات PDF، الصور (PNG, JPG)، ومستندات Word/Excel (الحد الأقصى 15 ميجابايت)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 rounded-xl transition shadow-md hover:shadow-rose-500/25 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'جارِ الحفظ السحابي...' : 'حفظ بيانات الموقع في Supabase'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
