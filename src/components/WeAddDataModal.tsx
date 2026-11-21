// src/components/WeAddDataModal.tsx
// Dynamic data-entry modal driven by fieldConfig.ts with Strict Role-Based Permissions & Conditional Fields.
// Layout:
// 1. Top Section (قسم بيانات الموقع الأساسية): Fixed & Read-only baseline site data at the very top.
// 2. Bottom Section (قسم التعديل والحالة):
//    - حالة الموقع (Site Status) with animated pulse indicator if On Air
//    - التصنيف (Classification) directly beneath Site Status
//    - Branching Dynamic Conditional Fields bound to the chosen Classification
// All sector permissions and locked baseline fields are strictly preserved.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getBlueFields,
  getGreenFields,
  getPurpleFields,
  getSortedFields,
  APPROVED_CLASSIFICATIONS,
  normalizeClassification,
  isDocumentRequired,
} from '../config/fieldConfig';
import type { WeRecord } from '../config/fieldConfig';
import type { SiteRecord } from '../types/dashboard';
import { fetchSiteRecord, fetchDropdownValues, saveRecord } from '../hooks/useWeAPI';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector } from '../utils/sectorPermissions';
import { uploadAttachment } from '../lib/supabase';
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Eye,
  X,
  PlusCircle,
  Edit3,
  Search,
  ArrowRight,
  Save,
  UploadCloud,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  Activity,
  FileText,
  Clock,
  DollarSign,
  Navigation,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';

export interface WeAddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (record: WeRecord) => void;
  onSave?: (record: WeRecord) => Promise<boolean | void> | void;
  onSubmit?: (record: WeRecord) => Promise<boolean | void> | void;
  allSiteCodes: string[];
  initialSiteCode?: string;
  initialRecord?: WeRecord | null;
  mode?: 'add' | 'edit';
  onSwitchToBulk?: () => void;
  sitesData?: SiteRecord[];
}

type FormMode = 'edit' | 'add';
type FormStep = 'select-site' | 'fill-form';

// Fallback options for key dropdowns if Supabase has not yet accumulated distinct values
const DEFAULT_FALLBACK_DROPDOWNS: Record<string, string[]> = {
  'Site Status': [
    'On Air',
    'CGA',
    'ON AIR',
    'تم التشغيل',
    'تم الانتهاء',
    'تم التسليم',
    'جاري العمل مدني',
    'جاري العمل كهربي',
    'جاري العمل',
    'جاري المعاينة',
    'جاري تصاريح',
    'متعذر',
    'معوقات',
    'PROBLEM',
    'CWF',
    'RDT',
  ],
  'التصنيف': [
    'تم الانتهاء',
    'تم التشغيل فايبر',
    'جاري المعاينة',
    'جاري تصاريح',
    'جاري كهربي',
    'جاري مدني',
    'متعذر',
    'معوقات',
  ],
  'اسباب التعذر': [
    'ارتفاع التكلفة',
    'التصاريح',
    'عدم إمكانية',
    'اعتراض مالك',
    'اعتراض أهالي',
    'التنسيق مع جهات أخرى',
    'التنسيق مع جهات حكومية',
    'بعد المسافة',
    'تصاريح مرور',
    'تصاريح سكة حديد',
    'أهالي ومعارضات',
    'تعديل مسار',
    'لا يوجد تعذر',
  ],
  'الجهة المطلوب الدعم منها': [
    'الجهاز القومي لتنظيم الاتصالات NTRA',
    'وزارة النقل / الطرق والكباري',
    'حي / مجلس مدينة',
    'إدارة المرور',
    'الشركة المصرية لنقل الكهرباء',
    'الهيئة العامة للطرق والكباري',
    'السكك الحديدية',
    'جهة أمنية / شرطة',
    'المحافظة',
    'لا يوجد',
  ],
  'خطة': ['2021', '2022', '2023', '2024', '2025', '2026', 'خطة عاجلة'],
};

// ── Baseline Immutable Fields (Strictly Read-Only for Regular Sector Users) ──
// Requirements: كود الموقع، قطاع التنفيذ، قطاع المناطق، الإدارة العامة لتنفيذ الشبكات، مسؤولية التنفيذ، النوع، الخطة، حالة الموقع
export const IMMUTABLE_FIELDS_FOR_SECTOR = new Set([
  'site code',
  'Site code',
  'site_code',
  'Exc sector',
  'Exc Sectores',
  'Sectores',
  'قطاع التنفيذ',
  'Zone',
  'قطاع المناطق',
  'Exc Zone',
  'اداره التنفيذ المختصه',
  'إدارة التنفيذ المختصة',
  'ادارة التنفيذ المختصة',
  'الادارة العامة لتنفيذ الشبكات',
  'المسئولية',
  'مسئولية التنفيذ',
  'مسؤولية التنفيذ',
  'Type',
  'النوع',
  'خطة',
  'Plan',
  'Site Status',
  'حالة الموقع',
  'السنترال',
  'Sectore',
]);

export function isFieldImmutableForSector(csvColumn: string): boolean {
  return IMMUTABLE_FIELDS_FOR_SECTOR.has(csvColumn) || IMMUTABLE_FIELDS_FOR_SECTOR.has(csvColumn.trim());
}

// ── Status & Classification Categories for Conditional Fields Display ──
export type SiteStatusCategory =
  | 'completed_or_operational' // تم الانتهاء أو تم التشغيل أو تم التشغيل فايبر
  | 'in_progress'              // جاري المعاينة، جاري تصاريح، جاري العمل، جاري العمل كهربي، جاري العمل مدني
  | 'stalled'                  // متعذر
  | 'obstacles'                // معوقات
  | 'general';

export function getClassificationCategory(classificationRaw?: string, statusRaw?: string): SiteStatusCategory {
  const c = (classificationRaw || '').toLowerCase().trim();
  const s = (statusRaw || '').toLowerCase().trim();
  // Classification in Line 2 is the primary driver as requested
  const target = c || s;

  // 1. متعذر (Stalled)
  if (target.includes('متعذر') || target.includes('متعثر') || target.includes('تعذر') || target.includes('رفض')) {
    return 'stalled';
  }

  // 2. معوقات (Obstacles)
  if (target.includes('معوق') || target.includes('problem') || target.includes('عائق')) {
    return 'obstacles';
  }

  // 3. تم الانتهاء أو تم التشغيل أو تم التشغيل فايبر (Completed or Operational)
  if (
    target.includes('تم الانتهاء') ||
    target.includes('انتهاء') ||
    target.includes('تم التسليم') ||
    target.includes('تسليم') ||
    target.includes('تم التشغيل') ||
    target.includes('تشغيل فايبر') ||
    target.includes('تشغيل فيبر') ||
    target.includes('on air') ||
    target.includes('onair') ||
    (target.includes('تشغيل') && !target.includes('جاري'))
  ) {
    return 'completed_or_operational';
  }

  // 4. جاري العمل، جاري تصاريح، جاري المعاينة، جاري العمل مدني، جاري العمل كهربي (In Progress)
  if (
    target.includes('جاري العمل') ||
    target.includes('جاري المعاينة') ||
    target.includes('معاين') ||
    target.includes('جاري تصاريح') ||
    target.includes('تصاريح') ||
    target.includes('تصريح') ||
    target.includes('كهرب') ||
    target.includes('مدن') ||
    target.includes('عمل') ||
    target.includes('cwf') ||
    target.includes('rdt') ||
    target.includes('جاري')
  ) {
    return 'in_progress';
  }

  return 'general';
}

export type StalledSubReason = 'high_cost' | 'permits' | 'impossible' | 'other';

export function getStalledSubReason(reasonRaw?: string): StalledSubReason {
  const r = (reasonRaw || '').toLowerCase().trim();
  if (r.includes('ارتفاع التكلفة') || r.includes('تكلفة') || r.includes('تكلفه')) {
    return 'high_cost';
  }
  if (r.includes('تصاريح') || r.includes('تصريح') || r.includes('مرور') || r.includes('سكة حديد')) {
    return 'permits';
  }
  if (
    r.includes('عدم إمكانية') ||
    r.includes('عدم امكانية') ||
    r.includes('امكانية') ||
    r.includes('إمكانية') ||
    r.includes('استحالة')
  ) {
    return 'impossible';
  }
  return 'other';
}

export type ObstaclesSubReason = 'governmental_owner_objection' | 'far_distance' | 'other';

export function getObstaclesSubReason(reasonRaw?: string): ObstaclesSubReason {
  const r = (reasonRaw || '').toLowerCase().trim();
  if (
    r.includes('اعتراض مالك') ||
    r.includes('اعتراض أهالي') ||
    r.includes('اعتراض اهالي') ||
    r.includes('اعتراض') ||
    r.includes('مالك') ||
    r.includes('أهالي') ||
    r.includes('اهالي') ||
    r.includes('تنسيق مع جهات أخرى') ||
    r.includes('تنسيق مع جهات حكومية') ||
    r.includes('جهات أخرى') ||
    r.includes('جهات حكومية') ||
    r.includes('تنسيق') ||
    r.includes('حكومي')
  ) {
    return 'governmental_owner_objection';
  }
  if (r.includes('بعد المسافة') || r.includes('مسافة') || r.includes('مسافه')) {
    return 'far_distance';
  }
  return 'other';
}

export const WeAddDataModal: React.FC<WeAddDataModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onSave,
  onSubmit,
  allSiteCodes,
  initialSiteCode,
  initialRecord,
  mode = 'edit',
  onSwitchToBulk,
  sitesData,
}) => {
  const { user, getSectorPermission } = useAuth();
  const isAdmin = Boolean(user && (user.role === 'admin' || user.sector === 'ALL'));
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── Mode & Step State ──
  const [activeMode, setActiveMode] = useState<FormMode>(mode);
  const [step, setStep] = useState<FormStep>(initialSiteCode || initialRecord || mode === 'add' ? 'fill-form' : 'select-site');
  const [siteCodeSearch, setSiteCodeSearch] = useState('');
  const [masterRecord, setMasterRecord] = useState<WeRecord | null>(initialRecord || null);
  const [formData, setFormData] = useState<WeRecord>({});
  const [dropdownValues, setDropdownValues] = useState<Record<string, string[]>>(DEFAULT_FALLBACK_DROPDOWNS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    existingRecord: WeRecord;
  } | null>(null);

  // Admin Toggle for full field editing (defaults to TRUE for admin)
  const [adminFullEditMode, setAdminFullEditMode] = useState(true);

  React.useEffect(() => {
    if (isAdmin) {
      setAdminFullEditMode(true);
    }
  }, [isAdmin, isOpen]);

  // Computed values
  const currentStatus = formData['Site Status'] || masterRecord?.['Site Status'] || 'On Air';
  const rawClassification =
    formData['التصنيف'] ||
    masterRecord?.['التصنيف'] ||
    formData['Site Status'] ||
    masterRecord?.['Site Status'] ||
    'جاري مدني';
  const currentClassification = normalizeClassification(rawClassification);
  const currentReason = formData['اسباب التعذر'] || masterRecord?.['اسباب التعذر'] || '';

  // Pulse Indicator: check if status is On Air
  const isOnAir = useMemo(() => {
    const s = String(currentStatus || '').toLowerCase().trim();
    return s === 'on air' || s === 'onair' || s.includes('on air') || s.includes('onair');
  }, [currentStatus]);

  // Driving category from Classification in Line 2
  const currentCategory = useMemo(() => {
    return getClassificationCategory(currentClassification, currentStatus);
  }, [currentClassification, currentStatus]);

  const currentStalledReason = useMemo(() => {
    return getStalledSubReason(currentReason);
  }, [currentReason]);

  const currentObstaclesReason = useMemo(() => {
    return getObstaclesSubReason(currentReason);
  }, [currentReason]);

  // Strict conditional document requirement: only for "جاري تصاريح" | "تم الانتهاء" | "تم التشغيل فايبر"
  const isDocRequired = useMemo(() => {
    return isDocumentRequired(currentClassification);
  }, [currentClassification]);

  // Document file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    handleFieldChange('المستند', fileName);
    // Background upload to Supabase Storage
    uploadAttachment(file, 'documents')
      .then((res) => {
        if (res.success && res.url) {
          handleFieldChange('documentUrl', res.url);
        }
      })
      .catch((err) => console.warn('Supabase attachment upload:', err));
  };

  const handleRemoveDocument = () => {
    handleFieldChange('المستند', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Field groups from centralized configuration
  const blueFields = useMemo(() => getBlueFields(), []);
  const greenFields = useMemo(() => getGreenFields(), []);
  const purpleFields = useMemo(() => getPurpleFields(), []);
  const sortedFields = useMemo(() => getSortedFields(), []);

  // Default sector for new additions
  const userDefaultSector = useMemo(() => {
    if (!user || user.sector === 'ALL') return 'الإسكندرية';
    return user.sector;
  }, [user]);

  // Sector permission evaluation for the selected record
  const permissionInfo = useMemo(() => {
    if (activeMode === 'add') {
      return {
        canEdit: true,
        reason: isAdmin
          ? 'إضافة موقع جديد (صلاحية كاملة للإدارة Admin)'
          : `إضافة موقع جديد يتبع (${userDefaultSector})`,
      };
    }
    if (!masterRecord) return null;
    return getSectorPermission(masterRecord);
  }, [activeMode, masterRecord, getSectorPermission, isAdmin, userDefaultSector]);

  const isReadOnly = Boolean(activeMode === 'edit' && permissionInfo && !permissionInfo.canEdit);

  // Filtered site codes for search
  const filteredCodes = useMemo(() => {
    const codes = allSiteCodes || [];
    if (!siteCodeSearch.trim()) return codes.slice(0, 50);
    const q = siteCodeSearch.trim().toLowerCase();
    return codes.filter((c) => String(c || '').toLowerCase().includes(q)).slice(0, 50);
  }, [allSiteCodes, siteCodeSearch]);

  const hasExactMatch = useMemo(() => {
    const codes = allSiteCodes || [];
    if (!siteCodeSearch.trim()) return true;
    const q = siteCodeSearch.trim().toLowerCase();
    return codes.some((c) => String(c || '').toLowerCase() === q);
  }, [allSiteCodes, siteCodeSearch]);

  // Load dropdown values
  const loadDropdownValues = useCallback(async () => {
    const values: Record<string, string[]> = { ...DEFAULT_FALLBACK_DROPDOWNS };
    for (const field of greenFields) {
      try {
        const vals = await fetchDropdownValues(field.csvColumn);
        if (vals && vals.length > 0) {
          const merged = [...new Set([...vals, ...(DEFAULT_FALLBACK_DROPDOWNS[field.csvColumn] || [])])].filter(Boolean);
          values[field.csvColumn] = merged;
        }
      } catch {
        // Keep fallback
      }
    }
    setDropdownValues(values);
  }, [greenFields]);

  // Initialize a Blank Form for "Add New Entry"
  const initNewEntry = useCallback((customCode = '') => {
    setActiveMode('add');
    setStep('fill-form');
    setErrors({});
    setSuccessMessage('');
    setDuplicateWarning(null);

    const blank: WeRecord = {
      'site code': customCode.trim().toUpperCase(),
      'Exc sector': userDefaultSector,
      'Sectores': userDefaultSector,
      'Sectore': 'المنطقة الأولى',
      'Exc Zone': 'تنفيذ شبكات ' + userDefaultSector,
      'Zone': 'المنطقة الأولى',
      'السنترال': 'سنترال رئيسي',
      'اداره التنفيذ المختصه': 'إدارة التنفيذ المختصة',
      'إدارة التنفيذ المختصة': 'إدارة التنفيذ المختصة',
      'Type': 'New',
      'المسئولية': 'المصرية للاتصالات',
      'Site Status': 'On Air',
      'التصنيف': 'جاري مدني',
      'اسباب التعذر': 'لا يوجد تعذر',
      'خطة': new Date().getFullYear().toString(),
      'التاريخ المتوقع للانتهاء': `${new Date().getFullYear()}-12-31`,
    };

    setMasterRecord(blank);
    setFormData(blank);
  }, [userDefaultSector]);

  // Handle Selecting an Existing Site Code to Edit
  const handleSelectSiteCode = useCallback(async (code: string) => {
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    setDuplicateWarning(null);

    const normCode = (code || '').trim();
    const inMemorySite = sitesData?.find((s) => String(s?.siteCode || '').toUpperCase() === normCode.toUpperCase());

    try {
      const record = await fetchSiteRecord(normCode);
      if (record) {
        // Strict Sector RBAC Restriction:
        if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
          if (!isRecordInSector(user.sector, record)) {
            setErrors({
              _general: `⛔ تم حظر الوصول: الموقع "${normCode}" يتبع قطاع (${record['Exc sector'] || record['Sectore'] || 'آخر'}). لا تملك صلاحية استعراضه أو تعديله طبقاً لنطاق صلاحية قطاعك (${user.sector}). كل مستخدم يرى ويعدل مواقع قطاعه فقط.`,
            });
            setLoading(false);
            return;
          }
        }

        setMasterRecord(record);
        setActiveMode('edit');

        const initial: WeRecord = {
          ...record,
          _id: record._id || (record as any).id || '',
        };
        sortedFields.forEach((f) => {
          if (initial[f.csvColumn] === undefined) {
            initial[f.csvColumn] = record[f.csvColumn] || '';
          }
        });

        // Pre-select recorded classification
        const recordedTasneef =
          record['التصنيف'] ||
          inMemorySite?.classification ||
          record['Site Status'] ||
          inMemorySite?.status ||
          'جاري مدني';
        initial['التصنيف'] = normalizeClassification(recordedTasneef);

        if (!initial['اسباب التعذر'] && inMemorySite?.obstacleReason) {
          initial['اسباب التعذر'] = inMemorySite.obstacleReason;
        }
        if (!initial['الملاحظات'] && inMemorySite?.notes) {
          initial['الملاحظات'] = inMemorySite.notes;
        }
        if (!initial['التاريخ المتوقع للانتهاء'] && inMemorySite?.expectedDate) {
          initial['التاريخ المتوقع للانتهاء'] = inMemorySite.expectedDate;
        }

        setFormData(initial);
        setStep('fill-form');
      } else if (inMemorySite) {
        // Fallback to inMemorySite if not in Supabase yet
        if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
          if (inMemorySite.sector && inMemorySite.sector !== user.sector && inMemorySite.sector !== 'ALL') {
            setErrors({
              _general: `⛔ تم حظر الوصول: الموقع "${normCode}" يتبع قطاع (${inMemorySite.sector}). لا تملك صلاحية استعراضه أو تعديله.`,
            });
            setLoading(false);
            return;
          }
        }

        const fallback: WeRecord = {
          'site code': inMemorySite.siteCode,
          'Exc sector': inMemorySite.sector || userDefaultSector,
          'Sectores': inMemorySite.sector || userDefaultSector,
          'Sectore': inMemorySite.sector || userDefaultSector,
          'السنترال': inMemorySite.central || '',
          'الادارة العامة لتنفيذ الشبكات': inMemorySite.generalAdmin || '',
          'اداره التنفيذ المختصه': inMemorySite.competentAdmin || '',
          'Zone': inMemorySite.competentAdmin || '',
          'Exc Zone': inMemorySite.generalAdmin || '',
          'المسئولية': inMemorySite.civilContractor || '',
          'Type': inMemorySite.classification || 'FTTS',
          'Site Status': inMemorySite.status === 'تم التسليم' ? 'ON AIR' : inMemorySite.status,
          'التصنيف': normalizeClassification(inMemorySite.classification || inMemorySite.status),
          'اسباب التعذر': inMemorySite.obstacleReason || 'لا يوجد تعذر',
          'نسبة الإنجاز %': String(inMemorySite.progressPercent || 0),
          'التاريخ المتوقع للانتهاء': inMemorySite.expectedDate || '',
          'الملاحظات': inMemorySite.notes || '',
          _id: inMemorySite.id || '',
        };
        setMasterRecord(fallback);
        setActiveMode('edit');
        setFormData(fallback);
        setStep('fill-form');
      } else {
        setErrors({ _general: `لم يتم العثور على بيانات سابقة للموقع: ${normCode}` });
      }
    } catch {
      setErrors({ _general: `حدث خطأ أثناء تحميل بيانات الموقع: ${normCode}` });
    } finally {
      setLoading(false);
    }
  }, [sortedFields, user, sitesData, userDefaultSector]);

  // Reset or Switch
  useEffect(() => {
    if (!isOpen) return;

    loadDropdownValues();

    if (initialRecord) {
      if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
        if (!isRecordInSector(user.sector, initialRecord)) {
          setErrors({
            _general: `⛔ تم حظر الوصول: الموقع "${initialRecord['site code'] || ''}" لا يتبع قطاعك (${user.sector}). التعديل محجوب. كل مستخدم يرى ويعدل مواقع قطاعه فقط.`,
          });
          setMasterRecord(null);
          setStep('select-site');
          return;
        }
      }

      setMasterRecord(initialRecord);
      setActiveMode('edit');

      const inMemorySite = sitesData?.find(
        (s) => String(s?.siteCode || '').toUpperCase() === String(initialRecord['site code'] || '').toUpperCase()
      );
      const recordedTasneef =
        initialRecord['التصنيف'] ||
        inMemorySite?.classification ||
        initialRecord['Site Status'] ||
        inMemorySite?.status ||
        'جاري مدني';

      const normRecord = {
        ...initialRecord,
        _id: initialRecord._id || (initialRecord as any).id || '',
        'التصنيف': normalizeClassification(recordedTasneef),
        'اسباب التعذر': initialRecord['اسباب التعذر'] || inMemorySite?.obstacleReason || '',
        'الملاحظات': initialRecord['الملاحظات'] || inMemorySite?.notes || '',
        'التاريخ المتوقع للانتهاء': initialRecord['التاريخ المتوقع للانتهاء'] || inMemorySite?.expectedDate || '',
      };
      setFormData(normRecord);
      setStep('fill-form');
      setErrors({});
      setSuccessMessage('');
      setDuplicateWarning(null);
    } else if (initialSiteCode) {
      handleSelectSiteCode(initialSiteCode);
    } else if (mode === 'add') {
      initNewEntry();
    } else {
      setActiveMode('edit');
      setStep('select-site');
      setSiteCodeSearch('');
      setMasterRecord(null);
      setFormData({});
      setErrors({});
      setSuccessMessage('');
      setDuplicateWarning(null);
    }
  }, [isOpen, initialSiteCode, initialRecord, mode, isAdmin, loadDropdownValues, handleSelectSiteCode, initNewEntry, user, sitesData]);

  // Handle Field Change
  const handleFieldChange = (csvColumn: string, value: string) => {
    if (isReadOnly) return;

    // Strict immutability check for Sector users in edit mode:
    // Notice: 'التصنيف' is NOT immutable here because the user selects it in Line 2 to drive conditional fields
    if (activeMode === 'edit' && !isAdmin && isFieldImmutableForSector(csvColumn)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [csvColumn]: csvColumn === 'site code' ? String(value || '').toUpperCase() : value,
    }));

    if (csvColumn === 'التصنيف' || csvColumn === 'Site Status') {
      if (!isDocumentRequired(value)) {
        setErrors((prev) => {
          if (!prev['المستند']) return prev;
          const next = { ...prev };
          delete next['المستند'];
          return next;
        });
      }
    }

    if (errors[csvColumn]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[csvColumn];
        return next;
      });
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const code = String(formData['site code'] || masterRecord?.['site code'] || '').trim();
    if (!code) {
      newErrors['site code'] = 'كود الموقع مطلوب (Site Code)';
    }

    if (activeMode === 'add') {
      if (!String(formData['التصنيف'] || '').trim()) {
        newErrors['التصنيف'] = 'التصنيف مطلوب';
      }
      const statusVal = String(formData['Site Status'] || '').trim();
      if (!statusVal) {
        newErrors['Site Status'] = 'حالة الموقع مطلوبة';
      }

      sortedFields.forEach((field) => {
        if (field.required && field.color !== 'blue' && field.csvColumn !== 'Site Status') {
          const val = String(formData[field.csvColumn] || '').trim();
          if (!val) {
            newErrors[field.csvColumn] = `${field.label} مطلوب`;
          }
        }
      });
    }

    purpleFields.forEach((field) => {
      const val = String(formData[field.csvColumn] || '').trim();
      if (val) {
        if (field.inputType === 'number' || field.inputType === 'currency' || field.inputType === 'coordinate') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            newErrors[field.csvColumn] = `${field.label}: يجب أن يكون رقماً`;
          } else if (field.validation) {
            if (field.validation.min !== undefined && num < field.validation.min) {
              newErrors[field.csvColumn] = field.validation.message || `القيمة أقل من الحد الأدنى`;
            }
            if (field.validation.max !== undefined && num > field.validation.max) {
              newErrors[field.csvColumn] = field.validation.message || `القيمة أكبر من الحد الأقصى`;
            }
          }
        }
      }
    });

    // Strict conditional document upload requirement:
    // Only required if classification is: "جاري تصاريح" or "تم الانتهاء" or "تم التشغيل فايبر"
    if (isDocRequired) {
      const doc = String(formData['المستند'] || masterRecord?.['المستند'] || '').trim();
      if (!doc) {
        newErrors['المستند'] = 'إرفاق مستند إثبات وتوثيق الموقف الحالي إلزامي لهذه الحالة (* مطلوب)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Save / Submit
  const handleSave = async (forceUpdate = false) => {
    if (isReadOnly) {
      setErrors({ _general: 'غير مصرح بالتعديل: هذا الموقع يتبع قطاعاً آخر ولديك صلاحية المشاهدة فقط.' });
      return;
    }

    if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
      if (activeMode === 'add') {
        setErrors({ _general: 'غير مصرح: حسابات مستخدمي القطاعات لا تمتلك صلاحية إضافة مواقع جديدة (مقفولة تماماً).' });
        return;
      }
      if (activeMode === 'edit' && masterRecord) {
        if (!isRecordInSector(user.sector, masterRecord)) {
          setErrors({ _general: `غير مصرح بالتعديل: هذا الموقع يتبع قطاعاً آخر. مسموح لك فقط بتعديل مواقع قطاع (${user.sector}).` });
          return;
        }
      }
    }

    if (!validateForm()) return;

    setSaving(true);
    setDuplicateWarning(null);
    setSuccessMessage('');

    try {
      const isEdit = activeMode === 'edit';
      const dataToSave = { ...formData };

      // Strictly preserve immutable baseline fields for Sector users:
      // Site Status in Line 1 is also locked for sector officer as requested
      if (isEdit && !isAdmin && masterRecord) {
        IMMUTABLE_FIELDS_FOR_SECTOR.forEach((col) => {
          if (masterRecord[col] !== undefined && masterRecord[col] !== '') {
            dataToSave[col] = masterRecord[col];
          }
        });
        // Ensure the chosen Classification from Line 2 is preserved
        if (formData['التصنيف']) {
          dataToSave['التصنيف'] = formData['التصنيف'];
        }
      }

      if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
        dataToSave['Exc sector'] = user.sector;
        dataToSave['Sectores'] = user.sector;
        dataToSave['Exc Sectores'] = user.sector;
      }

      const result = await saveRecord(dataToSave, forceUpdate, isEdit);

      if (result.success && result.record) {
        const saved = result.record;
        setSuccessMessage(result.message || 'تم حفظ وتحديث بيانات الموقع بنجاح ✅');

        if (onSave) {
          try { await onSave(saved); } catch { }
        }
        if (onSubmit) {
          try { await onSubmit(saved); } catch { }
        }
        if (onSaved) {
          try { onSaved(saved); } catch { }
        }

        setTimeout(() => {
          handleClose();
        }, 700);
      } else if (result.error === 'DUPLICATE_RECORD') {
        setDuplicateWarning({
          message: result.message || 'سجل مكرر بنفس الكود والتصنيف والتاريخ',
          existingRecord: result.existingRecord!,
        });
      } else {
        setErrors({ _general: result.error || 'حدث خطأ أثناء حفظ البيانات' });
      }
    } catch (err: any) {
      setErrors({ _general: err?.message || 'فشل الاتصال بقاعدة البيانات' });
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(false);
  };

  const resetForm = () => {
    setStep('select-site');
    setActiveMode('edit');
    setSiteCodeSearch('');
    setMasterRecord(null);
    setFormData({});
    setErrors({});
    setSuccessMessage('');
    setDuplicateWarning(null);
    setAdminFullEditMode(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right border border-slate-200"
        dir="rtl"
      >
        {/* ── Modal Header Banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-white shrink-0">
              {activeMode === 'add' ? (
                <PlusCircle className="w-6 h-6 text-emerald-300" />
              ) : isReadOnly ? (
                <Eye className="w-5 h-5 text-amber-300" />
              ) : (
                <Edit3 className="w-5 h-5 text-sky-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {activeMode === 'add'
                    ? 'إضافة موقع جديد إلى بيانات WE (حساب الإدارة)'
                    : step === 'select-site'
                      ? 'اختيار موقع WE لتحديثه'
                      : `تعديل بيانات الموقع: ${formData['site code'] || masterRecord?.['site code'] || ''}`}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeMode === 'add'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                  }`}>
                  {activeMode === 'add' ? 'إضافة موقع جديد ➕' : 'تعديل وتحديث ✏️'}
                </span>
                {isAdmin && (
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/40 font-bold">
                    حساب الإدارة (Admin) 👑
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {activeMode === 'add'
                  ? 'إضافة موقع جديد وحفظه في السحابة (متاح فقط للإدارة المركزية)'
                  : step === 'select-site'
                    ? 'ابحث بكود الموقع لتحميل بياناته وتحديثه وفقاً لصلاحيات قطاعك'
                    : isReadOnly
                      ? 'وضع المشاهدة فقط (الموقع يتبع قطاعاً آخر)'
                      : 'بيانات الموقع الأساسية في الأعلى • حالة الموقع والتصنيف • الحقول الشرطية تفتح تلقائياً'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-sky-200 border border-white/20">
                <span>نطاق:</span>
                <strong className="text-white">{user.role === 'admin' ? 'كافة القطاعات' : user.sector}</strong>
              </span>
            )}
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Top Dual-Option Switcher (الإدخال اليدوي vs الرفع الجماعي) ── */}
        <div className="bg-slate-200/90 border-b border-slate-300 px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-blue-700 border border-blue-600 shadow-sm cursor-default flex items-center gap-1.5 ring-2 ring-blue-500/20"
            >
              <span>✍️ الخيار الأول: الإدخال اليدوي الفردي (Manual Entry)</span>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded-full border border-blue-400/30">
                مفعل حالياً
              </span>
            </button>

            {onSwitchToBulk && (
              <button
                type="button"
                onClick={onSwitchToBulk}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs group"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                <span>📤 الخيار الثاني: الرفع الجماعي عبر إكسيل (Bulk Excel Import)</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
            حماية الثوابت مقفلة برمجياً 🔒
          </span>
        </div>

        {/* ── Mode Switcher & Navigation Bar ── */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveMode('edit');
                if (masterRecord && masterRecord['site code']) {
                  setStep('fill-form');
                } else {
                  setStep('select-site');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeMode === 'edit'
                ? 'bg-white text-blue-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/70'
                }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>تعديل موقع موجود</span>
            </button>

            {/* Add New Site Button (Strictly locked to Admin) */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => initNewEntry()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeMode === 'add'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>➕ إضافة موقع جديد (Admin)</span>
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-md">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>إضافة المواقع مقفولة لقطاعات التنفيذ (متاحة لحساب الإدارة فقط)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && step === 'fill-form' && activeMode === 'edit' && (
              <button
                type="button"
                onClick={() => setAdminFullEditMode((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${adminFullEditMode
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                title="التبديل بين التنسيق المنظم للحقول الشرطية وتعديل كافة الحقول الشامل"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>{adminFullEditMode ? 'تعديل شامل (مفعّل)' : 'فتح تعديل شامل (Admin)'}</span>
              </button>
            )}

            {step === 'fill-form' && activeMode === 'edit' && (
              <button
                type="button"
                onClick={() => setStep('select-site')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
              >
                <span>← العودة لاختيار موقع آخر</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Sector Permission Banner ── */}
        {step === 'fill-form' && permissionInfo && (
          <div className={`px-6 py-2 border-b flex items-center justify-between gap-3 ${permissionInfo.canEdit
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/90 border-amber-200 text-amber-900'
            }`}>
            <div className="flex items-center gap-2 text-xs font-medium">
              {permissionInfo.canEdit ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{permissionInfo.reason}</span>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${permissionInfo.canEdit
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-amber-200 text-amber-900'
                }`}>
                {permissionInfo.canEdit ? 'قابل للتعديل' : 'مشاهدة فقط'}
              </span>
            </div>
          </div>
        )}

        {/* ── Success Message ── */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center gap-2 text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-sm">{successMessage}</span>
          </div>
        )}

        {/* ── Error Message ── */}
        {errors._general && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2 text-red-800 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium text-xs sm:text-sm">{errors._general}</span>
          </div>
        )}

        {/* ── Duplicate Warning Banner ── */}
        {duplicateWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="flex items-center gap-2 text-amber-800 mb-1.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-bold text-xs sm:text-sm">{duplicateWarning.message}</span>
            </div>
            <p className="text-xs text-amber-700 mb-2">
              هذا الموقع مسجل بالفعل بنفس الحالة والتاريخ. هل ترغب في الكتابة فوقه وتحديثه بالقيم الجديدة؟
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isReadOnly || saving}
                className="px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? 'جارِ التحديث...' : 'تأكيد تحديث السجل الموجود'}
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* ── Modal Main Body ── */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* ── Step 1: Search & Select Existing Site ── */}
          {step === 'select-site' && activeMode === 'edit' && (
            <div className="max-w-2xl mx-auto py-2">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                🔍 ابحث عن كود الموقع المراد تعديله (Site Code):
              </label>

              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  className="w-full pr-11 pl-4 py-3 bg-white border-2 border-blue-300 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition font-mono uppercase"
                  placeholder="مثال: LALXN33439 أو 33439..."
                  value={siteCodeSearch}
                  onChange={(e) => setSiteCodeSearch(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>

              {!hasExactMatch && siteCodeSearch.trim().length >= 3 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-blue-900">
                    <span>الكود </span>
                    <strong className="font-mono text-blue-700">{siteCodeSearch.trim()}</strong>
                    <span> غير مسجل في قاعدة البيانات الحالية.</span>
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => initNewEntry(siteCodeSearch.trim())}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>إضافة هذا الموقع الجديد الآن ←</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium bg-slate-200/80 px-2.5 py-1 rounded-md">
                      (إضافة المواقع مقتصرة على حساب الإدارة Admin)
                    </span>
                  )}
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-slate-600 text-sm">جارِ تحميل بيانات الموقع من السحابة...</span>
                </div>
              )}

              {!loading && (
                <div className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-100 shadow-inner">
                  {filteredCodes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p className="font-medium text-sm">لا توجد نتائج مطابقة لبحثك في نطاق قطاعك</p>
                    </div>
                  ) : (
                    filteredCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectSiteCode(code)}
                        className="w-full text-right px-4 py-2.5 hover:bg-blue-50 transition flex items-center justify-between group cursor-pointer"
                      >
                        <span className="font-mono text-blue-700 font-bold text-base">{code}</span>
                        <span className="text-slate-400 group-hover:text-blue-600 text-xs font-medium flex items-center gap-1">
                          <span>اختيار وتعديل</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <p className="text-xs text-slate-400 mt-2.5">
                كل مستخدم يرى ويعدل مواقع قطاعه فقط. استخدم شريط البحث للوصول لأي كود موقع بدقة.
              </p>
            </div>
          )}

          {/* ── Step 2: Full Form (Edit mode & Add mode) ── */}
          {step === 'fill-form' && (
            <form id="we-data-form" onSubmit={handleFormSubmit} className="space-y-5">

              {isReadOnly && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="block font-bold mb-0.5 text-sm">⚠️ وضع المشاهدة فقط (خارج نطاق قطاعك)</strong>
                    <span>
                      هذا الموقع تابع لقطاع آخر. مسموح لك فقط بتعديل مواقع قطاع (<strong>{user?.sector}</strong>). التعديل والحفظ محجوبان لحماية سرية وتكامل البيانات.
                    </span>
                  </div>
                </div>
              )}

              {activeMode === 'edit' ? (
                <>
                  {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
                  {/* قسم بيانات الموقع الأساسية (في الأعلى)                                             */}
                  {/* يتم وضع جميع "بيانات الموقع الأساسية" الثابتة (غير القابلة للتعديل لمسؤول القطاع)  */}
                  {/* في قمة الصفحة فور فتح نافذة تعديل بيانات الموقع لتكون واضحة في المقدمة            */}
                  {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
                  <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-700 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                            <span>بيانات الموقع الأساسية</span>
                            <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">(Base Site Information)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {isAdmin
                              ? 'صلاحية الأدمن الكاملة مفعّلة: يمكنك تعديل كافة الحقول المرجعية والتنفيذية بحرية'
                              : 'البيانات المرجعية الثابتة للموقع المعتمَدة في خطة FTTS'}
                          </p>
                        </div>
                      </div>
                      {isAdmin ? (
                        <span className="text-[11px] text-purple-700 font-bold bg-purple-100 px-3 py-1 rounded-full border border-purple-300 shadow-2xs flex items-center gap-1.5 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>تعديل كامل متاح (Full Admin)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-300 shadow-2xs flex items-center gap-1.5 shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>ثابتة لمسؤول القطاع (Read-only)</span>
                        </span>
                      )}
                    </div>

                    {isAdmin && adminFullEditMode ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">كود الموقع (Site Code)</label>
                          <input
                            type="text"
                            value={formData['site code'] || masterRecord?.['site code'] || ''}
                            onChange={(e) => handleFieldChange('site code', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">قطاع التنفيذ</label>
                          <input
                            type="text"
                            value={formData['Exc sector'] || formData['Sectores'] || masterRecord?.['Exc sector'] || ''}
                            onChange={(e) => handleFieldChange('Exc sector', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">قطاع المناطق</label>
                          <input
                            type="text"
                            value={formData['Zone'] || formData['قطاع المناطق'] || masterRecord?.['Zone'] || ''}
                            onChange={(e) => handleFieldChange('Zone', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">إدارة الشبكات</label>
                          <input
                            type="text"
                            value={formData['Exc Zone'] || formData['اداره التنفيذ المختصه'] || masterRecord?.['Exc Zone'] || ''}
                            onChange={(e) => handleFieldChange('Exc Zone', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">مسؤولية التنفيذ</label>
                          <input
                            type="text"
                            value={formData['المسئولية'] || formData['مسئولية التنفيذ'] || masterRecord?.['المسئولية'] || ''}
                            onChange={(e) => handleFieldChange('المسئولية', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">النوع (Type)</label>
                          <input
                            type="text"
                            value={formData['Type'] || formData['النوع'] || masterRecord?.['Type'] || ''}
                            onChange={(e) => handleFieldChange('Type', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">الخطة (Plan)</label>
                          <input
                            type="text"
                            value={formData['خطة'] || formData['Plan'] || masterRecord?.['خطة'] || ''}
                            onChange={(e) => handleFieldChange('خطة', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-purple-900 block font-bold mb-1">السنترال</label>
                          <input
                            type="text"
                            value={formData['السنترال'] || masterRecord?.['السنترال'] || ''}
                            onChange={(e) => handleFieldChange('السنترال', e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                        {[
                          { label: 'كود الموقع', val: formData['site code'] || masterRecord?.['site code'] || '—', isCode: true },
                          { label: 'قطاع التنفيذ', val: formData['Exc sector'] || formData['Sectores'] || masterRecord?.['Exc sector'] || '—' },
                          { label: 'قطاع المناطق', val: formData['Zone'] || formData['قطاع المناطق'] || masterRecord?.['Zone'] || '—' },
                          { label: 'إدارة الشبكات', val: formData['Exc Zone'] || formData['اداره التنفيذ المختصه'] || masterRecord?.['Exc Zone'] || '—' },
                          { label: 'مسؤولية التنفيذ', val: formData['المسئولية'] || formData['مسئولية التنفيذ'] || masterRecord?.['المسئولية'] || '—' },
                          { label: 'النوع', val: formData['Type'] || formData['النوع'] || masterRecord?.['Type'] || '—' },
                          { label: 'الخطة', val: formData['خطة'] || formData['Plan'] || masterRecord?.['خطة'] || '—' },
                          { label: 'السنترال', val: formData['السنترال'] || masterRecord?.['السنترال'] || '—' },
                        ].map((item, i) => (
                          <div key={i} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs hover:border-blue-200 transition">
                            <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">{item.label}</span>
                            <span className={`font-bold text-slate-900 text-xs sm:text-sm truncate block ${item.isCode ? 'font-mono text-blue-700' : ''}`} title={item.val}>
                              {item.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
                  {/* قسم التعديل والحالة (في الأسفل)                                                     */}
                  {/* إزالة أي مصطلحات مثل (السطر الأول أو السطر الثاني)، وجعل العناوين مباشرة ونظيفة:   */}
                  {/* - حالة الموقع (Site Status) مع مؤشر الإشارة (Pulse Indicator إذا كان الموقع On Air) */}
                  {/* - التصنيف (Classification) مباشرة أسفل حالة الموقع                                 */}
                  {/* - الحقول الشرطية والتفصيلية المتفرعة من التصنيف بحسب الحالات المحددة                */}
                  {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
                  <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* حالة الموقع (Site Status)                                    */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-sky-600" />
                          <span>حالة الموقع (Site Status)</span>
                        </label>
                        {isAdmin ? (
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-300">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            <span>متاح للتعديل الكامل (Admin)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-300">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>ثابتة لمسؤول القطاع (Read-only)</span>
                          </span>
                        )}
                      </div>

                      {/* Display of Site Status + Pulse Indicator if On Air */}
                      {isAdmin && adminFullEditMode ? (
                        <div className="mt-1">
                          <select
                            name="Site Status"
                            value={currentStatus}
                            onChange={(e) => handleFieldChange('Site Status', e.target.value)}
                            className="w-full bg-white border-2 border-purple-300 rounded-xl px-4 py-2.5 text-sm sm:text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
                          >
                            {(dropdownValues['Site Status'] || DEFAULT_FALLBACK_DROPDOWNS['Site Status'] || []).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-white border-2 border-slate-200 rounded-xl px-4 py-3 shadow-2xs flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            {/* Pulse Indicator: إذا كان الموقع On Air، يتم وضع مؤشر الإشارة النابض تماماً كالصفحة الرئيسية */}
                            {isOnAir ? (
                              <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3 items-center justify-center">
                                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute inline-flex opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-800 tracking-wide">
                                  {currentStatus || 'On Air'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                                <span className="text-base sm:text-lg font-mono font-extrabold text-slate-900 tracking-wide">
                                  {currentStatus || 'CGA'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isOnAir && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                <span>مؤشر الإشارة: متصل بالشبكة (On Air)</span>
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              قراءة فقط 🔒
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* التصنيف (Classification) - يظهر مباشرة أسفل حالة الموقع      */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-indigo-600" />
                          <span>التصنيف (Classification)</span>
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          ⚡ تتفرع منه الحقول الشرطية أدناه
                        </span>
                      </div>

                      {/* Interactive Selection of Classification */}
                      <select
                        name="التصنيف"
                        id="field-classification-select"
                        disabled={isReadOnly}
                        value={currentClassification || ''}
                        onChange={(e) => handleFieldChange('التصنيف', e.target.value)}
                        className="w-full bg-white border-2 border-indigo-300 rounded-xl px-4 py-2.5 text-sm sm:text-base font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-xs cursor-pointer transition"
                      >
                        <option value="">-- اختر التصنيف المعتمد للموقع --</option>
                        {APPROVED_CLASSIFICATIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>

                      <p className="text-[11px] text-indigo-700 mt-1.5 font-medium">
                        💡 تفتح الحقول الشرطية والتفصيلية المخصصة مباشرة أدناه بحسب التصنيف المختار أعلاه.
                      </p>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* ربط الحقول الشرطية بالتصنيف: تفتح الحقول التابعة له مباشرة   */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="pt-1">

                      {/* ── CASE 1: التصنيف "تم الانتهاء" أو "تم التشغيل" أو "تم التشغيل فايبر" ── */}
                      {currentCategory === 'completed_or_operational' && (
                        <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-emerald-200 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <h4 className="font-bold text-emerald-950 text-sm sm:text-base">
                                الحقول التابعة لتصنيف ({currentClassification}):
                              </h4>
                            </div>
                            <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                              التاريخ الفعلي + الملاحظات (باقي الحقول مغلقة)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* خانة التاريخ الفعلي */}
                            <div className="flex flex-col">
                              <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>📅 خانة التاريخ الفعلي</span>
                                  <span className="text-slate-400 text-[11px] font-normal">(Actual Date)</span>
                                </span>
                                <span className="text-emerald-700 text-[10px] font-bold bg-emerald-100 px-2 py-0.2 rounded-full">
                                  مفتوح للتعديل
                                </span>
                              </label>
                              <input
                                type="date"
                                name="التاريخ الفعلى للانتهاء"
                                id="field-actual-date"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['التاريخ الفعلى للانتهاء'] || formData['التاريخ المتوقع للانتهاء'] || ''}
                                onChange={(e) => handleFieldChange('التاريخ الفعلى للانتهاء', e.target.value)}
                                className="border-2 border-emerald-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono shadow-xs font-bold"
                              />
                            </div>

                            {/* خانة الملاحظات */}
                            <div className="md:col-span-2 flex flex-col">
                              <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>📝 خانة الملاحظات</span>
                                  <span className="text-slate-400 text-[11px] font-normal">(Notes)</span>
                                </span>
                                <span className="text-emerald-700 text-[10px] font-bold bg-emerald-100 px-2 py-0.2 rounded-full">
                                  مفتوح للتعديل
                                </span>
                              </label>
                              <textarea
                                rows={3}
                                name="الملاحظات"
                                id="field-notes"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['الملاحظات'] || ''}
                                onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                                placeholder="أدخل أي ملاحظات حول تسليم وتشغيل الموقع..."
                                className="border-2 border-emerald-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-xs"
                              />
                            </div>
                          </div>

                          <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2.5 rounded-lg flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>باقي الحقول مغلقة وغير قابلة للتعديل لمسؤول القطاع لضمان سلامة بيانات السجل.</span>
                          </div>
                        </div>
                      )}

                      {/* ── CASE 2: التصنيف ("جاري المعاينة"، "جاري تصاريح"، "جاري العمل"، إلخ) ── */}
                      {currentCategory === 'in_progress' && (
                        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                              <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                                الحقول التابعة لتصنيف ({currentClassification}):
                              </h4>
                            </div>
                            <span className="text-[11px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                              التاريخ المتوقع + الملاحظات (باقي الحقول مغلقة)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* خانة التاريخ المتوقع */}
                            <div className="flex flex-col md:col-span-1">
                              <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>📅 خانة التاريخ المتوقع للانتهاء</span>
                                  <span className="text-slate-400 text-[11px] font-normal">(Expected Date)</span>
                                </span>
                                <span className="text-amber-700 text-[10px] font-bold bg-amber-100 px-2 py-0.2 rounded-full">
                                  مفتوح للتعديل
                                </span>
                              </label>
                              <input
                                type="date"
                                name="التاريخ المتوقع للانتهاء"
                                id="field-expected-date"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['التاريخ المتوقع للانتهاء'] || ''}
                                onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                                className="border-2 border-amber-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono shadow-xs font-bold"
                              />
                            </div>

                            <div className="flex flex-col md:col-span-1 justify-center bg-white border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                              <span className="font-bold">المتابعة الميدانية:</span>
                              <span className="text-[11px] text-slate-600 mt-1">
                                تم قفل باقي البيانات تلقائياً لحماية المسار والتنفيذ. يرجى إدخال التاريخ المستهدف وتفصيل الموقف بالملاحظات.
                              </span>
                            </div>

                            {/* خانة الملاحظات */}
                            <div className="flex flex-col md:col-span-2">
                              <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>📝 خانة الملاحظات وموقف الأعمال</span>
                                  <span className="text-slate-400 text-[11px] font-normal">(Notes)</span>
                                </span>
                                <span className="text-amber-700 text-[10px] font-bold bg-amber-100 px-2 py-0.2 rounded-full">
                                  مفتوح للتعديل
                                </span>
                              </label>
                              <textarea
                                rows={3}
                                name="الملاحظات"
                                id="field-notes"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['الملاحظات'] || ''}
                                onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                                placeholder="أدخل أي ملاحظات حول المعاينة، التصاريح، التنسيق، وموقف الأعمال الميدانية..."
                                className="border-2 border-amber-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
                              />
                            </div>
                          </div>

                          <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-lg flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>باقي الحقول مغلقة وغير قابلة للتعديل لمسؤول القطاع طبقاً للصلاحيات.</span>
                          </div>
                        </div>
                      )}

                      {/* ── CASE 3: التصنيف "متعذر" (موسع وتفصيلي بالكامل) ── */}
                      {currentCategory === 'stalled' && (
                        <div className="bg-rose-50/80 border-2 border-rose-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-rose-200 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              <h4 className="font-bold text-rose-950 text-sm sm:text-base">
                                تفاصيل وموقف التعذر الميداني ({currentClassification}):
                              </h4>
                            </div>
                            <span className="text-[11px] bg-rose-200 text-rose-900 px-2.5 py-1 rounded-full font-bold">
                              ⚠️ حقول تفاصيل التعذر مفعلة ومفتوحة للتعديل الميداني خطوة بخطوة
                            </span>
                          </div>

                          {/* Row 1: سبب التعذر الرئيسي + الجهة المطلوب الدعم منها */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Stalled Reason Dropdown */}
                            <div className="bg-white border border-rose-200 p-3.5 rounded-xl shadow-2xs">
                              <label className="text-xs font-bold text-rose-950 mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <span>قائمة أسباب التعذر (Stall Reason):</span>
                                  <span className="text-red-500 font-bold">* مطلوب</span>
                                </span>
                                <span className="text-xs text-rose-700 font-semibold">محدد طبيعة التعذر</span>
                              </label>
                              <select
                                name="اسباب التعذر"
                                id="field-stalled-reason"
                                disabled={isReadOnly}
                                value={formData['اسباب التعذر'] || ''}
                                onChange={(e) => handleFieldChange('اسباب التعذر', e.target.value)}
                                className="border-2 border-rose-300 bg-white text-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-bold shadow-xs w-full cursor-pointer"
                              >
                                <option value="">-- اختر سبب التعذر --</option>
                                <option value="ارتفاع التكلفة">ارتفاع التكلفة</option>
                                <option value="التصاريح">التصاريح</option>
                                <option value="عدم إمكانية">عدم إمكانية</option>
                                <option value="تصاريح مرور">تصاريح مرور</option>
                                <option value="تصاريح سكة حديد">تصاريح سكة حديد</option>
                                <option value="اعتراض مالك">اعتراض مالك</option>
                                <option value="اعتراض أهالي">اعتراض أهالي</option>
                                <option value="التنسيق مع جهات حكومية">التنسيق مع جهات حكومية</option>
                                <option value="بعد المسافة">بعد المسافة</option>
                                <option value="تعديل مسار">تعديل مسار</option>
                                <option value="أخرى">أخرى</option>
                              </select>
                            </div>

                            {/* الجهة المطلوب الدعم منها */}
                            <div className="bg-white border border-rose-200 p-3.5 rounded-xl shadow-2xs">
                              <label className="text-xs font-bold text-rose-950 mb-1.5 flex items-center justify-between">
                                <span>الجهة المطلوب الدعم منها (Support Entity):</span>
                                <span className="text-[11px] text-rose-700 font-medium">اختياري</span>
                              </label>
                              <select
                                name="الجهة المطلوب الدعم منها"
                                id="field-stalled-support-entity"
                                disabled={isReadOnly}
                                value={formData['الجهة المطلوب الدعم منها'] || ''}
                                onChange={(e) => handleFieldChange('الجهة المطلوب الدعم منها', e.target.value)}
                                className="border border-rose-300 bg-white text-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium shadow-xs w-full cursor-pointer"
                              >
                                <option value="">-- اختر الجهة المطلوب الدعم منها --</option>
                                <option value="الجهاز القومي لتنظيم الاتصالات NTRA">الجهاز القومي لتنظيم الاتصالات NTRA</option>
                                <option value="وزارة النقل / الطرق والكباري">وزارة النقل / الطرق والكباري</option>
                                <option value="حي / مجلس مدينة">حي / مجلس مدينة</option>
                                <option value="إدارة المرور">إدارة المرور</option>
                                <option value="الشركة المصرية لنقل الكهرباء">الشركة المصرية لنقل الكهرباء</option>
                                <option value="الهيئة العامة للطرق والكباري">الهيئة العامة للطرق والكباري</option>
                                <option value="السكك الحديدية">السكك الحديدية</option>
                                <option value="وزارة الري والموارد المائية">وزارة الري والموارد المائية</option>
                                <option value="الآثار">الآثار</option>
                                <option value="جهات أمنية">جهات أمنية</option>
                                <option value="أخرى">أخرى</option>
                              </select>
                            </div>
                          </div>

                          {/* Row 2: التكاليف والمسافات والتواريخ */}
                          <div className="bg-white border-2 border-rose-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 shadow-2xs">
                            <div className="md:col-span-4 text-xs font-bold text-rose-800 border-b border-rose-100 pb-1.5 flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-rose-600" />
                              <span>بيانات التكاليف والمسافات والتواريخ المتوقعة للحل:</span>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-xs font-bold text-slate-700 mb-1">
                                التكلفة المتوقعة بدون مسار (ج.م)
                              </label>
                              <input
                                type="number"
                                step="any"
                                name="تكلفة التوصيل بدون مسار تراسلى بالجنيه"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['تكلفة التوصيل بدون مسار تراسلى بالجنيه'] || ''}
                                onChange={(e) => handleFieldChange('تكلفة التوصيل بدون مسار تراسلى بالجنيه', e.target.value)}
                                placeholder="مثال: 180000"
                                className="border border-rose-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 bg-white font-mono font-bold"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-xs font-bold text-slate-700 mb-1">
                                التكلفة المتوقعة بمسار تراسلي (ج.م)
                              </label>
                              <input
                                type="number"
                                step="any"
                                name="تكلفة التوصيل على المسار التراسلى بالجنيه"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['تكلفة التوصيل على المسار التراسلى بالجنيه'] || ''}
                                onChange={(e) => handleFieldChange('تكلفة التوصيل على المسار التراسلى بالجنيه', e.target.value)}
                                placeholder="مثال: 95000"
                                className="border border-rose-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 bg-white font-mono font-bold"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-xs font-bold text-slate-700 mb-1">
                                المسافة (كم)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                name="المسافة كم"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['المسافة كم'] || ''}
                                onChange={(e) => handleFieldChange('المسافة كم', e.target.value)}
                                placeholder="مثال: 4.5"
                                className="border border-rose-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 bg-white font-mono font-bold"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-xs font-bold text-slate-700 mb-1">
                                التاريخ المتوقع للحل والانتهاء
                              </label>
                              <input
                                type="date"
                                name="التاريخ المتوقع للانتهاء"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['التاريخ المتوقع للانتهاء'] || ''}
                                onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                                className="border border-rose-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 bg-white font-mono font-bold"
                              />
                            </div>
                          </div>

                          {/* Row 3: الملاحظات وتفاصيل أسباب التعذر */}
                          <div className="bg-white border-2 border-rose-200 rounded-xl p-4 flex flex-col gap-2 shadow-2xs">
                            <label className="text-xs font-bold text-rose-950 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-rose-600" />
                                <span>الملاحظات وتفاصيل أسباب التعذر الميداني:</span>
                              </span>
                              <span className="text-[11px] text-rose-700 font-semibold">مطلوب توضيح الأسباب بالتفصيل</span>
                            </label>
                            <textarea
                              rows={3}
                              name="الملاحظات"
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="يرجى كتابة وتفصيل أسباب التعذر الميداني أو العقبات الفنية أو معارضات الأهالي والجهات المعنية بدقة هنا..."
                              className="border-2 border-rose-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 bg-rose-50/20 font-medium shadow-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* ── CASE 4: التصنيف "معوقات" ── */}
                      {currentCategory === 'obstacles' && (
                        <div className="bg-orange-50/70 border-2 border-orange-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-orange-200 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0" />
                              <h4 className="font-bold text-orange-950 text-sm sm:text-base">
                                تفاصيل المعوقات التابعة لتصنيف ({currentClassification}):
                              </h4>
                            </div>
                            <span className="text-[11px] bg-orange-200 text-orange-900 px-2.5 py-0.5 rounded-full font-bold">
                              حدد سبب المعوقات لإظهار الحقول المطلوبة
                            </span>
                          </div>

                          {/* Obstacle Reason Dropdown */}
                          <div className="bg-white border border-orange-200 p-3.5 rounded-xl shadow-2xs">
                            <label className="text-xs font-bold text-orange-950 mb-1.5 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>قائمة أسباب المعوقات:</span>
                                <span className="text-red-500 font-bold">* مطلوب</span>
                              </span>
                              <span className="text-xs text-orange-700 font-semibold">محدد ظهور الحقول</span>
                            </label>
                            <select
                              name="اسباب التعذر"
                              id="field-obstacle-reason"
                              disabled={isReadOnly}
                              value={formData['اسباب التعذر'] || ''}
                              onChange={(e) => handleFieldChange('اسباب التعذر', e.target.value)}
                              className="border-2 border-orange-300 bg-white text-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold shadow-xs w-full cursor-pointer"
                            >
                              <option value="">-- اختر سبب المعوقات --</option>
                              <option value="اعتراض مالك">اعتراض مالك</option>
                              <option value="اعتراض أهالي">اعتراض أهالي</option>
                              <option value="التنسيق مع جهات أخرى">التنسيق مع جهات أخرى</option>
                              <option value="التنسيق مع جهات حكومية">التنسيق مع جهات حكومية</option>
                              <option value="بعد المسافة">بعد المسافة</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          </div>

                          {/* 4.1: إذا كان السبب (اعتراض مالك، اعتراض أهالي، التنسيق مع جهات أخرى، أو التنسيق مع جهات حكومية) */}
                          {currentObstaclesReason === 'governmental_owner_objection' && (
                            <div className="bg-white border-2 border-orange-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in shadow-2xs">
                              <div className="md:col-span-2 text-xs font-bold text-orange-800 border-b border-orange-100 pb-1.5 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-orange-600" />
                                <span>الحقول المخصصة لـ (الاعتراضات والتنسيق مع الجهات):</span>
                              </div>

                              <div className="flex flex-col md:col-span-2">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  الجهة المطلوب الدعم منها
                                </label>
                                <select
                                  name="الجهة المطلوب الدعم منها"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['الجهة المطلوب الدعم منها'] || ''}
                                  onChange={(e) => handleFieldChange('الجهة المطلوب الدعم منها', e.target.value)}
                                  className="border border-orange-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 bg-white cursor-pointer font-medium"
                                >
                                  <option value="">-- اختر الجهة المطلوب الدعم منها --</option>
                                  {(dropdownValues['الجهة المطلوب الدعم منها'] || DEFAULT_FALLBACK_DROPDOWNS['الجهة المطلوب الدعم منها'] || []).map((auth) => (
                                    <option key={auth} value={auth}>
                                      {auth}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2 flex flex-col">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  الملاحظات
                                </label>
                                <textarea
                                  rows={3}
                                  name="الملاحظات"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['الملاحظات'] || ''}
                                  onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                                  placeholder="تفاصيل الاعتراض أو التنسيق المطلوب والملاحظات..."
                                  className="border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 bg-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* 4.2: إذا كان السبب "بعد المسافة" */}
                          {currentObstaclesReason === 'far_distance' && (
                            <div className="bg-white border-2 border-orange-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in shadow-2xs">
                              <div className="md:col-span-3 text-xs font-bold text-orange-800 border-b border-orange-100 pb-1.5 flex items-center gap-1.5">
                                <Navigation className="w-4 h-4 text-orange-600" />
                                <span>الحقول المخصصة لسبب (بعد المسافة والتكاليف):</span>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  المسافة (كم)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  name="المسافة كم"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['المسافة كم'] || ''}
                                  onChange={(e) => handleFieldChange('المسافة كم', e.target.value)}
                                  placeholder="مثال: 5.8"
                                  className="border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 bg-white font-mono font-bold"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  تكلفة التوصيل بدون وسط تراسلي (ج.م)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  name="تكلفة التوصيل بدون مسار تراسلى بالجنيه"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['تكلفة التوصيل بدون مسار تراسلى بالجنيه'] || ''}
                                  onChange={(e) => handleFieldChange('تكلفة التوصيل بدون مسار تراسلى بالجنيه', e.target.value)}
                                  placeholder="مثال: 210000"
                                  className="border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 bg-white font-mono font-bold"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  تكلفة التوصيل على مسار تراسلي (ج.م)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  name="تكلفة التوصيل على المسار التراسلى بالجنيه"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['تكلفة التوصيل على المسار التراسلى بالجنيه'] || ''}
                                  onChange={(e) => handleFieldChange('تكلفة التوصيل على المسار التراسلى بالجنيه', e.target.value)}
                                  placeholder="مثال: 110000"
                                  className="border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 bg-white font-mono font-bold"
                                />
                              </div>

                              <div className="md:col-span-3 flex flex-col mt-1">
                                <label className="text-xs font-bold text-slate-700 mb-1">
                                  الملاحظات
                                </label>
                                <textarea
                                  rows={2}
                                  name="الملاحظات"
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  value={formData['الملاحظات'] || ''}
                                  onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                                  placeholder="ملاحظات وتفاصيل التوصيل والمسافات..."
                                  className="border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 bg-white"
                                />
                              </div>
                            </div>
                          )}

                          {currentObstaclesReason === 'other' && formData['اسباب التعذر'] && (
                            <div className="bg-white border border-orange-200 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
                              <label className="text-xs font-bold text-slate-700">
                                الملاحظات
                              </label>
                              <textarea
                                rows={3}
                                name="الملاحظات"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                value={formData['الملاحظات'] || ''}
                                onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                                placeholder="ملاحظات وتفاصيل المعوقات..."
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* General fallback if classification is empty/unspecified */}
                      {currentCategory === 'general' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                          <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-800 mb-1.5">
                              التاريخ المتوقع للانتهاء
                            </label>
                            <input
                              type="date"
                              name="التاريخ المتوقع للانتهاء"
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              value={formData['التاريخ المتوقع للانتهاء'] || ''}
                              onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                              className="border border-slate-300 bg-white text-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono"
                            />
                          </div>
                          <div className="flex flex-col md:col-span-2">
                            <label className="text-xs font-bold text-slate-800 mb-1.5">
                              الملاحظات
                            </label>
                            <textarea
                              rows={3}
                              name="الملاحظات"
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="الملاحظات..."
                              className="border border-slate-300 bg-white text-slate-800 rounded-xl px-3.5 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────────────────── */}
                  {/* حقل إرفاق مستند إثبات الموقف الحالي (شرطي للحالات المحددة)    */}
                  {/* ──────────────────────────────────────────────────────────── */}
                  {isDocRequired && (
                    <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${errors['المستند']
                      ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200'
                      : formData['المستند']
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-300'
                      }`}>
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-indigo-600" />
                          <span>إرفاق مستند إثبات وتوثيق الموقف الحالي (Document Upload)</span>
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                            * إلزامي مطلوب
                          </span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">
                          يدعم: PDF, الصور (PNG/JPG), مستندات Word/Excel
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        يجب إرفاق ملف أو محضر أو خطاب رسمي يوثق الموقف الحالي للموقع (مثل: محضر استلام فايبر، تصريح الحفر، خطاب التعذر، أو تقرير المعاينة الميدانية).
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isReadOnly}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>{formData['المستند'] ? 'تغيير المستند المرفق' : 'رفع مستند الإثبات (Upload File)'}</span>
                        </button>

                        <div className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between border ${formData['المستند']
                          ? 'bg-white border-emerald-300 text-emerald-900 font-mono font-bold'
                          : 'bg-white border-slate-300 text-slate-400 italic'
                          }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {formData['المستند'] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {formData['المستند'] || 'لم يتم إرفاق مستند حتى الآن (يرجى الضغط على زر رفع مستند الإثبات)'}
                            </span>
                          </div>
                          {formData['المستند'] && (
                            <button
                              type="button"
                              onClick={handleRemoveDocument}
                              className="text-rose-600 hover:text-rose-800 font-bold mr-2 text-xs cursor-pointer px-2 py-0.5 rounded hover:bg-rose-50"
                              title="إزالة المستند"
                            >
                              ✕ حذف
                            </button>
                          )}
                        </div>
                      </div>

                      {errors['المستند'] && (
                        <div className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1.5 animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{errors['المستند']}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ── activeMode === 'add' (Admin Only): Full Form Sections ── */
                <>
                  {/* ── 1. BLUE FIELDS: Master Data ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></div>
                        <h3 className="font-bold text-blue-900 text-base flex items-center gap-2">
                          1. البيانات الأساسية وتحديد الموقع (مطلوبة للإدارة)
                        </h3>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        صلاحية الإدارة Admin 👑
                      </span>
                    </div>

                    <div className="rounded-xl p-4 bg-blue-50/60 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">كود الموقع (Site Code)</span>
                            <span className="text-red-500 font-bold">* مطلوب</span>
                          </label>
                          <input
                            type="text"
                            name="site code"
                            id="field-site-code"
                            required
                            value={formData['site code'] || ''}
                            onChange={(e) => handleFieldChange('site code', e.target.value)}
                            placeholder="مثال: LALXN33439"
                            className={`border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none transition ${errors['site code']
                              ? 'border-red-400 bg-red-50 text-red-900 ring-2 ring-red-200'
                              : 'border-blue-300 bg-white text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                              }`}
                          />
                          {errors['site code'] && (
                            <span className="text-red-600 text-[11px] mt-1 font-semibold">{errors['site code']}</span>
                          )}
                        </div>

                        {blueFields
                          .filter((f) => f.csvColumn !== 'site code')
                          .map((field) => {
                            const isSectorField =
                              field.csvColumn === 'Exc sector' ||
                              field.csvColumn === 'Sectores' ||
                              field.csvColumn === 'Exc Sectores';
                            const fieldValue = formData[field.csvColumn] || '';

                            return (
                              <div key={field.csvColumn} className="flex flex-col">
                                <label className="text-xs font-medium text-slate-800 mb-1 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    {field.label}
                                    <span className="text-slate-500 text-[10px] mr-1">({field.labelEn})</span>
                                  </span>
                                </label>
                                {isSectorField ? (
                                  <select
                                    name={field.csvColumn}
                                    id={`field-${field.csvColumn}`}
                                    value={formData[field.csvColumn] || 'الإسكندرية'}
                                    onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                    className="border border-blue-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium cursor-pointer"
                                  >
                                    {['الإسكندرية والساحل', 'شرق الدلتا', 'مناطق غرب الدلتا', 'مناطق وسط الدلتا', 'مناطق السويس', 'مناطق الإسماعيلية', 'مناطق القاهرة الكبرى', 'مناطق الجيزة وأكتوبر', 'مناطق الصعيد'].map((sec) => (
                                      <option key={sec} value={sec}>
                                        {sec}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    name={field.csvColumn}
                                    id={`field-${field.csvColumn}`}
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                    placeholder={field.label}
                                    className="border rounded-lg px-3 py-2 text-sm border-blue-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                  />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* ── 2. GREEN FIELDS: Controlled Dropdowns (Add mode) ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-emerald-600 rounded-sm"></div>
                        <h3 className="font-bold text-emerald-900 text-base">
                          2. حالة الموقع والتصنيف والمتابعة التشغيلية
                        </h3>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 bg-emerald-50/50 border-emerald-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {greenFields.map((field) => {
                          const options = dropdownValues[field.csvColumn] || DEFAULT_FALLBACK_DROPDOWNS[field.csvColumn] || [];
                          const currentValue = formData[field.csvColumn] || '';

                          return (
                            <div key={field.csvColumn} className="flex flex-col">
                              <label className="text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  {field.label}
                                  <span className="text-slate-500 text-[10px] mr-1">({field.labelEn})</span>
                                </span>
                                {field.required && (
                                  <span className="text-red-500 font-bold">* مطلوب</span>
                                )}
                              </label>

                              <select
                                name={field.csvColumn}
                                id={`field-${field.csvColumn}`}
                                value={currentValue}
                                onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition cursor-pointer ${errors[field.csvColumn]
                                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                                  : 'border-emerald-300 bg-white text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                                  }`}
                              >
                                <option value="">-- اختر {field.label} --</option>
                                {options.map((val) => (
                                  <option key={val} value={val}>
                                    {val}
                                  </option>
                                ))}
                              </select>

                              {errors[field.csvColumn] && (
                                <span className="text-red-600 text-[11px] mt-1 font-semibold">{errors[field.csvColumn]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── 3. PURPLE FIELDS: User Inputs & Logistics (Add mode) ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-purple-600 rounded-sm"></div>
                        <h3 className="font-bold text-purple-900 text-base">
                          3. التواريخ والإحداثيات والتكاليف
                        </h3>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 bg-purple-50/50 border-purple-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {purpleFields.map((field) => {
                          const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
                            type: 'text',
                          };

                          if (field.inputType === 'number' || field.inputType === 'currency') {
                            inputProps.type = 'number';
                            inputProps.step = 'any';
                          }
                          if (field.inputType === 'coordinate') {
                            inputProps.type = 'number';
                            inputProps.step = '0.000001';
                          }
                          if (field.inputType === 'date') {
                            inputProps.type = 'date';
                          }

                          return (
                            <div key={field.csvColumn} className="flex flex-col">
                              <label className="text-xs font-semibold text-purple-800 mb-1 flex items-center justify-between">
                                <span>
                                  {field.label}
                                  <span className="text-purple-400 text-[10px] mr-1">({field.labelEn})</span>
                                </span>
                              </label>

                              <input
                                {...inputProps}
                                name={field.csvColumn}
                                id={`field-${field.csvColumn}`}
                                value={formData[field.csvColumn] || ''}
                                onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                placeholder={field.label}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${errors[field.csvColumn]
                                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                                  : 'border-purple-300 bg-white text-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                                  }`}
                              />

                              {errors[field.csvColumn] && (
                                <span className="text-red-600 text-[11px] mt-1 font-semibold">{errors[field.csvColumn]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────────────────── */}
                  {/* حقل إرفاق مستند إثبات الموقف الحالي (شرطي للحالات المحددة)  */}
                  {/* ──────────────────────────────────────────────────────────── */}
                  {isDocRequired && (
                    <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${errors['المستند']
                      ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200'
                      : formData['المستند']
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-300'
                      }`}>
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-indigo-600" />
                          <span>إرفاق مستند إثبات وتوثيق الموقف الحالي (Document Upload)</span>
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                            * إلزامي مطلوب
                          </span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">
                          يدعم: PDF, الصور (PNG/JPG), مستندات Word/Excel
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        يجب إرفاق ملف أو محضر أو خطاب رسمي يوثق إضافة وموقف الموقع الجديد (مثل: أمر الإسناد، كروكي المعاينة، أو محضر بدء الأعمال).
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>{formData['المستند'] ? 'تغيير المستند المرفق' : 'رفع مستند الإثبات (Upload File)'}</span>
                        </button>

                        <div className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between border ${formData['المستند']
                          ? 'bg-white border-emerald-300 text-emerald-900 font-mono font-bold'
                          : 'bg-white border-slate-300 text-slate-400 italic'
                          }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {formData['المستند'] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {formData['المستند'] || 'لم يتم إرفاق مستند حتى الآن (يرجى الضغط على زر رفع مستند الإثبات)'}
                            </span>
                          </div>
                          {formData['المستند'] && (
                            <button
                              type="button"
                              onClick={handleRemoveDocument}
                              className="text-rose-600 hover:text-rose-800 font-bold mr-2 text-xs cursor-pointer px-2 py-0.5 rounded hover:bg-rose-50"
                              title="إزالة المستند"
                            >
                              ✕ حذف
                            </button>
                          )}
                        </div>
                      </div>

                      {errors['المستند'] && (
                        <div className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1.5 animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{errors['المستند']}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </form>
          )}
        </div>

        {/* ── Footer / Actions ── */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded-md font-medium">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>بيانات أساسية ثابتة</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded-md font-medium">
              <Activity className="w-3 h-3 text-sky-600" />
              <span>حالة الموقع</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-md font-medium">
              <Sliders className="w-3 h-3 text-indigo-600" />
              <span>التصنيف والمتابعة</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>حقول شرطية ذكية</span>
            </span>
          </div>

          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              إلغاء وإغلاق
            </button>

            {step === 'fill-form' && (
              isReadOnly ? (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 bg-slate-300 text-slate-500 rounded-xl font-medium text-xs sm:text-sm cursor-not-allowed flex items-center gap-2 border border-slate-300"
                  title="الموقع يتبع قطاعاً آخر - المشاهدة فقط متاحة"
                >
                  <Lock className="w-4 h-4" />
                  <span>مشاهدة فقط (خارج نطاق قطاعك)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className={`px-6 py-2.5 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center gap-2 cursor-pointer ${activeMode === 'add'
                    ? 'bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
                    : 'bg-gradient-to-l from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
                    }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>جاري الحفظ في السحابة...</span>
                    </>
                  ) : activeMode === 'add' ? (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>➕ إضافة وحفظ الموقع الجديد</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>💾 حفظ وتحديث بيانات الموقع</span>
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
