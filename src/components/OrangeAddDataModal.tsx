// src/components/OrangeAddDataModal.tsx
// Data-entry and modification modal for Orange sites with locked baseline constants and mandatory document upload

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { OrangeRecord } from '../types/orange';
import type { SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import {
  ORANGE_APPROVED_CLASSIFICATIONS,
  ORANGE_STALL_REASONS,
  ORANGE_SUPPORT_ENTITIES,
  normalizeOrangeClassification,
} from '../types/orange';
import { isDocumentRequired } from '../config/fieldConfig';
import { uploadAttachment } from '../lib/supabase';
import {
  findDuplicateInLocalSites,
  checkDuplicateSiteInSupabase,
  type DuplicateSiteMatch,
} from '../utils/siteValidation';
import { DuplicateSiteAlertBanner } from './DuplicateSiteAlertBanner';
import { normalizeSectorName } from '../utils/sectorPermissions';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  Edit3,
  Search,
  Save,
  UploadCloud,
  FileCheck,
  Building2,
  Calendar,
  Sliders,
  DollarSign,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export interface OrangeAddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: OrangeRecord) => Promise<{ success: boolean; error?: string }>;
  allSiteCodes: string[];
  initialSiteCode?: string;
  initialRecord?: OrangeRecord | null;
  mode?: 'add' | 'edit';
  sitesData?: SiteRecord[];
  onSwitchToBulk?: () => void;
}

export const OrangeAddDataModal: React.FC<OrangeAddDataModalProps> = ({
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
  const [masterRecord, setMasterRecord] = useState<OrangeRecord | null>(initialRecord || null);
  const [formData, setFormData] = useState<OrangeRecord>({
    'Site code': '',
    'رئاسة القطاعات ': '',
    'قطاع المناطق': '',
    'قطاع التنفيذ': '',
    'الادارة العامة للتنفيذ': '',
    'المنطقة': '',
    'المحافظه': '',
    'سنترال الربط': '',
    'مسئوليه التنفيذ': '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sitesDataRef = useRef(sitesData);
  sitesDataRef.current = sitesData;
  const initKeyRef = useRef<string>('');

  const isAddMode = activeMode === 'add';
  const isBaselineLocked = !isAddMode;

  // Canonical sector options + distinct suggestions from live Orange sites
  const canonicalSectorOptions = useMemo(() => {
    const base = [
      'إسكندرية و الساحل',
      'قطاع الشرقية',
      'قطاع الغربية',
      'القاهرة الكبرى',
      'المنطقة الجنوبية',
    ];
    const set = new Set<string>(base);
    (sitesData || []).forEach((s) => {
      const sec = normalizeSectorName(s.sector || s.executionSector || '');
      if (sec) set.add(sec);
    });
    const cur = normalizeSectorName(
      String(formData['رئاسة قطاعات التنفيذ'] || formData['رئاسة القطاعات '] || formData['رئاسة القطاعات'] || formData['قطاع التنفيذ'] || '')
    );
    if (cur) set.add(cur);
    return Array.from(set);
  }, [sitesData, formData]);

  const generalAdminSuggestions = useMemo(() => {
    const set = new Set<string>();
    (sitesData || []).forEach((s) => {
      const v = String(s.generalAdmin || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sitesData]);

  const subSectorSuggestions = useMemo(() => {
    const set = new Set<string>();
    (sitesData || []).forEach((s) => {
      const v = String(s.subSector || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sitesData]);

  const competentAdminSuggestions = useMemo(() => {
    const set = new Set<string>();
    (sitesData || []).forEach((s) => {
      const v = String(s.competentAdmin || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sitesData]);

  const centralSuggestions = useMemo(() => {
    const set = new Set<string>();
    (sitesData || []).forEach((s) => {
      const v = String(s.central || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sitesData]);

  const governorateSuggestions = useMemo(() => {
    const defaults = [
      'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية',
      'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد',
      'الإسماعيلية', 'السويس', 'مطروح', 'الفيوم', 'بني سويف', 'المنيا',
      'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر',
      'الوادي الجديد', 'شمال سيناء', 'جنوب سيناء',
    ];
    const set = new Set<string>(defaults);
    (sitesData || []).forEach((s) => {
      const v = String(s.governorate || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sitesData]);

  // Computed Values
  const currentClassification = useMemo(() => {
    return normalizeOrangeClassification(formData['التصنيف (مدني)']);
  }, [formData]);

  const isStalled = currentClassification === 'متعذر';
  const isObstacle = currentClassification === 'معوقات';
  const isCompleted =
    currentClassification === 'تم الانتهاء مدني' ||
    currentClassification === 'تم التشغيل فايبر';

  // Strict conditional document requirement: only for "جاري تصاريح" | "تم الانتهاء" | "تم التشغيل فايبر"
  const isDocRequired = useMemo(() => {
    return isDocumentRequired(formData['التصنيف (مدني)'] || currentClassification);
  }, [formData, currentClassification]);

  // Filtered site codes for search
  const filteredCodes = useMemo(() => {
    if (!siteCodeSearch.trim()) return allSiteCodes.slice(0, 40);
    const q = siteCodeSearch.trim().toLowerCase();
    return allSiteCodes.filter((c) => String(c || '').toLowerCase().includes(q)).slice(0, 40);
  }, [allSiteCodes, siteCodeSearch]);

  // Handle Document Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const fileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    setFormData((prev) => ({
      ...prev,
      المستند: fileName,
      'موقف المرفقات': 'تم الارفاق',
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next['المستند'];
      return next;
    });
    // Background upload to Supabase Storage
    uploadAttachment(file, 'documents')
      .then((res) => {
        if (res.success && res.url) {
          setFormData((prev) => ({ ...prev, documentUrl: res.url }));
        }
      })
      .catch((err) => console.warn('Supabase attachment upload:', err));
  };

  const handleRemoveDocument = () => {
    setPendingFile(null);
    setFormData((prev) => ({
      ...prev,
      المستند: '',
      documentUrl: '',
      'موقف المرفقات': 'لم يتم الارفاق',
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Select Site to Edit
  const handleSelectSiteCode = useCallback(
    (code: string) => {
      const norm = String(code || '').trim().toUpperCase();
      const matchedSite = (sitesDataRef.current || []).find((s) => String(s?.siteCode || '').trim().toUpperCase() === norm);

      if (!matchedSite) {
        setErrors({ _general: `لم يتم العثور على بيانات الموقع: ${code}` });
        return;
      }

      const isSpecial = Boolean(
        matchedSite.specialTarget ??
        matchedSite.special_target ??
        matchedSite.rawRecord?.specialTarget ??
        matchedSite.rawRecord?.special_target ??
        matchedSite.rawRecord?.['سبيشال تارجت'] ??
        false
      );

      const canonSec = normalizeSectorName(matchedSite.sector || matchedSite.executionSector || '');
      const rec: OrangeRecord = {
        'Site code': matchedSite.siteCode,
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        HUBID: matchedSite.siteCode,
        'رئاسة قطاعات التنفيذ': canonSec,
        'رئاسة القطاعات ': canonSec,
        'رئاسة القطاعات': canonSec,
        'الادارة العامة': matchedSite.generalAdmin,
        'الادارة العامة للتنفيذ': matchedSite.generalAdmin,
        'القطاع': matchedSite.subSector || '',
        'قطاع المناطق': matchedSite.subSector || '',
        'قطاع التنفيذ': canonSec || matchedSite.executionSector || matchedSite.sector,
        'المنطقة': matchedSite.competentAdmin,
        'المحافظه': matchedSite.governorate || '',
        'سنترال الربط': matchedSite.central,
        'مسئوليه التنفيذ': matchedSite.responsibility || matchedSite.civilContractor || '',
        العنوان: matchedSite.siteName || '',
        'احدثيات خط العرض': matchedSite.lat || '',
        'احدثيات خط الطول': matchedSite.lng || '',
        'التصنيف (مدني)': matchedSite.classification || 'جاري المعاينة',
        'نوع المعوق المدني': matchedSite.obstacleReason || '',
        'توضيح تفاصيل المعوق و المتعذر ': matchedSite.obstacleDetails || '',
        'تاكيد التسليم للمنطقه': matchedSite.deliveryArea || 'لم يتم التسليم',
        'موقف التسليم لاورنچ': matchedSite.deliveryOrange || 'لم يتم التسليم لاورنچ',
        'ملاحظات التسليمات': matchedSite.deliveryNotes || '',
        'موقف المرفقات': matchedSite.documentStatus || 'لم يتم الارفاق',
        المستند: matchedSite.documentRef || matchedSite.documentName || (matchedSite.documentUrl ? `Doc-Orange-${matchedSite.siteCode}.pdf` : ''),
        documentUrl: matchedSite.documentUrl || matchedSite.attachmentUrl || '',
        'التاريخ المتوقع للانتهاء': matchedSite.expectedDate || '',
        الملاحظات: matchedSite.notes || '',
        _id: matchedSite.id,
      };

      setMasterRecord(rec);
      setFormData(rec);
      setActiveMode('edit');
      setStep('fill-form');
      setErrors({});
    },
    []
  );

  // Initialize Blank Form for New Orange Site (all basic fields unlocked & ready)
  const initNewEntry = useCallback(() => {
    setPendingFile(null);
    setActiveMode('add');
    setStep('fill-form');
    setErrors({});
    setSuccessMessage('');

    const defaultSec = user && user.role !== 'admin' && user.sector && user.sector !== 'ALL'
      ? normalizeSectorName(user.sector)
      : 'إسكندرية و الساحل';

    const blank: OrangeRecord = {
      'Site code': '',
      'site code': '',
      HUBID: '',
      specialTarget: false,
      special_target: false,
      'سبيشال تارجت': false,
      'رئاسة قطاعات التنفيذ': defaultSec,
      'رئاسة القطاعات ': defaultSec,
      'رئاسة القطاعات': defaultSec,
      'قطاع المناطق': '',
      'القطاع': '',
      'قطاع التنفيذ': defaultSec,
      'الادارة العامة': '',
      'الادارة العامة للتنفيذ': '',
      'المنطقة': '',
      'المحافظه': '',
      'سنترال الربط': '',
      'مسئوليه التنفيذ': 'التنفيذ',
      العنوان: '',
      'احدثيات خط العرض': '',
      'احدثيات خط الطول': '',
      'التاريخ المتوقع للانتهاء': `${new Date().getFullYear()}-12-31`,
      'التصنيف (مدني)': 'جاري المعاينة',
      'التصنيف': 'جاري المعاينة',
      'تاكيد التسليم للمنطقه': 'لم يتم التسليم',
      'موقف التسليم لاورنچ': 'لم يتم التسليم لاورنچ',
      'موقف المرفقات': 'لم يتم الارفاق',
      المستند: '',
      documentUrl: '',
      الملاحظات: '',
    };
    setMasterRecord(blank);
    setFormData(blank);
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = '';
      return;
    }
    const recKey = initialRecord
      ? String(initialRecord._id || initialRecord['Site code'] || initialRecord['site code'] || '')
      : '';
    const nextKey = `${mode}|${initialSiteCode || ''}|${recKey}`;
    if (initKeyRef.current === nextKey) return;
    initKeyRef.current = nextKey;

    if (initialRecord) {
      setMasterRecord(initialRecord);
      const isSpecial = Boolean(
        initialRecord.specialTarget ??
        initialRecord.special_target ??
        initialRecord['سبيشال تارجت'] ??
        (initialRecord as any)?.['سبيشال_تارجت'] ??
        false
      );
      const canonSec = normalizeSectorName(
        initialRecord['رئاسة قطاعات التنفيذ'] || initialRecord['رئاسة القطاعات '] || initialRecord['رئاسة القطاعات'] || initialRecord['قطاع التنفيذ'] || ''
      );
      setFormData({
        ...initialRecord,
        ...(canonSec ? {
          'رئاسة قطاعات التنفيذ': canonSec,
          'رئاسة القطاعات ': canonSec,
          'رئاسة القطاعات': canonSec,
          'قطاع التنفيذ': canonSec,
        } : {}),
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        'التصنيف (مدني)': normalizeOrangeClassification(initialRecord['التصنيف (مدني)']),
      });
      setActiveMode('edit');
      setStep('fill-form');
    } else if (initialSiteCode) {
      handleSelectSiteCode(initialSiteCode);
    } else if (mode === 'add') {
      initNewEntry();
    } else {
      setActiveMode('edit');
      setStep('select-site');
      setSiteCodeSearch('');
    }
  }, [isOpen, initialSiteCode, initialRecord, mode, handleSelectSiteCode, initNewEntry]);

  // Handle Field Changes
  const handleFieldChange = (key: keyof OrangeRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key === 'التصنيف (مدني)' || key === 'التصنيف') {
      if (!isDocumentRequired(value)) {
        setErrors((prev) => {
          if (!prev.المستند) return prev;
          const next = { ...prev };
          delete next.المستند;
          return next;
        });
      }
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      delete next._general;
      return next;
    });
  };

  const [cloudDuplicate, setCloudDuplicate] = useState<DuplicateSiteMatch | null>(null);

  const existingDuplicateSite = useMemo(() => {
    if (activeMode !== 'add') return null;
    const rawCode = formData['Site code'] || (formData as any)['site code'] || '';
    return findDuplicateInLocalSites(String(rawCode), sitesData, allSiteCodes) || cloudDuplicate;
  }, [activeMode, formData['Site code'], sitesData, allSiteCodes, cloudDuplicate]);

  // Submit Handler with Conditional Document Validation & Duplicate Protection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const cleanCode = String(formData['Site code'] || '').trim().toUpperCase();
    if (!cleanCode) {
      newErrors['Site code'] = 'يرجى إدخال كود الموقع قبل الحفظ.';
    } else if (activeMode === 'add' && existingDuplicateSite) {
      newErrors['Site code'] = existingDuplicateSite.message;
      newErrors._general = existingDuplicateSite.message;
    }

    if (!formData['التصنيف (مدني)']) {
      newErrors['التصنيف (مدني)'] = 'التصنيف الميداني مطلوب.';
    }

    // ── CONDITIONAL DOCUMENT UPLOAD VALIDATION ──
    // إلزامي فقط للحالات الثلاث: "جاري تصاريح" / "تم الانتهاء" / "تم التشغيل فايبر"
    if (isDocRequired) {
      if (!isAdmin && !String(formData.المستند || '').trim()) {
        newErrors.المستند = '⛔ إلزامي: يجب إرفاق مستند إثبات الموقف الحالي (PDF أو صورة أو تقرير) لحفظ بيانات الموقع.';
      } else if (!String(formData.المستند || '').trim()) {
        formData.المستند = `Doc-Orange-${formData['Site code'] || 'Admin'}.pdf`;
        formData['موقف المرفقات'] = 'تم الارفاق';
      }
    }

    if (isStalled && !String(formData['نوع المعوق المدني'] || '').trim()) {
      newErrors['نوع المعوق المدني'] = 'يرجى اختيار سبب التعذر.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setCloudDuplicate(null);
    try {
      if (activeMode === 'add') {
        const remoteDup = await checkDuplicateSiteInSupabase('Orange', cleanCode);
        if (remoteDup) {
          setCloudDuplicate(remoteDup);
          setErrors({ 'Site code': remoteDup.message, _general: remoteDup.message });
          setSaving(false);
          return;
        }
      }
      const isSpecial = Boolean(
        formData.specialTarget ||
        formData.special_target ||
        formData['سبيشال تارجت']
      );

      let docUrl = formData.documentUrl || '';
      if (pendingFile && !docUrl) {
        try {
          const uploadRes = await uploadAttachment(pendingFile, 'documents');
          if (uploadRes.success && uploadRes.url) {
            docUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Orange attachment upload fallback warning:', uploadErr);
        }
      }

      const canonSector = normalizeSectorName(
        String(formData['رئاسة قطاعات التنفيذ'] || formData['رئاسة القطاعات '] || formData['رئاسة القطاعات'] || formData['قطاع التنفيذ'] || '').trim()
      );
      const cleanCode = String(formData['Site code'] || formData.HUBID || '').trim().toUpperCase();

      const payload: OrangeRecord = {
        ...formData,
        'Site code': cleanCode,
        'site code': cleanCode,
        HUBID: cleanCode,
        ...(canonSector ? {
          'رئاسة قطاعات التنفيذ': canonSector,
          'رئاسة القطاعات ': canonSector,
          'رئاسة القطاعات': canonSector,
          'قطاع التنفيذ': canonSector,
        } : {}),
        'الادارة العامة': formData['الادارة العامة للتنفيذ'] || formData['الادارة العامة'] || '',
        'الادارة العامة للتنفيذ': formData['الادارة العامة للتنفيذ'] || formData['الادارة العامة'] || '',
        'الادارة العامة لتنفيذ الشبكات': formData['الادارة العامة للتنفيذ'] || formData['الادارة العامة'] || '',
        'التصنيف': formData['التصنيف (مدني)'] || formData['التصنيف'] || 'جاري المعاينة',
        documentUrl: docUrl,
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
      };
      const res = await onSave(payload);
      if (res.success) {
        setSuccessMessage(res.message || '✅ تم حفظ وتحديث بيانات موقع Orange بنجاح في قاعدة البيانات!');
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 1200);
      } else {
        setErrors({ _general: res.error || 'حدث خطأ أثناء الحفظ.' });
      }
    } catch (err: any) {
      setErrors({ _general: err?.message || 'فشل الاتصال وحفظ البيانات.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {activeMode === 'add' ? 'إضافة موقع Orange جديد (Add Orange Site)' : 'تعديل بيانات موقع Orange (Edit Orange Site)'}
              </h2>
              <p className="text-xs text-orange-100 font-medium">
                منظومة تتبع أعمال فايبر FTTS • شبكة Orange مصر
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToBulk && (
              <button
                type="button"
                onClick={onSwitchToBulk}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="التحويل إلى الرفع الجماعي عبر ملف الإكسيل"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>الرفع الجماعي بالإكسيل</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
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

          {/* STEP 1: Select Site Code to Edit */}
          {step === 'select-site' && activeMode === 'edit' ? (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <label className="text-xs font-bold text-orange-950 flex items-center gap-1.5 mb-2">
                  <Search className="w-4 h-4 text-orange-600" />
                  <span>ابحث عن كود موقع Orange المراد تعديل بياناته:</span>
                </label>
                <input
                  type="text"
                  placeholder="اكتب كود الموقع (مثل: 0005DE, 0006SI, 0008CA)..."
                  value={siteCodeSearch}
                  onChange={(e) => setSiteCodeSearch(e.target.value)}
                  className="w-full bg-white border border-orange-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                {filteredCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectSiteCode(code)}
                    className="p-2.5 bg-slate-50 hover:bg-orange-500 hover:text-white border border-slate-200 rounded-xl text-xs font-bold font-mono transition text-center cursor-pointer shadow-2xs"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {isAddMode && (cloudDuplicate || existingDuplicateSite) && (
                <DuplicateSiteAlertBanner
                  duplicate={(cloudDuplicate || existingDuplicateSite)!}
                  onSwitchToEdit={(dupCode) => {
                    setCloudDuplicate(null);
                    setErrors({});
                    setActiveMode('edit');
                    handleSelectSiteCode(dupCode);
                  }}
                />
              )}

              {/* SECTION 1: Baseline Data (Fully Unlocked in Add Mode, Protected in Edit Mode) */}
              <div className={`border rounded-2xl p-4 sm:p-5 ${isAddMode ? 'bg-orange-50/40 border-orange-200' : 'bg-slate-50/80 border-slate-200'}`}>
                <div className={`flex items-center justify-between pb-2 mb-3 border-b ${isAddMode ? 'border-orange-200' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    {isAddMode ? (
                      <PlusCircle className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                    <h3 className={`font-extrabold text-xs sm:text-sm ${isAddMode ? 'text-orange-950' : 'text-slate-800'}`}>
                      {isAddMode
                        ? '➕ البيانات الأساسية لموقع Orange الجديد (مفتوحة بالكامل للإدخال):'
                        : '🔒 البيانات الأساسية الثابتة للموقع (Read-Only - غير مسموح بتعديلها من القطاع):'}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${isAddMode ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-slate-500 bg-slate-200/80'}`}>
                    {isAddMode ? 'مفتوح للإضافة ✨' : 'محمية بالنظام 🔒'}
                  </span>
                </div>

                {/* Datalists for fast autocomplete in Add Mode */}
                <datalist id="orange-ga-list">
                  {generalAdminSuggestions.map((v) => <option key={v} value={v} />)}
                </datalist>
                <datalist id="orange-subsector-list">
                  {subSectorSuggestions.map((v) => <option key={v} value={v} />)}
                </datalist>
                <datalist id="orange-comp-list">
                  {competentAdminSuggestions.map((v) => <option key={v} value={v} />)}
                </datalist>
                <datalist id="orange-gov-list">
                  {governorateSuggestions.map((v) => <option key={v} value={v} />)}
                </datalist>
                <datalist id="orange-central-list">
                  {centralSuggestions.map((v) => <option key={v} value={v} />)}
                </datalist>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {/* كود الموقع */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      كود الموقع (Site Code / HUBID) {isAddMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="مثال: 0009AL أو ORG-101"
                      value={formData['Site code'] || formData.HUBID || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData((prev) => ({
                          ...prev,
                          'Site code': val,
                          'site code': val,
                          HUBID: val,
                        }));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next['Site code'];
                          delete next._general;
                          return next;
                        });
                      }}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold font-mono text-slate-700 cursor-not-allowed'
                        : `w-full bg-white border-2 ${errors['Site code'] ? 'border-red-400 ring-1 ring-red-200' : 'border-orange-300'} rounded-lg px-3 py-1.5 font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400`}
                    />
                    {errors['Site code'] && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">{errors['Site code']}</p>
                    )}
                  </div>

                  {/* القطاع / رئاسة القطاعات */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">القطاع / رئاسة القطاعات</label>
                    {isBaselineLocked ? (
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={normalizeSectorName(formData['رئاسة قطاعات التنفيذ'] || formData['رئاسة القطاعات '] || formData['رئاسة القطاعات'] || '')}
                        className="w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed"
                      />
                    ) : (
                      <select
                        value={normalizeSectorName(formData['رئاسة قطاعات التنفيذ'] || formData['رئاسة القطاعات '] || formData['رئاسة القطاعات'] || formData['قطاع التنفيذ'] || '')}
                        onChange={(e) => {
                          const val = normalizeSectorName(e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            'رئاسة قطاعات التنفيذ': val,
                            'رئاسة القطاعات ': val,
                            'رئاسة القطاعات': val,
                            'قطاع التنفيذ': val,
                          }));
                        }}
                        className="w-full bg-white border border-orange-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                      >
                        {canonicalSectorOptions.map((sec) => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* الإدارة العامة للتنفيذ */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">الإدارة العامة للتنفيذ</label>
                    <input
                      type="text"
                      list="orange-ga-list"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اختر أو اكتب الإدارة العامة..."
                      value={formData['الادارة العامة للتنفيذ'] || formData['الادارة العامة'] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          'الادارة العامة للتنفيذ': val,
                          'الادارة العامة': val,
                          'الادارة العامة لتنفيذ الشبكات': val,
                        }));
                      }}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* الإدارة المختصة (قطاع المناطق) */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">الإدارة المختصة / قطاع المناطق</label>
                    <input
                      type="text"
                      list="orange-subsector-list"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اختر أو اكتب الإدارة المختصة..."
                      value={formData['القطاع'] || formData['قطاع المناطق'] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          'القطاع': val,
                          'قطاع المناطق': val,
                        }));
                      }}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* إدارة المنطقة (المنطقة) */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">إدارة المنطقة (المنطقة)</label>
                    <input
                      type="text"
                      list="orange-comp-list"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اختر أو اكتب إدارة المنطقة..."
                      value={formData['المنطقة'] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          'المنطقة': val,
                          'ادارة التنفيذ الفرعية': val,
                        }));
                      }}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* المحافظة */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">المحافظة</label>
                    <input
                      type="text"
                      list="orange-gov-list"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اختر أو اكتب المحافظة..."
                      value={formData['المحافظه'] || ''}
                      onChange={(e) => handleFieldChange('المحافظه', e.target.value)}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* سنترال الربط */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">سنترال الربط</label>
                    <input
                      type="text"
                      list="orange-central-list"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اختر أو اكتب السنترال..."
                      value={formData['سنترال الربط'] || ''}
                      onChange={(e) => handleFieldChange('سنترال الربط', e.target.value)}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* مسؤولية التنفيذ */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">مسؤولية التنفيذ</label>
                    <input
                      type="text"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="مثال: التنفيذ أو المناطق"
                      value={formData['مسئوليه التنفيذ'] || formData['مسئولية التنفيذ'] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          'مسئوليه التنفيذ': val,
                          'مسئولية التنفيذ': val,
                        }));
                      }}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* اسم الموقع / العنوان */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">اسم الموقع / العنوان</label>
                    <input
                      type="text"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="اكتب اسم الموقع أو العنوان..."
                      value={formData['العنوان'] || ''}
                      onChange={(e) => handleFieldChange('العنوان', e.target.value)}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  {/* الإحداثيات (خط العرض / خط الطول) والتاريخ المتوقع */}
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="مثال: 31.2001"
                      value={formData['احدثيات خط العرض'] || ''}
                      onChange={(e) => handleFieldChange('احدثيات خط العرض', e.target.value)}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      readOnly={isBaselineLocked}
                      disabled={isBaselineLocked}
                      placeholder="مثال: 29.9187"
                      value={formData['احدثيات خط الطول'] || ''}
                      onChange={(e) => handleFieldChange('احدثيات خط الطول', e.target.value)}
                      className={isBaselineLocked
                        ? 'w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-700 cursor-not-allowed'
                        : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400'}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">التاريخ المتوقع للانتهاء</label>
                    <input
                      type="date"
                      value={String(formData['التاريخ المتوقع للانتهاء'] || '').slice(0, 10)}
                      onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Special Target Checkbox */}
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="flex items-center gap-2.5 p-3 bg-amber-50/80 hover:bg-amber-100/70 border-2 border-amber-300/80 rounded-xl cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.specialTarget || formData.special_target || formData['سبيشال تارجت'])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            specialTarget: checked,
                            special_target: checked,
                            'سبيشال تارجت': checked,
                          }));
                        }}
                        className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                          <span>⭐</span>
                          <span>Special Target</span>
                        </span>
                        <span className="text-[11px] text-amber-700 font-semibold">
                          - تحديد هذا الموقع كهدف ذو أولوية خاصة واستراتيجية
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Editable Status & Classification */}
              <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-orange-950 text-xs sm:text-sm">
                    ✏️ الموقف التنفيذي والتصنيف الميداني (متاح للتعديل):
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Classification Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
                      <span>التصنيف الميداني (Classification):</span>
                      <span className="text-red-500 font-bold">* مطلوب</span>
                    </label>
                    <select
                      value={formData['التصنيف (مدني)'] || 'جاري المعاينة'}
                      onChange={(e) => handleFieldChange('التصنيف (مدني)', e.target.value)}
                      className="w-full bg-white border-2 border-orange-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-xs"
                    >
                      {ORANGE_APPROVED_CLASSIFICATIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Site Status */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
                      <span>موقف التسليم لأورنج:</span>
                      <span className="text-slate-500 font-normal">تحديث التسليم</span>
                    </label>
                    <select
                      value={formData['موقف التسليم لاورنچ'] || 'لم يتم التسليم لاورنچ'}
                      onChange={(e) => handleFieldChange('موقف التسليم لاورنچ', e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-xs"
                    >
                      <option value="لم يتم التسليم لاورنچ">لم يتم التسليم لاورنچ</option>
                      <option value="تم التسليم لاورنچ">تم التسليم لاورنچ</option>
                    </select>
                  </div>
                </div>

                {/* DYNAMIC CASE: التصنيف "متعذر" */}
                {isStalled && (
                  <div className="bg-rose-50/80 border-2 border-rose-300 rounded-xl p-4 space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <h4 className="font-extrabold text-rose-950 text-xs sm:text-sm">
                          تفاصيل وموقف التعذر الميداني لـ Orange:
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-200 px-2 py-0.5 rounded-full">
                        تعبئة بيانات التعذر إلزامية
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-rose-950 block mb-1">
                          قائمة أسباب التعذر: <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData['نوع المعوق المدني'] || ''}
                          onChange={(e) => handleFieldChange('نوع المعوق المدني', e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2 font-bold text-slate-800"
                        >
                          <option value="">-- اختر سبب التعذر --</option>
                          {ORANGE_STALL_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-rose-950 block mb-1">الجهة المطلوب الدعم منها:</label>
                        <select
                          value={formData['الجهة المطلوب الدعم منها'] || ''}
                          onChange={(e) => handleFieldChange('الجهة المطلوب الدعم منها', e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2 font-medium text-slate-800"
                        >
                          <option value="">-- اختر الجهة --</option>
                          {ORANGE_SUPPORT_ENTITIES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">التكلفة المتوقعة (ج.م):</label>
                        <input
                          type="number"
                          placeholder="مثال: 150000"
                          value={formData['تكلفة الاعمال بالجنيه'] || ''}
                          onChange={(e) => handleFieldChange('تكلفة الاعمال بالجنيه', e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">المسافة (كم):</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="مثال: 3.5"
                          value={formData['المسافة كم'] || ''}
                          onChange={(e) => handleFieldChange('المسافة كم', e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2 font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="font-bold text-rose-950 block mb-1">
                          توضيح وتفاصيل أسباب التعذر الميداني بدقة:
                        </label>
                        <textarea
                          rows={3}
                          placeholder="يرجى كتابة وتفصيل أسباب التعذر الميداني أو رفض التصاريح أو المشكلات الفنية..."
                          value={formData['توضيح تفاصيل المعوق و المتعذر '] || ''}
                          onChange={(e) => handleFieldChange('توضيح تفاصيل المعوق و المتعذر ', e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* DYNAMIC CASE: التصنيف "معوقات" */}
                {isObstacle && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in">
                    <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>تفاصيل المعوقات الميدانية:</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-amber-950 block mb-1">نوع المعوق:</label>
                        <select
                          value={formData['نوع المعوق المدني'] || ''}
                          onChange={(e) => handleFieldChange('نوع المعوق المدني', e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg p-2 font-bold"
                        >
                          <option value="">-- اختر نوع المعوق --</option>
                          {ORANGE_STALL_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-amber-950 block mb-1">الجهة المعنية:</label>
                        <select
                          value={formData['الجهة المطلوب الدعم منها'] || ''}
                          onChange={(e) => handleFieldChange('الجهة المطلوب الدعم منها', e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg p-2 font-medium"
                        >
                          <option value="">-- اختر الجهة --</option>
                          {ORANGE_SUPPORT_ENTITIES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: CONDITIONAL DOCUMENT UPLOAD */}
              {isDocRequired && (
                <div
                  className={`border-2 rounded-2xl p-4 sm:p-5 transition ${errors.المستند
                    ? 'bg-red-50/60 border-red-400 ring-2 ring-red-300'
                    : 'bg-emerald-50/40 border-emerald-300'
                    }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-emerald-700" />
                      <h3 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                        📎 مستند إثبات الموقف الحالي (Document Proof Upload):
                      </h3>
                    </div>
                    <span className="text-[11px] font-extrabold bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full border border-red-300">
                      * إلزامي لهذه الحالة (* مطلوب)
                    </span>
                  </div>

                  {errors.المستند && (
                    <p className="text-xs font-bold text-red-700 mb-3 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{errors.المستند}</span>
                    </p>
                  )}

                  {formData.المستند ? (
                    <div className="p-3.5 bg-white border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{formData.المستند}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">مستند معتمد ومرفق بنجاح ✅</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDocument}
                        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition cursor-pointer"
                      >
                        إزالة المستند
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-white/80 p-5 rounded-xl text-center cursor-pointer transition group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                      />
                      <UploadCloud className="w-8 h-8 mx-auto text-emerald-600 group-hover:scale-110 transition mb-2" />
                      <p className="text-xs font-bold text-slate-800">
                        انقر هنا لاختيار ورفع مستند إثبات الموقف الحالي للموقع
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        يدعم ملفات PDF، الصور (PNG, JPG)، ومستندات الإكسيل (الحد الأقصى 15 ميجابايت)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الملاحظات والتسليمات الميدانية:</label>
                <textarea
                  rows={2}
                  value={formData.الملاحظات || ''}
                  onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                  placeholder="ملاحظات عامة حول الموقف التنفيذي لموقع أورنج..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التحديثات (Save Changes)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

