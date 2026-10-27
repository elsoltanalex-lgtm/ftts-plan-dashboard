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
  'Site Status': ['ON AIR', 'PROBLEM', 'CWF', 'RDT', 'جاري العمل مدني', 'جاري المعاينة', 'جاري تصاريح', 'تم التسليم'],
  'التصنيف': ['تم التشغيل فيبر', 'معوقات', 'متعثرات', 'جاري تصاريح', 'جاري العمل كهربى', 'جاري العمل مدني', 'جاري المعاينة', 'تم التسليم'],
  'اسباب التعذر': ['تصاريح مرور', 'تصاريح سكة حديد', 'أهالي ومعارضات', 'تعديل مسار', 'تنسيق مع جهات حكومية', 'انتظار توريد كابلات', 'لا يوجد تعذر'],
  'الجهة المطلوب الدعم منها': ['الجهاز القومي لتنظيم الاتصالات NTRA', 'وزارة النقل / الطرق والكباري', 'حي / مجلس مدينة', 'إدارة المرور', 'الشركة المصرية لنقل الكهرباء', 'لا يوجد'],
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
        canEdit: true,
        reason: user?.sector && user.sector !== 'ALL'
          ? `إضافة موقع جديد تابع لقطاع ${user.sector}`
          : 'إضافة موقع جديد (صلاحية كاملة)',
      };
    }
    if (!masterRecord) return null;
    return getSectorPermission(masterRecord);
  }, [activeMode, masterRecord, getSectorPermission, user]);

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

  // ── Initialize a Blank Form for "Add New Entry" ──
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
  }, [userDefaultSector]);

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
  }, [isOpen, initialSiteCode, initialRecord, mode, loadDropdownValues, handleSelectSiteCode, initNewEntry]);

  // ── Handle Field Change ──
  const handleFieldChange = (csvColumn: string, value: string) => {
    if (isReadOnly) return;

    // Strict immutability check: In edit mode, baseline fields cannot be altered
    if (activeMode === 'edit' && isFieldImmutable(csvColumn)) {
      return;
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

    // 2. Classification & Status are required
    if (!formData['التصنيف']?.trim()) {
      newErrors['التصنيف'] = 'التصنيف مطلوب';
    }
    const statusVal = (formData['Site Status'] || masterRecord?.['Site Status'] || '').trim();
    if (!statusVal) {
      newErrors['Site Status'] = 'حالة الموقع مطلوبة';
    }

    // 3. Check other required fields
    sortedFields.forEach((field) => {
      if (field.required && field.color !== 'blue' && field.csvColumn !== 'Site Status') {
        const val = formData[field.csvColumn]?.trim();
        if (!val) {
          newErrors[field.csvColumn] = `${field.label} مطلوب`;
        }
      }
    });

    // 4. Validate numbers and coordinates
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

              {/* Action when code is not found: Direct button to add it! */}
              {!hasExactMatch && siteCodeSearch.trim().length >= 3 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-blue-900">
                    <span>الكود </span>
                    <strong className="font-mono text-blue-700">{siteCodeSearch.trim()}</strong>
                    <span> غير مسجل في قاعدة البيانات الحالية.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => initNewEntry(siteCodeSearch.trim())}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة هذا الموقع الجديد الآن ←</span>
                  </button>
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
                      {siteCodeSearch.trim() && (
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

              {/* ── 1. BLUE FIELDS: Master Data ── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></div>
                    <h3 className="font-bold text-blue-900 text-base flex items-center gap-2">
                      {activeMode === 'add'
                        ? '1. البيانات الأساسية وتحديد الموقع (مطلوبة)'
                        : '1. البيانات الأساسية والمنطقة (بيانات ثابتة غير قابلة للتعديل)'}
                      {activeMode === 'edit' && (
                        <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-slate-300">
                          <Lock className="w-3 h-3 text-slate-600" />
                          قراءة فقط (Disabled)
                        </span>
                      )}
                    </h3>
                  </div>
                  {activeMode === 'add' ? (
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      حقول إدخال نشطة
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      محمية ضد التعديل
                    </span>
                  )}
                </div>

                <div className={`rounded-xl p-4 transition-colors ${
                  activeMode === 'edit'
                    ? 'bg-slate-100/90 border-2 border-slate-300'
                    : 'bg-blue-50/60 border border-blue-200'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {/* Site Code input */}
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          كود الموقع (Site Code)
                          {activeMode === 'edit' && <Lock className="w-3 h-3 text-slate-500" />}
                        </span>
                        {activeMode === 'edit' ? (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> ثابت (غير قابل للتعديل)
                          </span>
                        ) : (
                          <span className="text-red-500 font-bold">* مطلوب</span>
                        )}
                      </label>
                      <input
                        type="text"
                        name="site code"
                        id="field-site-code"
                        required
                        readOnly={activeMode === 'edit' || isReadOnly}
                        disabled={activeMode === 'edit' || isReadOnly}
                        value={formData['site code'] || ''}
                        onChange={(e) => handleFieldChange('site code', e.target.value)}
                        placeholder="مثال: LALXN33439"
                        className={`border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none transition ${
                          activeMode === 'edit' || isReadOnly
                            ? 'border-slate-300 bg-slate-200/80 text-slate-700 cursor-not-allowed select-none shadow-inner'
                            : errors['site code']
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
                        const isLockedSectorField =
                          isSectorField && user?.role !== 'admin' && user?.sector && user.sector !== 'ALL';
                        const isFieldFrozen = activeMode === 'edit' || isReadOnly || isLockedSectorField;
                        const fieldValue = isLockedSectorField && activeMode === 'add'
                          ? user.sector
                          : (formData[field.csvColumn] || '');

                        return (
                          <div key={field.csvColumn} className="flex flex-col">
                            <label className="text-xs font-medium text-slate-800 mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                {field.label}
                                <span className="text-slate-500 text-[10px] mr-1">({field.labelEn})</span>
                                {activeMode === 'edit' && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                              </span>
                              {activeMode === 'edit' ? (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> ثابت
                                </span>
                              ) : isLockedSectorField ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> قطاعك المخصص
                                </span>
                              ) : null}
                            </label>
                            {isSectorField && user?.role === 'admin' && activeMode === 'add' ? (
                              <select
                                name={field.csvColumn}
                                id={`field-${field.csvColumn}`}
                                value={formData[field.csvColumn] || 'الإسكندرية'}
                                onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                className="border border-blue-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
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
                                readOnly={isFieldFrozen}
                                disabled={isFieldFrozen}
                                value={fieldValue}
                                onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                                placeholder={isFieldFrozen ? (fieldValue || '—') : field.label}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                                  isFieldFrozen
                                    ? 'bg-slate-200/80 text-slate-700 border-slate-300 cursor-not-allowed font-medium select-none shadow-inner'
                                    : 'border-blue-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* ── 2. GREEN FIELDS: Controlled Dropdowns ── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-emerald-600 rounded-sm"></div>
                    <h3 className="font-bold text-emerald-900 text-base flex items-center gap-2">
                      2. حالة الموقع والتصنيف والمتابعة التشغيلية
                      {activeMode === 'edit' && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                          متاح لتعديل الحالة التشغيلية
                        </span>
                      )}
                    </h3>
                  </div>
                  {isReadOnly ? (
                    <span className="text-xs text-amber-700 font-normal">(مشاهدة فقط)</span>
                  ) : activeMode === 'edit' ? (
                    <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      الخطة وحالة الموقع ثابتتان • باقي الحقول قابلة للتعديل
                    </span>
                  ) : null}
                </div>

                <div className={`border rounded-xl p-4 ${isReadOnly ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {greenFields.map((field) => {
                      const options = dropdownValues[field.csvColumn] || DEFAULT_FALLBACK_DROPDOWNS[field.csvColumn] || [];
                      const currentValue = formData[field.csvColumn] || '';

                      // Strict Immutability Rule: In edit mode, 'خطة' (Plan) and 'Site Status' (Site Status) are completely locked!
                      const isFieldFrozenInEdit = activeMode === 'edit' && (
                        field.csvColumn === 'خطة' ||
                        field.csvColumn === 'Site Status' ||
                        isFieldImmutable(field.csvColumn)
                      );
                      const isFieldDisabled = isReadOnly || isFieldFrozenInEdit;

                      return (
                        <div key={field.csvColumn} className="flex flex-col">
                          <label className="text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              {field.label}
                              <span className="text-slate-500 text-[10px] mr-1">({field.labelEn})</span>
                              {isFieldFrozenInEdit && <Lock className="w-3 h-3 text-slate-500" />}
                            </span>
                            {isFieldFrozenInEdit ? (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> ثابت (غير مسموح بالتعديل)
                              </span>
                            ) : field.required && !isReadOnly ? (
                              <span className="text-red-500 font-bold">* مطلوب</span>
                            ) : null}
                          </label>

                          <select
                            name={field.csvColumn}
                            id={`field-${field.csvColumn}`}
                            disabled={isFieldDisabled}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                            className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                              isFieldDisabled
                                ? 'bg-slate-200/80 text-slate-700 border-slate-300 cursor-not-allowed font-medium select-none shadow-inner'
                                : errors[field.csvColumn]
                                ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                                : 'border-emerald-300 bg-white text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                            }`}
                          >
                            <option value="">-- اختر {field.label} --</option>
                            {/* Make sure current value is visible even if not in dropdown array */}
                            {currentValue && !options.includes(currentValue) && (
                              <option value={currentValue}>{currentValue} (القيمة الحالية)</option>
                            )}
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

              {/* ── 3. PURPLE FIELDS: User Inputs & Logistics ── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-purple-600 rounded-sm"></div>
                    <h3 className="font-bold text-purple-900 text-base">
                      3. التواريخ والإحداثيات والتكاليف (إدخال وتحديث)
                    </h3>
                  </div>
                  {isReadOnly && (
                    <span className="text-xs text-amber-700 font-normal">(مشاهدة فقط)</span>
                  )}
                </div>

                <div className={`border rounded-xl p-4 ${isReadOnly ? 'bg-slate-50 border-slate-200' : 'bg-purple-50/50 border-purple-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {purpleFields.map((field) => {
                      const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
                        type: 'text',
                      };

                      if (field.inputType === 'number' || field.inputType === 'currency') {
                        inputProps.type = 'number';
                        inputProps.step = 'any';
                        if (field.validation?.min !== undefined) inputProps.min = field.validation.min;
                        if (field.validation?.max !== undefined) inputProps.max = field.validation.max;
                      }
                      if (field.inputType === 'coordinate') {
                        inputProps.type = 'number';
                        inputProps.step = '0.000001';
                        if (field.validation?.min !== undefined) inputProps.min = field.validation.min;
                        if (field.validation?.max !== undefined) inputProps.max = field.validation.max;
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
                            {field.required && !isReadOnly && (
                              <span className="text-red-500 font-bold">* مطلوب</span>
                            )}
                          </label>

                          <input
                            {...inputProps}
                            name={field.csvColumn}
                            id={`field-${field.csvColumn}`}
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={formData[field.csvColumn] || ''}
                            onChange={(e) => handleFieldChange(field.csvColumn, e.target.value)}
                            placeholder={isReadOnly ? '—' : field.label}
                            className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                              isReadOnly
                                ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                                : errors[field.csvColumn]
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
