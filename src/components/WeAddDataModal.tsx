// src/components/WeAddDataModal.tsx
// Dynamic data-entry modal driven by fieldConfig.ts with Sector-based Permissions.
// Supports both EDITING existing WE sites and ADDING brand new WE sites.
// Binds inputs to onSave / onSubmit with instant local state reflection and Supabase synchronization.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getBlueFields,
  getGreenFields,
  getPurpleFields,
  getSortedFields,
} from '../config/fieldConfig';
import type { WeRecord } from '../config/fieldConfig';
import { fetchSiteRecord, fetchDropdownValues, saveRecord } from '../hooks/useWeAPI';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector } from '../utils/sectorPermissions';
import { 
  Lock, 
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
  FileText,
  ChevronDown,
  ChevronUp,
  FileCheck
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
}

type FormMode = 'edit' | 'add';
type FormStep = 'select-site' | 'fill-form';

// Fallback options for key dropdowns if Supabase has not yet accumulated distinct values
const DEFAULT_FALLBACK_DROPDOWNS: Record<string, string[]> = {
  'Site Status': [
    'ON AIR',
    'تم التشغيل',
    'تم الانتهاء',
    'تم التسليم',
    'جاري العمل مدني',
    'جاري العمل كهربى',
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
    'تم التشغيل',
    'تم التشغيل فيبر',
    'جاري العمل',
    'جاري المعاينة',
    'جاري تصاريح',
    'جاري العمل كهربى',
    'جاري العمل مدني',
    'متعذر',
    'معوقات',
    'متعثرات',
    'تم التسليم',
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

// ── Fixed baseline fields (Strictly Read-Only / Disabled in EDIT mode) ──
// Requirements: Site Code, قطاع التنفيذ, قطاع المناطق, الإدارة العامة لتنفيذ الشبكات, مسؤولية التنفيذ, Type, Plan, Site Status
export const IMMUTABLE_FIELDS_IN_EDIT = new Set([
  'site code',
  'Site code',
  'site_code',
  'Exc sector',
  'Exc Sectores',
  'Sectore',
  'قطاع التنفيذ',
  'Sectores',
  'Zone',
  'قطاع المناطق',
  'Exc Zone',
  'اداره التنفيذ المختصه',
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
]);

export function isFieldImmutable(csvColumn: string): boolean {
  return IMMUTABLE_FIELDS_IN_EDIT.has(csvColumn) || IMMUTABLE_FIELDS_IN_EDIT.has(csvColumn.trim());
}

// ── Helper Types & Functions for Status-Driven RBAC ──
export type SiteStatusCategory =
  | 'completed'
  | 'operational'
  | 'in_progress'
  | 'stalled'
  | 'obstacles'
  | 'general';

export function getSiteStatusCategory(statusRaw?: string, classificationRaw?: string): SiteStatusCategory {
  const s = `${statusRaw || ''} ${classificationRaw || ''}`.toLowerCase().trim();

  // 1. Operational (تم التشغيل / تم التشغيل فايبر / ON AIR)
  if (
    s.includes('تم التشغيل') ||
    s.includes('تشغيل فايبر') ||
    s.includes('تشغيل فيبر') ||
    s.includes('on air') ||
    s.includes('onair') ||
    (s.includes('تشغيل') && !s.includes('جاري'))
  ) {
    return 'operational';
  }

  // 2. Completed (تم الانتهاء / تم التسليم)
  if (
    s.includes('تم الانتهاء') ||
    s.includes('انتهاء') ||
    s.includes('تم التسليم') ||
    s.includes('تسليم')
  ) {
    return 'completed';
  }

  // 3. Stalled (متعذر / متعثرات)
  if (s.includes('متعذر') || s.includes('متعثر') || s.includes('تعذر')) {
    return 'stalled';
  }

  // 4. Obstacles (معوقات / PROBLEM)
  if (s.includes('معوق') || s.includes('problem') || s.includes('عائق')) {
    return 'obstacles';
  }

  // 5. In Progress (جاري العمل، جاري المعاينة، جاري تصاريح، جاري العمل كهربي، جاري العمل مدني)
  if (
    s.includes('جاري العمل') ||
    s.includes('جاري المعاينة') ||
    s.includes('جاري تصاريح') ||
    s.includes('كهرب') ||
    s.includes('مدن') ||
    s.includes('معاين') ||
    s.includes('تصريح') ||
    s.includes('cwf') ||
    s.includes('rdt') ||
    s.includes('جاري')
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
  if (r.includes('عدم إمكانية') || r.includes('عدم امكانية') || r.includes('امكانية') || r.includes('إمكانية') || r.includes('استحالة')) {
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
    r.includes('تنسيق') ||
    r.includes('جهات') ||
    r.includes('حكومي')
  ) {
    return 'governmental_owner_objection';
  }
  if (r.includes('بعد المسافة') || r.includes('مسافة') || r.includes('مسافه')) {
    return 'far_distance';
  }
  return 'other';
}

export function isFieldAllowedForCurrentState(
  csvColumn: string,
  category: SiteStatusCategory,
  stalledReason: StalledSubReason,
  obstaclesReason: ObstaclesSubReason
): boolean {
  if (isFieldImmutable(csvColumn)) return false;
  if (csvColumn === 'الملاحظات' || csvColumn === 'notes') return true;

  if (category === 'completed') {
    return (
      csvColumn === 'التاريخ الفعلى للانتهاء' ||
      csvColumn === 'التاريخ المتوقع للانتهاء' ||
      csvColumn === 'المستند'
    );
  }

  if (category === 'operational') {
    return (
      csvColumn === 'التاريخ الفعلى للانتهاء' ||
      csvColumn === 'المستند'
    );
  }

  if (category === 'in_progress') {
    return csvColumn === 'التاريخ المتوقع للانتهاء';
  }

  if (category === 'stalled') {
    if (csvColumn === 'اسباب التعذر') return true;
    if (stalledReason === 'high_cost') {
      return (
        csvColumn === 'تكلفة التوصيل بدون مسار تراسلى بالجنيه' ||
        csvColumn === 'تكلفة التوصيل على المسار التراسلى بالجنيه' ||
        csvColumn === 'المسافة كم'
      );
    }
    if (stalledReason === 'permits') {
      return csvColumn === 'التاريخ المتوقع للانتهاء';
    }
    if (stalledReason === 'impossible') {
      return false; // only notes allowed
    }
    return true;
  }

  if (category === 'obstacles') {
    if (csvColumn === 'اسباب التعذر') return true;
    if (obstaclesReason === 'governmental_owner_objection') {
      return csvColumn === 'الجهة المطلوب الدعم منها';
    }
    if (obstaclesReason === 'far_distance') {
      return (
        csvColumn === 'المسافة كم' ||
        csvColumn === 'تكلفة التوصيل بدون مسار تراسلى بالجنيه' ||
        csvColumn === 'تكلفة التوصيل على المسار التراسلى بالجنيه'
      );
    }
    return true;
  }

  return true;
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
}) => {
  const { user, getSectorPermission } = useAuth();
  const isAdmin = Boolean(user && (user.role === 'admin' || user.sector === 'ALL'));
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── Mode & Step State ──
  const [activeMode, setActiveMode] = useState<FormMode>(mode === 'add' && !isAdmin ? 'edit' : mode);
  const [step, setStep] = useState<FormStep>(initialSiteCode || initialRecord || (mode === 'add' && isAdmin) ? 'fill-form' : 'select-site');
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

  // Dynamic Status & Reason computations for Conditional Field Customization
  const currentStatus = formData['Site Status'] || masterRecord?.['Site Status'] || '';
  const currentClassification = formData['التصنيف'] || masterRecord?.['التصنيف'] || '';
  const currentReason = formData['اسباب التعذر'] || masterRecord?.['اسباب التعذر'] || '';

  const currentCategory = useMemo(() => {
    return getSiteStatusCategory(currentStatus, currentClassification);
  }, [currentStatus, currentClassification]);

  const currentStalledReason = useMemo(() => {
    return getStalledSubReason(currentReason);
  }, [currentReason]);

  const currentObstaclesReason = useMemo(() => {
    return getObstaclesSubReason(currentReason);
  }, [currentReason]);

  // Document file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    handleFieldChange('المستند', fileName);
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

  // Determine user's sector default for new additions
  const userDefaultSector = useMemo(() => {
    if (!user || user.sector === 'ALL') return 'الإسكندرية';
    return user.sector;
  }, [user]);

  // Sector permission evaluation for the selected record
  const permissionInfo = useMemo(() => {
    if (activeMode === 'add') {
      return {
        canEdit: isAdmin,
        reason: isAdmin
          ? 'إضافة موقع جديد (صلاحية كاملة للإدارة Admin)'
          : 'غير مصرح للقطاعات بإضافة مواقع جديدة',
      };
    }
    if (!masterRecord) return null;
    return getSectorPermission(masterRecord);
  }, [activeMode, masterRecord, getSectorPermission, isAdmin]);

  const isReadOnly = Boolean(activeMode === 'edit' && permissionInfo && !permissionInfo.canEdit);


  // Filtered site codes for search
  const filteredCodes = useMemo(() => {
    if (!siteCodeSearch.trim()) return allSiteCodes.slice(0, 50);
    const q = siteCodeSearch.trim().toLowerCase();
    return allSiteCodes.filter((c) => c.toLowerCase().includes(q)).slice(0, 50);
  }, [allSiteCodes, siteCodeSearch]);

  // Check if typed search code exists in dataset
  const hasExactMatch = useMemo(() => {
    if (!siteCodeSearch.trim()) return true;
    const q = siteCodeSearch.trim().toLowerCase();
    return allSiteCodes.some((c) => c.toLowerCase() === q);
  }, [allSiteCodes, siteCodeSearch]);

  // ── Load dropdown values for green fields ──
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

  // ── Initialize a Blank Form for "Add New Entry" (Admin Only) ──
  const initNewEntry = useCallback((customCode = '') => {
    if (!isAdmin) {
      setErrors({ _general: 'غير مصرح: حسابات مستخدمي القطاعات لا تملك صلاحية إضافة مواقع جديدة (مقتصرة على حساب الإدارة Admin فقط).' });
      return;
    }
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
      'اداره التنفيذ المختصه': 'الإدارة المختصة',
      'Type': 'New',
      'المسئولية': 'تنفيذ',
      'Site Status': 'جاري المعاينة',
      'التصنيف': 'جاري المعاينة',
      'اسباب التعذر': 'لا يوجد تعذر',
      'خطة': new Date().getFullYear().toString(),
      'التاريخ المتوقع للانتهاء': `${new Date().getFullYear()}-12-31`,
    };

    setMasterRecord(blank);
    setFormData(blank);
  }, [isAdmin, userDefaultSector]);

  // ── Handle Selecting an Existing Site Code to Edit ──
  const handleSelectSiteCode = useCallback(async (code: string) => {
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    setDuplicateWarning(null);

    try {
      const record = await fetchSiteRecord(code);
      if (record) {
        // Strict Sector RBAC Restriction:
        // Disallow loading or viewing sites outside user's assigned sector
        if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
          if (!isRecordInSector(user.sector, record)) {
            setErrors({
              _general: `⛔ تم حظر الوصول: الموقع "${code}" يتبع قطاع (${record['Exc sector'] || record['Sectore'] || 'آخر'}). لا تملك صلاحية استعراضه أو تعديله طبقاً لنطاق صلاحية قطاعك (${user.sector}).`,
            });
            setLoading(false);
            return;
          }
        }

        setMasterRecord(record);
        setActiveMode('edit');

        // Pre-populate form data with all fields from master record, preserving _id and id
        const initial: WeRecord = {
          ...record,
          _id: record._id || (record as any).id || '',
        };
        sortedFields.forEach((f) => {
          if (initial[f.csvColumn] === undefined) {
            initial[f.csvColumn] = record[f.csvColumn] || '';
          }
        });
        setFormData(initial);
        setStep('fill-form');
      } else {
        setErrors({ _general: `لم يتم العثور على بيانات سابقة للموقع: ${code}` });
      }
    } catch {
      setErrors({ _general: `حدث خطأ أثناء تحميل بيانات الموقع: ${code}` });
    } finally {
      setLoading(false);
    }
  }, [sortedFields, user]);

  // ── Reset or Switch ──
  useEffect(() => {
    if (!isOpen) return;

    loadDropdownValues();

    if (initialRecord) {
      // Strict Sector RBAC Restriction on initialRecord
      if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
        if (!isRecordInSector(user.sector, initialRecord)) {
          setErrors({
            _general: `⛔ تم حظر الوصول: الموقع "${initialRecord['site code'] || ''}" لا يتبع قطاعك (${user.sector}). التعديل محجوب.`,
          });
          setMasterRecord(null);
          setStep('select-site');
          return;
        }
      }

      setMasterRecord(initialRecord);
      setActiveMode('edit');
      setFormData({
        ...initialRecord,
        _id: initialRecord._id || (initialRecord as any).id || '',
      });
      setStep('fill-form');
      setErrors({});
      setSuccessMessage('');
      setDuplicateWarning(null);
    } else if (initialSiteCode) {
      handleSelectSiteCode(initialSiteCode);
    } else if (mode === 'add' && isAdmin) {
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
  }, [isOpen, initialSiteCode, initialRecord, mode, isAdmin, loadDropdownValues, handleSelectSiteCode, initNewEntry, user]);

  // ── Handle Field Change ──
  const handleFieldChange = (csvColumn: string, value: string) => {
    if (isReadOnly) return;

    // Strict immutability check: In edit mode, baseline fields cannot be altered
    if (activeMode === 'edit' && isFieldImmutable(csvColumn)) {
      return;
    }

    // In edit mode, non-admins can only alter fields permitted for the current status state
    if (activeMode === 'edit') {
      const activeReason = csvColumn === 'اسباب التعذر' ? value : currentReason;
      const stReason = getStalledSubReason(activeReason);
      const obReason = getObstaclesSubReason(activeReason);

      if (!isFieldAllowedForCurrentState(csvColumn, currentCategory, stReason, obReason)) {
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [csvColumn]: csvColumn === 'site code' ? value.toUpperCase() : value,
    }));

    // Clear field-specific error
    if (errors[csvColumn]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[csvColumn];
        return next;
      });
    }
  };

  // ── Form Validation ──
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Site code is always strictly required
    const code = (formData['site code'] || masterRecord?.['site code'] || '').trim();
    if (!code) {
      newErrors['site code'] = 'كود الموقع مطلوب (Site Code)';
    }

    if (activeMode === 'add') {
      // 2. Classification & Status are required in add mode
      if (!formData['التصنيف']?.trim()) {
        newErrors['التصنيف'] = 'التصنيف مطلوب';
      }
      const statusVal = (formData['Site Status'] || '').trim();
      if (!statusVal) {
        newErrors['Site Status'] = 'حالة الموقع مطلوبة';
      }

      // 3. Check other required fields in add mode
      sortedFields.forEach((field) => {
        if (field.required && field.color !== 'blue' && field.csvColumn !== 'Site Status') {
          const val = formData[field.csvColumn]?.trim();
          if (!val) {
            newErrors[field.csvColumn] = `${field.label} مطلوب`;
          }
        }
      });
    }

    // 4. Validate numbers and coordinates if entered
    purpleFields.forEach((field) => {
      const val = formData[field.csvColumn]?.trim();
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handle Save / Submit ──
  const handleSave = async (forceUpdate = false) => {
    if (isReadOnly) {
      setErrors({ _general: 'غير مصرح بالتعديل: هذا الموقع يتبع قطاعاً آخر ولديك صلاحية المشاهدة فقط.' });
      return;
    }

    // Strict Sector RBAC Verification for Non-Admin
    if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
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

      // Strictly enforce preservation of baseline immutable fields in EDIT mode:
      // (كود الموقع، قطاع التنفيذ، قطاع المناطق، الإدارة العامة لتنفيذ الشبكات، مسؤولية التنفيذ، النوع، الخطة، حالة الموقع)
      if (isEdit && masterRecord) {
        IMMUTABLE_FIELDS_IN_EDIT.forEach((col) => {
          if (masterRecord[col] !== undefined && masterRecord[col] !== '') {
            dataToSave[col] = masterRecord[col];
          }
        });
      }

      if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
        dataToSave['Exc sector'] = user.sector;
        dataToSave['Sectores'] = user.sector;
        dataToSave['Exc Sectores'] = user.sector;
      }
      const result = await saveRecord(dataToSave, forceUpdate, isEdit);

      if (result.success && result.record) {
        const saved = result.record;
        setSuccessMessage(result.message || 'تم حفظ وتحديث البيانات بنجاح ✅');

        // IMMEDIATELY invoke parent callbacks for 0ms UI reactivity
        if (onSave) {
          try { await onSave(saved); } catch {}
        }
        if (onSubmit) {
          try { await onSubmit(saved); } catch {}
        }
        if (onSaved) {
          try { onSaved(saved); } catch {}
        }

        // Brief visual confirmation before closing modal
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

  // Handle Form Submit Event (e.g. hitting Enter)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(false);
  };

  // ── Reset ──
  const resetForm = () => {
    setStep('select-site');
    setActiveMode('edit');
    setSiteCodeSearch('');
    setMasterRecord(null);
    setFormData({});
    setErrors({});
    setSuccessMessage('');
    setDuplicateWarning(null);
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
        {/* ── Modal Header ── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
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
                <h2 className="text-lg sm:text-xl font-bold">
                  {activeMode === 'add'
                    ? 'إضافة موقع جديد إلى بيانات WE'
                    : step === 'select-site'
                    ? 'اختيار موقع WE لتحديثه'
                    : `تعديل بيانات الموقع: ${formData['site code'] || ''}`}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  activeMode === 'add'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                }`}>
                  {activeMode === 'add' ? 'إضافة جديدة ➕' : 'تعديل وتحديث ✏️'}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {activeMode === 'add'
                  ? 'أدخل بيانات الموقع الجديد وسيتم حفظه فوراً في قاعدة البيانات المركزية واللوحة'
                  : step === 'select-site'
                  ? 'ابحث بكود الموقع لتحميل بياناته وتعديلها وفقاً لصلاحيات قطاعك'
                  : isReadOnly
                  ? 'وضع المشاهدة فقط (يتبع قطاعاً آخر)'
                  : 'صلاحية التعديل متاحة (تابع لقطاعك)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User Sector Badge */}
            {user && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-sky-200 border border-white/20">
                <span>قطاعك:</span>
                <strong className="text-white">{user.sector}</strong>
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

        {/* ── Mode Switcher Tabs (If not locked to direct edit) ── */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'edit'
                  ? 'bg-white text-blue-800 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>تعديل موقع موجود</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => initNewEntry()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'add'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>➕ إضافة موقع جديد</span>
              </button>
            )}
          </div>

          {step === 'fill-form' && activeMode === 'edit' && (
            <button
              type="button"
              onClick={() => setStep('select-site')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
            >
              <span>← العودة لقائمة البحث</span>
            </button>
          )}
        </div>

        {/* ── Sector Permission Banner ── */}
        {step === 'fill-form' && permissionInfo && (
          <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 ${
            permissionInfo.canEdit 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
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
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                permissionInfo.canEdit 
                  ? 'bg-emerald-200 text-emerald-900' 
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {permissionInfo.canEdit ? 'قابل للتعديل والحفظ' : 'مشاهدة فقط'}
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
        <div className="overflow-y-auto flex-1 p-6">
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

              {/* Action when code is not found: Direct button to add it (Admin only) */}
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

              {/* Loading spinner */}
              {loading && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-slate-600 text-sm">جارِ تحميل بيانات الموقع من السحابة...</span>
                </div>
              )}

              {/* Site Code Filter List */}
              {!loading && (
                <div className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-100 shadow-inner">
                  {filteredCodes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p className="font-medium text-sm">لا توجد نتائج مطابقة لبحثك</p>
                      {siteCodeSearch.trim() && isAdmin && (
                        <button
                          type="button"
                          onClick={() => initNewEntry(siteCodeSearch.trim())}
                          className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>إضافة موقع جديد بالكود "{siteCodeSearch.trim()}"</span>
                        </button>
                      )}
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
                يتم عرض أول 50 نتيجة. استخدم شريط البحث للعثور على أي كود موقع بدقة.
              </p>
            </div>
          )}

          {/* ── Step 2: Full Form (Both Edit and Add New Entry) ── */}
          {step === 'fill-form' && (
            <form id="we-data-form" onSubmit={handleFormSubmit} className="space-y-6">

              {/* Sector Permission & Scope Alerts */}
              {isReadOnly && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="block font-bold mb-0.5 text-sm">⚠️ وضع المشاهدة فقط (خارج نطاق قطاعك)</strong>
                    <span>
                      هذا الموقع تابع لقطاع آخر. مسموح لك فقط بإضافة وتعديل مواقع قطاع (<strong>{user?.sector}</strong>). التعديل والحفظ محجوبان لحماية سرية وتكامل البيانات.
                    </span>
                  </div>
                </div>
              )}

              {activeMode === 'add' && user && user.role !== 'admin' && user.sector && user.sector !== 'ALL' && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-900 shadow-xs">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <span>يتم ربط وتسجيل هذا الموقع الجديد تلقائياً تحت نطاق: </span>
                    <strong className="font-bold underline">قطاع {user.sector}</strong>
                    <span> (مقيد بنطاق صلاحياتك المعتمدة حصرياً).</span>
                  </div>
                </div>
              )}

              {activeMode === 'edit' ? (
                <>
                  {/* ── 1. BASELINE FIXED FIELDS (Strictly Read-Only in Edit Mode) ── */}
                  <div className="bg-slate-100/90 border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-amber-300" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                            <span>1. الحقول الأساسية الثابتة للموقع (محمية ضد التعديل)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            الحقول الأساسية ثابتة وغير قابلة للتعديل لأي مستخدم عادي طبقاً لضوابط الصلاحيات
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold border border-slate-300 flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Read-Only / مغلقة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'كود الموقع', labelEn: 'Site Code', val: formData['site code'] || masterRecord?.['site code'] || '—' },
                        { label: 'قطاع التنفيذ', labelEn: 'Exc Sector', val: formData['Exc sector'] || formData['Sectores'] || masterRecord?.['Exc sector'] || '—' },
                        { label: 'قطاع المناطق', labelEn: 'Zone', val: formData['Zone'] || formData['قطاع المناطق'] || masterRecord?.['Zone'] || '—' },
                        { label: 'الإدارة العامة لتنفيذ الشبكات', labelEn: 'General Network Admin', val: formData['Exc Zone'] || formData['الادارة العامة لتنفيذ الشبكات'] || masterRecord?.['Exc Zone'] || '—' },
                        { label: 'مسؤولية التنفيذ', labelEn: 'Responsibility', val: formData['المسئولية'] || formData['مسئولية التنفيذ'] || masterRecord?.['المسئولية'] || '—' },
                        { label: 'النوع', labelEn: 'Type', val: formData['Type'] || formData['النوع'] || masterRecord?.['Type'] || '—' },
                        { label: 'الخطة', labelEn: 'Plan Year', val: formData['خطة'] || formData['Plan'] || masterRecord?.['خطة'] || '—' },
                        { label: 'حالة الموقع', labelEn: 'Site Status', val: currentStatus || '—' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-semibold text-slate-700">{item.label}</span>
                            <span className="text-[10px] text-slate-400">({item.labelEn})</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono truncate" title={item.val}>
                              {item.val}
                            </span>
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── 2. CONDITIONAL EDITING SECTION BASED ON SITE STATUS ── */}
                  {currentCategory === 'completed' && (
                    <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between mb-4 border-b border-emerald-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-emerald-950 text-base">
                                حالة الموقع: تم الانتهاء
                              </h4>
                              <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                                مسموح بتعديل الحقول المحددة أدناه فقط
                              </span>
                            </div>
                            <p className="text-xs text-emerald-700 mt-0.5">
                              المسموح: (تاريخ الانتهاء، إرفاق المستند مع زر رفع، والملاحظات) • باقي الخانات مغلقة
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. تاريخ الانتهاء */}
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 flex items-center justify-between">
                            <span>تاريخ الانتهاء (Completion Date)</span>
                            <span className="text-emerald-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <input
                            type="date"
                            name="التاريخ الفعلى للانتهاء"
                            id="field-actual-date"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['التاريخ الفعلى للانتهاء'] || formData['التاريخ المتوقع للانتهاء'] || ''}
                            onChange={(e) => handleFieldChange('التاريخ الفعلى للانتهاء', e.target.value)}
                            className="border border-emerald-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono shadow-xs"
                          />
                        </div>

                        {/* 2. إرفاق المستند مع زر رفع */}
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 flex items-center justify-between">
                            <span>إرفاق المستند الرسمي / محضر الإنجاز</span>
                            <span className="text-emerald-700 text-[11px] font-semibold">مستند معتمد</span>
                          </label>
                          <div className="flex items-center gap-2">
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
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>رفع ملف المستند</span>
                            </button>
                            <div className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-700 truncate font-mono flex items-center justify-between">
                              <span className="truncate">
                                {formData['المستند'] ? formData['المستند'] : 'لم يتم إرفاق ملف بعد'}
                              </span>
                              {formData['المستند'] && (
                                <button
                                  type="button"
                                  onClick={handleRemoveDocument}
                                  className="text-red-500 hover:text-red-700 font-bold mr-1 text-xs cursor-pointer"
                                  title="إلغاء المرفق"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          {formData['المستند'] && (
                            <span className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم إرفاق المستند بنجاح وجاهز للحفظ في السجل</span>
                            </span>
                          )}
                        </div>

                        {/* 3. الملاحظات */}
                        <div className="md:col-span-2 flex flex-col">
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 flex items-center justify-between">
                            <span>الملاحظات (Notes)</span>
                            <span className="text-emerald-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <textarea
                            rows={3}
                            name="الملاحظات"
                            id="field-notes"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="أدخل أي ملاحظات أو تفاصيل حول إنهاء وتسليم الموقع..."
                            className="border border-emerald-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentCategory === 'operational' && (
                    <div className="bg-sky-50/80 border-2 border-sky-300 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between mb-4 border-b border-sky-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sky-950 text-base">
                                حالة الموقع: تشغيل (ON AIR / تم التشغيل)
                              </h4>
                              <span className="text-[11px] bg-sky-200 text-sky-900 px-2.5 py-0.5 rounded-full font-bold">
                                مسموح بتعديل الحقول أدناه فقط
                              </span>
                            </div>
                            <p className="text-xs text-sky-700 mt-0.5">
                              المسموح: (تاريخ التشغيل/التاريخ الفعلي، إرفاق المستند مع زر رفع، والملاحظات) • باقي الخانات مغلقة
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. تاريخ التشغيل / التاريخ الفعلي */}
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-sky-950 mb-1.5 flex items-center justify-between">
                            <span>تاريخ التشغيل / التاريخ الفعلي (Actual On-Air Date)</span>
                            <span className="text-sky-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <input
                            type="date"
                            name="التاريخ الفعلى للانتهاء"
                            id="field-actual-date"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['التاريخ الفعلى للانتهاء'] || ''}
                            onChange={(e) => handleFieldChange('التاريخ الفعلى للانتهاء', e.target.value)}
                            className="border border-sky-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono shadow-xs"
                          />
                        </div>

                        {/* 2. إرفاق المستند مع زر رفع */}
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-sky-950 mb-1.5 flex items-center justify-between">
                            <span>إرفاق المستند الرسمي / محضر التشغيل</span>
                            <span className="text-sky-700 text-[11px] font-semibold">مستند معتمد</span>
                          </label>
                          <div className="flex items-center gap-2">
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
                              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>رفع ملف المستند</span>
                            </button>
                            <div className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-slate-700 truncate font-mono flex items-center justify-between">
                              <span className="truncate">
                                {formData['المستند'] ? formData['المستند'] : 'لم يتم إرفاق ملف بعد'}
                              </span>
                              {formData['المستند'] && (
                                <button
                                  type="button"
                                  onClick={handleRemoveDocument}
                                  className="text-red-500 hover:text-red-700 font-bold mr-1 text-xs cursor-pointer"
                                  title="إلغاء المرفق"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          {formData['المستند'] && (
                            <span className="text-[11px] text-sky-700 font-semibold mt-1 flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-sky-600" />
                              <span>تم إرفاق المستند بنجاح وجاهز للحفظ في السجل</span>
                            </span>
                          )}
                        </div>

                        {/* 3. الملاحظات */}
                        <div className="md:col-span-2 flex flex-col">
                          <label className="text-xs font-bold text-sky-950 mb-1.5 flex items-center justify-between">
                            <span>الملاحظات (Notes)</span>
                            <span className="text-sky-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <textarea
                            rows={3}
                            name="الملاحظات"
                            id="field-notes"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="أدخل أي ملاحظات حول تشغيل الموقع والتنسيق الفني..."
                            className="border border-sky-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentCategory === 'in_progress' && (
                    <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between mb-4 border-b border-amber-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                            <Edit3 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-amber-950 text-base">
                                حالة الموقع: {currentStatus || 'جاري العمل والتنفيذ'}
                              </h4>
                              <span className="text-[11px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                                مسموح بتعديل الحقول أدناه فقط
                              </span>
                            </div>
                            <p className="text-xs text-amber-700 mt-0.5">
                              المسموح: (التاريخ المتوقع للانتهاء/للتنفيذ والملاحظات) • باقي الخانات مغلقة
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. التاريخ المتوقع للانتهاء / للتنفيذ */}
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-amber-950 mb-1.5 flex items-center justify-between">
                            <span>التاريخ المتوقع للانتهاء / للتنفيذ (Expected Target Date)</span>
                            <span className="text-amber-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <input
                            type="date"
                            name="التاريخ المتوقع للانتهاء"
                            id="field-expected-date"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['التاريخ المتوقع للانتهاء'] || ''}
                            onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                            className="border border-amber-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono shadow-xs"
                          />
                        </div>

                        {/* 2. الملاحظات */}
                        <div className="flex flex-col md:col-span-2">
                          <label className="text-xs font-bold text-amber-950 mb-1.5 flex items-center justify-between">
                            <span>الملاحظات وموقف الأعمال (Notes & Progress)</span>
                            <span className="text-amber-700 text-[11px] font-semibold">قابل للتعديل</span>
                          </label>
                          <textarea
                            rows={3}
                            name="الملاحظات"
                            id="field-notes"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="أدخل أي ملاحظات حول سير الأعمال، نسب الإنجاز، وموقف التنفيذ الميداني..."
                            className="border border-amber-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentCategory === 'stalled' && (
                    <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between mb-4 border-b border-rose-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-rose-950 text-base">
                                حالة الموقع: متعذر
                              </h4>
                              <span className="text-[11px] bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full font-bold">
                                تخصيص الحقول بناءً على سبب التعذر
                              </span>
                            </div>
                            <p className="text-xs text-rose-700 mt-0.5">
                              حدد سبب التعذر لتفعيل الحقول المخصصة له طبقاً للائحة النظام
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reason dropdown */}
                      <div className="mb-4">
                        <label className="text-xs font-bold text-rose-950 mb-1.5 flex items-center justify-between">
                          <span>سبب التعذر (Stall Reason)</span>
                          <span className="text-rose-700 text-[11px] font-semibold">محدد الحقول</span>
                        </label>
                        <select
                          name="اسباب التعذر"
                          id="field-stalled-reason"
                          disabled={isReadOnly}
                          value={formData['اسباب التعذر'] || ''}
                          onChange={(e) => handleFieldChange('اسباب التعذر', e.target.value)}
                          className="border border-rose-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-semibold shadow-xs w-full cursor-pointer"
                        >
                          <option value="">-- اختر سبب التعذر --</option>
                          {['ارتفاع التكلفة', 'التصاريح', 'عدم إمكانية', 'تصاريح مرور', 'تصاريح سكة حديد', 'أخرى'].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-reason conditional fields */}
                      {currentStalledReason === 'high_cost' && (
                        <div className="bg-white/90 border border-rose-200 rounded-xl p-4 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in">
                          <div className="md:col-span-3 text-xs font-bold text-rose-800 border-b border-rose-100 pb-1.5">
                            💰 تفاصيل التكاليف والمسافة (سبب ارتفاع التكلفة):
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              التكلفة المتوقعة بدون مسار (بالجنيه)
                            </label>
                            <input
                              type="number"
                              step="any"
                              name="تكلفة التوصيل بدون مسار تراسلى بالجنيه"
                              value={formData['تكلفة التوصيل بدون مسار تراسلى بالجنيه'] || ''}
                              onChange={(e) => handleFieldChange('تكلفة التوصيل بدون مسار تراسلى بالجنيه', e.target.value)}
                              placeholder="مثال: 180000"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              التكلفة المتوقعة بمسار تراسلي (بالجنيه)
                            </label>
                            <input
                              type="number"
                              step="any"
                              name="تكلفة التوصيل على المسار التراسلى بالجنيه"
                              value={formData['تكلفة التوصيل على المسار التراسلى بالجنيه'] || ''}
                              onChange={(e) => handleFieldChange('تكلفة التوصيل على المسار التراسلى بالجنيه', e.target.value)}
                              placeholder="مثال: 95000"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              المسافة (كم)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              name="المسافة كم"
                              value={formData['المسافة كم'] || ''}
                              onChange={(e) => handleFieldChange('المسافة كم', e.target.value)}
                              placeholder="مثال: 4.2"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="md:col-span-3 flex flex-col mt-1">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              الملاحظات
                            </label>
                            <textarea
                              rows={2}
                              name="الملاحظات"
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="ملاحظات تفصيلية حول التكلفة والمسار..."
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>
                        </div>
                      )}

                      {currentStalledReason === 'permits' && (
                        <div className="bg-white/90 border border-rose-200 rounded-xl p-4 mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in">
                          <div className="md:col-span-2 text-xs font-bold text-rose-800 border-b border-rose-100 pb-1.5">
                            📜 تفاصيل تعذر التصاريح:
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              التاريخ المتوقع للانتهاء
                            </label>
                            <input
                              type="date"
                              name="التاريخ المتوقع للانتهاء"
                              value={formData['التاريخ المتوقع للانتهاء'] || ''}
                              onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="flex flex-col md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              الملاحظات
                            </label>
                            <textarea
                              rows={2}
                              name="الملاحظات"
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="ملاحظات حول جهة التصريح وموقف الصدور..."
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                            />
                          </div>
                        </div>
                      )}

                      {currentStalledReason === 'impossible' && (
                        <div className="bg-white/90 border border-rose-200 rounded-xl p-4 mt-3 flex flex-col gap-2 animate-in fade-in">
                          <div className="text-xs font-bold text-rose-800 border-b border-rose-100 pb-1.5">
                            🚫 تفصيل وشرح سبب عدم الإمكانية:
                          </div>
                          <label className="text-xs font-medium text-slate-700">
                            خانة الملاحظات لتوضيح وتفصيل سبب عدم الإمكانية
                          </label>
                          <textarea
                            rows={4}
                            name="الملاحظات"
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="يرجى تفصيل وشرح سبب عدم الإمكانية الفنية أو الهندسية أو الميدانية بدقة هنا..."
                            className="border border-rose-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 bg-rose-50/30"
                          />
                        </div>
                      )}

                      {currentStalledReason === 'other' && (
                        <div className="bg-white/90 border border-rose-200 rounded-xl p-4 mt-3 flex flex-col gap-2 animate-in fade-in">
                          <label className="text-xs font-medium text-slate-700">
                            الملاحظات
                          </label>
                          <textarea
                            rows={3}
                            name="الملاحظات"
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="تفاصيل سبب التعذر والملاحظات..."
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {currentCategory === 'obstacles' && (
                    <div className="bg-orange-50/80 border-2 border-orange-300 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between mb-4 border-b border-orange-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-orange-950 text-base">
                                حالة الموقع: معوقات
                              </h4>
                              <span className="text-[11px] bg-orange-200 text-orange-900 px-2.5 py-0.5 rounded-full font-bold">
                                تخصيص الحقول بناءً على نوع المعوق
                              </span>
                            </div>
                            <p className="text-xs text-orange-700 mt-0.5">
                              حدد سبب المعوق لتفعيل الحقول المطلوبة وفقاً لقواعد النظام
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reason dropdown */}
                      <div className="mb-4">
                        <label className="text-xs font-bold text-orange-950 mb-1.5 flex items-center justify-between">
                          <span>سبب المعوقات (Obstacle Reason)</span>
                          <span className="text-orange-700 text-[11px] font-semibold">محدد الحقول</span>
                        </label>
                        <select
                          name="اسباب التعذر"
                          id="field-obstacle-reason"
                          disabled={isReadOnly}
                          value={formData['اسباب التعذر'] || ''}
                          onChange={(e) => handleFieldChange('اسباب التعذر', e.target.value)}
                          className="border border-orange-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold shadow-xs w-full cursor-pointer"
                        >
                          <option value="">-- اختر سبب المعوقات --</option>
                          {[
                            'اعتراض مالك',
                            'اعتراض أهالي',
                            'التنسيق مع جهات أخرى',
                            'التنسيق مع جهات حكومية',
                            'بعد المسافة',
                            'أخرى'
                          ].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-reason conditional fields */}
                      {currentObstaclesReason === 'governmental_owner_objection' && (
                        <div className="bg-white/90 border border-orange-200 rounded-xl p-4 mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in">
                          <div className="md:col-span-2 text-xs font-bold text-orange-800 border-b border-orange-100 pb-1.5">
                            🏛️ تفاصيل الاعتراضات والتنسيق الحكومي:
                          </div>

                          <div className="flex flex-col md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              الجهة المطلوب الدعم منها
                            </label>
                            <select
                              name="الجهة المطلوب الدعم منها"
                              value={formData['الجهة المطلوب الدعم منها'] || ''}
                              onChange={(e) => handleFieldChange('الجهة المطلوب الدعم منها', e.target.value)}
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 cursor-pointer"
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
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              الملاحظات
                            </label>
                            <textarea
                              rows={3}
                              name="الملاحظات"
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="تفاصيل الاعتراض أو التنسيق المطلوب والملاحظات..."
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                            />
                          </div>
                        </div>
                      )}

                      {currentObstaclesReason === 'far_distance' && (
                        <div className="bg-white/90 border border-orange-200 rounded-xl p-4 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in">
                          <div className="md:col-span-3 text-xs font-bold text-orange-800 border-b border-orange-100 pb-1.5">
                            📏 تفاصيل بعد المسافة والتكاليف:
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              المسافة (كم)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              name="المسافة كم"
                              value={formData['المسافة كم'] || ''}
                              onChange={(e) => handleFieldChange('المسافة كم', e.target.value)}
                              placeholder="مثال: 5.8"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              تكلفة التوصيل بدون وسط تراسلي (بالجنيه)
                            </label>
                            <input
                              type="number"
                              step="any"
                              name="تكلفة التوصيل بدون مسار تراسلى بالجنيه"
                              value={formData['تكلفة التوصيل بدون مسار تراسلى بالجنيه'] || ''}
                              onChange={(e) => handleFieldChange('تكلفة التوصيل بدون مسار تراسلى بالجنيه', e.target.value)}
                              placeholder="مثال: 210000"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              تكلفة التوصيل على مسار تراسلي (بالجنيه)
                            </label>
                            <input
                              type="number"
                              step="any"
                              name="تكلفة التوصيل على المسار التراسلى بالجنيه"
                              value={formData['تكلفة التوصيل على المسار التراسلى بالجنيه'] || ''}
                              onChange={(e) => handleFieldChange('تكلفة التوصيل على المسار التراسلى بالجنيه', e.target.value)}
                              placeholder="مثال: 110000"
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                            />
                          </div>

                          <div className="md:col-span-3 flex flex-col mt-1">
                            <label className="text-xs font-medium text-slate-700 mb-1">
                              الملاحظات
                            </label>
                            <textarea
                              rows={2}
                              name="الملاحظات"
                              value={formData['الملاحظات'] || ''}
                              onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                              placeholder="ملاحظات وتفاصيل التوصيل والمسافات..."
                              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                            />
                          </div>
                        </div>
                      )}

                      {currentObstaclesReason === 'other' && (
                        <div className="bg-white/90 border border-orange-200 rounded-xl p-4 mt-3 flex flex-col gap-2 animate-in fade-in">
                          <label className="text-xs font-medium text-slate-700">
                            الملاحظات
                          </label>
                          <textarea
                            rows={3}
                            name="الملاحظات"
                            value={formData['الملاحظات'] || ''}
                            onChange={(e) => handleFieldChange('الملاحظات', e.target.value)}
                            placeholder="ملاحظات وتفاصيل المعوق..."
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {currentCategory === 'general' && (
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 shadow-xs animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-slate-800 mb-1.5">
                            التاريخ المتوقع للانتهاء / للتنفيذ
                          </label>
                          <input
                            type="date"
                            name="التاريخ المتوقع للانتهاء"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData['التاريخ المتوقع للانتهاء'] || ''}
                            onChange={(e) => handleFieldChange('التاريخ المتوقع للانتهاء', e.target.value)}
                            className="border border-slate-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono"
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
                            className="border border-slate-300 bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-sm"
                          />
                        </div>
                      </div>
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
                          1. البيانات الأساسية وتحديد الموقع (مطلوبة)
                        </h3>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        حقول إدخال نشطة
                      </span>
                    </div>

                    <div className="rounded-xl p-4 bg-blue-50/60 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Site Code input */}
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
                            className={`border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none transition ${
                              errors['site code']
                                ? 'border-red-400 bg-red-50 text-red-900 ring-2 ring-red-200'
                                : 'border-blue-300 bg-white text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                            }`}
                          />
                          {errors['site code'] && (
                            <span className="text-red-600 text-[11px] mt-1 font-semibold">{errors['site code']}</span>
                          )}
                        </div>

                        {/* Blue fields mapping */}
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
                                    {['الإسكندرية', 'الساحل الشمالي', 'وسط الدلتا', 'غرب الدلتا', 'شرق الدلتا', 'القاهرة الكبرى', 'الجيزة وأكتوبر', 'السويس', 'الإسماعيلية', 'الصعيد'].map((sec) => (
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
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition cursor-pointer ${
                                  errors[field.csvColumn]
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
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                                  errors[field.csvColumn]
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
                </>
              )}

            </form>
          )}
        </div>

        {/* ── Footer / Actions ── */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md font-medium">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span> بيانات أساسية
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md font-medium">
              <span className="w-2 h-2 bg-emerald-600 rounded-full"></span> قائمة منسدلة
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-md font-medium">
              <span className="w-2 h-2 bg-purple-600 rounded-full"></span> إدخال يدوي
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
                  <span>مشاهدة فقط (تابع لقطاع آخر)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className={`px-6 py-2.5 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'add'
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
                      <span>💾 حفظ وتحديث السجل</span>
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
