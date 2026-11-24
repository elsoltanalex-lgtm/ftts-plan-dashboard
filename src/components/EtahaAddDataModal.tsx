// src/components/EtahaAddDataModal.tsx
// Data-entry and modification modal for Availability (الإتاحة) projects
// Strict match with Availability requirements, cascading administrative dropdowns, and conditional logic

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ETAHA_RAW_RECORDS, type EtahaRecord } from '../data/etahaSites';
import type { SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import { uploadAttachment } from '../lib/supabase';
import { parseToDateInputValue } from '../utils/filterUtils';
import { normalizeArabicText } from '../utils/etahaMetrics';
import {
  X,
  PlusCircle,
  Edit3,
  Search,
  Save,
  Building2,
  Calendar,
  CalendarCheck2,
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
  FileSpreadsheet,
  Download,
  Lock,
  ShieldAlert,
  XCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  generateEtahaBulkImportTemplate,
  parseAndValidateEtahaBulkExcel,
  type EtahaValidationReport,
} from '../utils/etahaBulkExcelService';

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
  onBulkSave?: (records: EtahaRecord[]) => Promise<{ success: boolean; error?: string; insertedCount?: number; updatedCount?: number; savedCount?: number }>;
}

// Approved Standard Values matching Availability Dataset & Requirements
const APPROVED_SECTORS = [
  'المناطق الشرقية',
  'المناطق الغربية',
  'قطاعات الشرقية والغربيه',
  'قطاعات الإسكندرية والساحل',
  'قطاعات المنطقة الشرقية',
  'قطاعات المنطقة الغربية',
  'قطاعات مناطق القاهرة الكبرى',
  'قطاعات المناطق الجنوبية',
  'القاهرة الكبرى',
  'المناطق الجنوبية',
  'الإسكندرية والساحل',
  'قطاع عام',
];

const APPROVED_INTERNAL_PATHS = [
  'تم الانتهاء بالكامل',
  'تم الانتهاء',
  'لم يتم',
  'لم يتم الانتهاء من المسار الخارجي',
  'مسار خارجي متعذرات او معوقات',
  'جاري العمل',
];

const APPROVED_EXTERNAL_PATHS = [
  'تم الانتهاء',
  'جاري العمل',
  'جاري استخراج تصاريح',
  'معوقات',
  'متعذر',
  'جاري العمل مدني',
  'جاري السحب واللحام',
  'لم يتم البدء',
];

const APPROVED_SPLICING_STATUSES = [
  'تم الانتهاء بالكامل',
  'تم الانتهاء',
  'لم يتم',
  'لم يتم الانتهاء من المسار الخارجي',
  'مسار خارجي متعذرات او معوقات',
  'جاري اللحام',
  'لم يتم البدء',
];

const APPROVED_DELIVERY_STATUSES = [
  'تم التسليم',
  'لم يتم',
  'منتظر التسليم',
  'مؤجل من العميل',
];

const APPROVED_CLASSIFICATIONS = [
  'تم الانتهاء والتسليم',
  'تم خارجي -متوقف علي العميل',
  'تصاريح',
  'معوقات',
  'متعذر',
  'جاري خارجي',
  'جاري العمل',
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

/**
 * Deduplicates strings while ignoring extra whitespace and normalising equivalent Arabic characters
 */
function deduplicateOptions(options: string[]): string[] {
  const seenNorm = new Map<string, string>();
  for (const opt of options) {
    const trimmed = (opt || '').replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;
    const normKey = trimmed
      .replace(/[إأآا]/g, 'ا')
      .replace(/[ىي]/g, 'ي')
      .replace(/[ةه]/g, 'ه');
    if (!seenNorm.has(normKey)) {
      seenNorm.set(normKey, trimmed);
    }
  }
  return Array.from(seenNorm.values()).sort((a, b) => a.localeCompare(b, 'ar'));
}

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
  onBulkSave,
}) => {
  const { isAdmin } = useAuth();
  const [entryType, setEntryType] = useState<'single' | 'bulk'>('single');
  const [activeMode, setActiveMode] = useState<'add' | 'edit'>(mode);
  const [step, setStep] = useState<'select-site' | 'fill-form'>(
    initialSiteCode || initialRecord || mode === 'add' ? 'fill-form' : 'select-site'
  );
  const [siteCodeSearch, setSiteCodeSearch] = useState('');
  const [masterRecord, setMasterRecord] = useState<EtahaRecord | null>(initialRecord || null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk Excel Mode State
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkReport, setBulkReport] = useState<EtahaValidationReport | null>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkGeneralError, setBulkGeneralError] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [bulkFilterStatus, setBulkFilterStatus] = useState<'all' | 'valid' | 'errors'>('all');
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

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
    'المسار الداخلى': 'لم يتم',
    'المسار الخارجي': 'جاري استخراج تصاريح',
    'موقف اللحامات': 'لم يتم البدء',
    'التصنيف': 'جاري العمل',
    'موقف التسليم': 'لم يتم',
    'تاريخ السداد والبدء في التنفيذ': '',
    'تاريخ السداد و البدء فى التنفيذ': '',
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

  // Helper to normalize spaces and text
  const cleanStr = useCallback((str?: string) => {
    return (str || '').replace(/\s+/g, ' ').trim();
  }, []);

  // Comprehensive hierarchical mapping combining live sitesData and base ETAHA_RAW_RECORDS
  const combinedEtahaHierarchy = useMemo(() => {
    const list: Array<{
      sector: string;
      execSector: string;
      generalAdmin: string;
      competentAdmin: string;
    }> = [];

    const addEntry = (sec?: string, es?: string, ga?: string, ca?: string) => {
      const s = cleanStr(sec);
      const e = cleanStr(es);
      const g = cleanStr(ga);
      const c = cleanStr(ca);
      if (e || g || c) {
        list.push({ sector: s, execSector: e, generalAdmin: g, competentAdmin: c });
      }
    };

    // 1. From live sitesData (Supabase live state)
    for (const site of sitesData || []) {
      const raw = (site.rawRecord as EtahaRecord) || {};
      addEntry(
        raw['القطاعات'] || site.sector,
        raw['قطاع التنفيذ'] || site.subSector,
        raw['الادارة العامة المنفذة'] || site.generalAdmin,
        raw['ادارة التنفيذ'] || site.competentAdmin
      );
    }

    // 2. From ETAHA_RAW_RECORDS (Excel master records)
    for (const raw of ETAHA_RAW_RECORDS || []) {
      addEntry(
        raw['القطاعات'],
        raw['قطاع التنفيذ'],
        raw['الادارة العامة المنفذة'],
        raw['ادارة التنفيذ']
      );
    }

    return list;
  }, [sitesData, cleanStr]);

  // 1. قطاع التنفيذ (Execution Sectors) - Filtered by selected القطاعات
  const availableExecSectors = useMemo(() => {
    const selectedSec = cleanStr(formData['القطاعات']);
    const rawOptions: string[] = [];
    for (const item of combinedEtahaHierarchy) {
      const matchSec = !selectedSec || !item.sector || item.sector === selectedSec ||
        item.sector.includes(selectedSec) || selectedSec.includes(item.sector);
      if (matchSec && item.execSector) {
        rawOptions.push(item.execSector);
      }
    }
    // Fallback if none matched
    if (rawOptions.length === 0) {
      for (const item of combinedEtahaHierarchy) {
        if (item.execSector) rawOptions.push(item.execSector);
      }
    }
    const cur = cleanStr(formData['قطاع التنفيذ']);
    if (cur) rawOptions.push(cur);

    return deduplicateOptions(rawOptions);
  }, [combinedEtahaHierarchy, formData['القطاعات'], formData['قطاع التنفيذ'], cleanStr]);

  // 2. الإدارة العامة للتنفيذ (General Administrations) - Filtered automatically by selected قطاع التنفيذ
  const availableGeneralAdmins = useMemo(() => {
    const selectedEs = cleanStr(formData['قطاع التنفيذ']);
    const rawOptions: string[] = [];

    for (const item of combinedEtahaHierarchy) {
      if (!selectedEs || item.execSector === selectedEs) {
        if (item.generalAdmin) rawOptions.push(item.generalAdmin);
      }
    }

    const cur = cleanStr(formData['الادارة العامة المنفذة']);
    if (cur) rawOptions.push(cur);

    return deduplicateOptions(rawOptions);
  }, [combinedEtahaHierarchy, formData['قطاع التنفيذ'], formData['الادارة العامة المنفذة'], cleanStr]);

  // 3. إدارة التنفيذ المختصة (Competent Administrations) - Filtered automatically by selected الإدارة العامة للتنفيذ
  const availableCompetentAdmins = useMemo(() => {
    const selectedEs = cleanStr(formData['قطاع التنفيذ']);
    const selectedGa = cleanStr(formData['الادارة العامة المنفذة']);
    const rawOptions: string[] = [];

    for (const item of combinedEtahaHierarchy) {
      const matchEs = !selectedEs || item.execSector === selectedEs;
      const matchGa = !selectedGa || item.generalAdmin === selectedGa;
      if (matchEs && matchGa && item.competentAdmin) {
        rawOptions.push(item.competentAdmin);
      }
    }

    // Fallback: if strictly filtered is empty but GA is selected, filter by GA alone
    if (rawOptions.length === 0 && selectedGa) {
      for (const item of combinedEtahaHierarchy) {
        if (item.generalAdmin === selectedGa && item.competentAdmin) {
          rawOptions.push(item.competentAdmin);
        }
      }
    }

    const cur = cleanStr(formData['ادارة التنفيذ']);
    if (cur) rawOptions.push(cur);

    return deduplicateOptions(rawOptions);
  }, [combinedEtahaHierarchy, formData['قطاع التنفيذ'], formData['الادارة العامة المنفذة'], formData['ادارة التنفيذ'], cleanStr]);

  // Cascading Handlers:
  // When القطاعات changes, validate/reset dependent execution sector, GA and CA
  const handleSectorChange = (newSec: string) => {
    const cleanedSec = cleanStr(newSec);
    const validEs = new Set(
      combinedEtahaHierarchy
        .filter((item) => !cleanedSec || !item.sector || item.sector === cleanedSec ||
          item.sector.includes(cleanedSec) || cleanedSec.includes(item.sector))
        .map((item) => cleanStr(item.execSector))
        .filter(Boolean)
    );
    const currentEs = cleanStr(formData['قطاع التنفيذ']);
    const nextEs = validEs.has(currentEs) ? currentEs : '';

    setFormData((prev) => ({
      ...prev,
      القطاعات: cleanedSec,
      'قطاع التنفيذ': nextEs,
      ...(nextEs ? {} : { 'الادارة العامة المنفذة': '', 'ادارة التنفيذ': '' }),
    }));
  };

  // When قطاع التنفيذ changes, update and reset dependent GA and CA
  const handleExecSectorChange = (newEs: string) => {
    const cleanedEs = cleanStr(newEs);

    // Valid General Admins under the new Execution Sector
    const validGas = new Set(
      combinedEtahaHierarchy
        .filter((item) => cleanStr(item.execSector) === cleanedEs && item.generalAdmin)
        .map((item) => cleanStr(item.generalAdmin))
    );

    const currentGa = cleanStr(formData['الادارة العامة المنفذة']);
    let nextGa = validGas.has(currentGa) ? currentGa : '';
    if (!nextGa && validGas.size === 1) {
      nextGa = Array.from(validGas)[0];
    }

    // Valid Competent Admins under the new General Admin & Execution Sector
    const validCas = new Set(
      combinedEtahaHierarchy
        .filter((item) => {
          const matchEs = cleanStr(item.execSector) === cleanedEs;
          const matchGa = !nextGa || cleanStr(item.generalAdmin) === nextGa;
          return matchEs && matchGa && item.competentAdmin;
        })
        .map((item) => cleanStr(item.competentAdmin))
    );

    const currentCa = cleanStr(formData['ادارة التنفيذ']);
    let nextCa = validCas.has(currentCa) ? currentCa : '';
    if (!nextCa && validCas.size === 1) {
      nextCa = Array.from(validCas)[0];
    }

    // Auto-correlate with geographical sector if available
    const matchingSector = combinedEtahaHierarchy.find(
      (item) => cleanStr(item.execSector) === cleanedEs && item.sector
    )?.sector;

    setFormData((prev) => ({
      ...prev,
      'قطاع التنفيذ': cleanedEs,
      'الادارة العامة المنفذة': nextGa,
      'ادارة التنفيذ': nextCa,
      ...(matchingSector ? { القطاعات: matchingSector } : {}),
    }));
  };

  // When الإدارة العامة للتنفيذ changes, update and reset dependent CA
  const handleGeneralAdminChange = (newGa: string) => {
    const cleanedGa = cleanStr(newGa);
    const selectedEs = cleanStr(formData['قطاع التنفيذ']);

    const validCas = new Set(
      combinedEtahaHierarchy
        .filter((item) => {
          const matchEs = !selectedEs || cleanStr(item.execSector) === selectedEs;
          const matchGa = cleanStr(item.generalAdmin) === cleanedGa;
          return matchEs && matchGa && item.competentAdmin;
        })
        .map((item) => cleanStr(item.competentAdmin))
    );

    const currentCa = cleanStr(formData['ادارة التنفيذ']);
    let nextCa = validCas.has(currentCa) ? currentCa : '';
    if (!nextCa && validCas.size === 1) {
      nextCa = Array.from(validCas)[0];
    }

    // If Execution Sector was empty, auto-populate from this General Admin
    const matchingEs = !selectedEs
      ? combinedEtahaHierarchy.find((item) => cleanStr(item.generalAdmin) === cleanedGa && item.execSector)?.execSector
      : undefined;

    setFormData((prev) => ({
      ...prev,
      'الادارة العامة المنفذة': cleanedGa,
      'ادارة التنفيذ': nextCa,
      ...(matchingEs ? { 'قطاع التنفيذ': matchingEs } : {}),
    }));
  };

  // When إدارة التنفيذ المختصة changes
  const handleCompetentAdminChange = (newCa: string) => {
    const cleanedCa = cleanStr(newCa);
    let extraUpdates = {};

    // If General Admin was empty, auto-populate from Competent Admin
    if (!formData['الادارة العامة المنفذة']) {
      const match = combinedEtahaHierarchy.find((item) => cleanStr(item.competentAdmin) === cleanedCa);
      if (match) {
        extraUpdates = {
          ...(match.generalAdmin ? { 'الادارة العامة المنفذة': match.generalAdmin } : {}),
          ...(match.execSector ? { 'قطاع التنفيذ': match.execSector } : {}),
        };
      }
    }

    setFormData((prev) => ({
      ...prev,
      'ادارة التنفيذ': cleanedCa,
      ...extraUpdates,
    }));
  };

  // Check if both internal and external routes are completed
  const internalRoute = String(formData['المسار الداخلى'] || formData['المسار الداخلي'] || formData.internalPath || '').trim();
  const externalRoute = String(formData['المسار الخارجي'] || formData.externalPath || '').trim();
  const normInt = normalizeArabicText(internalRoute);
  const normExt = normalizeArabicText(externalRoute);
  const isInternalDone = !normInt.includes('لم يتم') && !normInt.includes('لم ينته') && !normInt.includes('معوق') && !normInt.includes('تعذر') && (normInt.includes('تم الانتهاء') || normInt === 'منتهي' || normInt === 'تم');
  const isExternalDone = !normExt.includes('لم يتم') && !normExt.includes('معوق') && !normExt.includes('تعذر') && (normExt.includes('تم الانتهاء') || normExt === 'منتهي' || normExt === 'تم');
  const isBothPathsCompleted = isInternalDone && isExternalDone;

  const currentClassification = String(formData['التصنيف'] || formData.classification || '').trim();
  const currentDelivery = String(formData['موقف التسليم'] || formData.deliveryStatus || '').trim();
  const isDeliverySelected = currentClassification === 'تم الانتهاء والتسليم' || currentClassification === 'تم التسليم' || currentDelivery === 'تم التسليم';
  const isBlockedObstacles = currentClassification === 'معوقات' || currentClassification.includes('معوق');
  const isStalled = currentClassification === 'متعذر' || currentClassification === 'متعذرات' || currentClassification === 'تعذر' || currentClassification.includes('تعذر') || currentClassification.includes('متعذر');

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
        'المسار الداخلي': 'لم يتم',
        'المسار الداخلى': 'لم يتم',
        internalPath: 'لم يتم',
        'المسار الخارجي': 'جاري استخراج تصاريح',
        externalPath: 'جاري استخراج تصاريح',
        'موقف اللحامات': 'لم يتم البدء',
        splicingStatus: 'لم يتم البدء',
        'التصنيف': 'جاري العمل',
        classification: 'جاري العمل',
        'موقف التسليم': 'لم يتم',
        deliveryStatus: 'لم يتم',
        'تاريخ السداد والبدء في التنفيذ': '',
        'تاريخ السداد و البدء فى التنفيذ': '',
        'سبب المعوق او التعذر': '',
        'ملحوظه في حاله عدم الانتهاء': '',
        'الملاحظات': '',
        'تاريخ المعوق': '',
        'تاريخ التعذر': '',
        المستند: '',
        'مستند الإثبات': '',
        documentUrl: '',
        specialTarget: false,
        'سبيشال تارجت': false,
        'سبيشال_تارجت': false,
      });
    } else {
      if (initialRecord) {
        setMasterRecord(initialRecord);
        const pDate = parseToDateInputValue(
          initialRecord['تاريخ السداد والبدء في التنفيذ'] ||
          initialRecord['تاريخ السداد و البدء فى التنفيذ'] ||
          initialRecord.paymentAndStartDate ||
          initialRecord.payment_and_start_date
        );
        const isSpecial = Boolean(
          initialRecord.specialTarget ||
          initialRecord['سبيشال تارجت'] ||
          initialRecord['سبيشال_تارجت']
        );
        const intVal = String(initialRecord['المسار الداخلي'] || initialRecord['المسار الداخلى'] || initialRecord.internalPath || 'لم يتم').trim();
        const extVal = String(initialRecord['المسار الخارجي'] || initialRecord.externalPath || 'جاري استخراج تصاريح').trim();
        const spliceVal = String(initialRecord['موقف اللحامات'] || initialRecord.splicingStatus || 'لم يتم البدء').trim();
        const delVal = String(initialRecord['موقف التسليم'] || initialRecord.deliveryStatus || 'لم يتم').trim();
        const clsVal = String(initialRecord['التصنيف'] || initialRecord.classification || 'جاري العمل').trim();

        setFormData({
          ...initialRecord,
          'المسار الداخلي': intVal,
          'المسار الداخلى': intVal,
          internalPath: intVal,
          'المسار الخارجي': extVal,
          externalPath: extVal,
          'موقف اللحامات': spliceVal,
          splicingStatus: spliceVal,
          'موقف التسليم': delVal,
          deliveryStatus: delVal,
          'التصنيف': clsVal,
          classification: clsVal,
          'تاريخ السداد والبدء في التنفيذ': pDate,
          'تاريخ السداد و البدء فى التنفيذ': pDate,
          specialTarget: isSpecial,
          'سبيشال تارجت': isSpecial,
          'سبيشال_تارجت': isSpecial,
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
      const pDate = parseToDateInputValue(
        raw['تاريخ السداد والبدء في التنفيذ'] ||
        raw['تاريخ السداد و البدء فى التنفيذ'] ||
        raw.paymentAndStartDate ||
        raw.payment_and_start_date ||
        site?.paymentAndStartDate
      );
      const isSpecial = Boolean(
        raw.specialTarget ||
        raw['سبيشال تارجت'] ||
        raw['سبيشال_تارجت'] ||
        site?.specialTarget
      );
      const intVal = String(raw['المسار الداخلي'] || raw['المسار الداخلى'] || raw.internalPath || site?.internalPath || 'لم يتم').trim();
      const extVal = String(raw['المسار الخارجي'] || raw.externalPath || site?.externalPath || 'جاري استخراج تصاريح').trim();
      const spliceVal = String(raw['موقف اللحامات'] || raw.splicingStatus || 'لم يتم البدء').trim();
      const delVal = String(raw['موقف التسليم'] || raw.deliveryStatus || site?.deliveryStatus || site?.deliveryArea || 'لم يتم').trim();
      const clsVal = String(raw['التصنيف'] || raw.classification || site?.classification || 'جاري العمل').trim();

      setFormData({
        ...raw,
        'المسار الداخلي': intVal,
        'المسار الداخلى': intVal,
        internalPath: intVal,
        'المسار الخارجي': extVal,
        externalPath: extVal,
        'موقف اللحامات': spliceVal,
        splicingStatus: spliceVal,
        'موقف التسليم': delVal,
        deliveryStatus: delVal,
        'التصنيف': clsVal,
        classification: clsVal,
        'تاريخ السداد والبدء في التنفيذ': pDate,
        'تاريخ السداد و البدء فى التنفيذ': pDate,
        specialTarget: isSpecial,
        'سبيشال تارجت': isSpecial,
        'سبيشال_تارجت': isSpecial,
      });
    } else {
      const pDate = parseToDateInputValue(
        site?.paymentAndStartDate ||
        site?.rawRecord?.['تاريخ السداد والبدء في التنفيذ'] ||
        site?.rawRecord?.['تاريخ السداد و البدء فى التنفيذ']
      );
      const isSpecial = Boolean(
        site?.specialTarget ||
        site?.rawRecord?.specialTarget ||
        site?.rawRecord?.['سبيشال تارجت']
      );
      const intVal = String(site?.rawRecord?.['المسار الداخلى'] || site?.rawRecord?.['المسار الداخلي'] || site?.internalPath || 'لم يتم').trim();
      const extVal = String(site?.rawRecord?.['المسار الخارجي'] || site?.externalPath || 'جاري العمل مدني').trim();
      const spliceVal = String(site?.rawRecord?.['موقف اللحامات'] || 'لم يتم البدء').trim();
      const delVal = String(site?.deliveryStatus || site?.deliveryArea || site?.rawRecord?.['موقف التسليم'] || 'لم يتم').trim();
      const clsVal = String(site?.classification || 'جاري العمل').trim();

      setFormData((prev) => ({
        ...prev,
        Code: code,
        'اسم العميل': site?.siteName || '',
        'اسم الفرع': site?.branchName || '',
        العنوان: site?.address || '',
        القطاعات: site?.sector || 'قطاعات المنطقة الغربية',
        specialTarget: isSpecial,
        'سبيشال تارجت': isSpecial,
        'سبيشال_تارجت': isSpecial,
        'قطاع التنفيذ': site?.subSector || '',
        'الادارة العامة المنفذة': site?.generalAdmin || '',
        'ادارة التنفيذ': site?.competentAdmin || '',
        المحافظة: site?.governorate || 'الغربية',
        'المسار الداخلي': intVal,
        'المسار الداخلى': intVal,
        internalPath: intVal,
        'المسار الخارجي': extVal,
        externalPath: extVal,
        'موقف اللحامات': spliceVal,
        splicingStatus: spliceVal,
        'موقف التسليم': delVal,
        deliveryStatus: delVal,
        'التصنيف': clsVal,
        classification: clsVal,
        'تاريخ السداد والبدء في التنفيذ': pDate,
        'تاريخ السداد و البدء فى التنفيذ': pDate,
      }));
    }
    setStep('fill-form');
  };

  const handleInputChange = (field: keyof EtahaRecord, value: any) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      if (field === 'المسار الداخلى' || field === 'المسار الداخلي' || field === 'internalPath') {
        updated['المسار الداخلى'] = value;
        updated['المسار الداخلي'] = value;
        updated.internalPath = value;
      }
      if (field === 'المسار الخارجي' || field === 'externalPath') {
        updated['المسار الخارجي'] = value;
        updated.externalPath = value;
      }
      if (field === 'موقف اللحامات' || field === 'splicingStatus') {
        updated['موقف اللحامات'] = value;
        updated.splicingStatus = value;
      }
      if (field === 'موقف التسليم' || field === 'deliveryStatus') {
        updated['موقف التسليم'] = value;
        updated.deliveryStatus = value;
      }
      if (field === 'التصنيف' || field === 'classification') {
        updated['التصنيف'] = value;
        updated.classification = value;
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

  // Handler for delivery status changes
  const handleDeliveryChange = (newDel: string) => {
    handleInputChange('موقف التسليم', newDel);
    handleInputChange('deliveryStatus', newDel);
    if (newDel === 'تم التسليم') {
      if (isBothPathsCompleted) {
        handleInputChange('التصنيف', 'تم الانتهاء والتسليم');
        handleInputChange('classification', 'تم الانتهاء والتسليم');
      }
      const existingDelDate = formData['تاريخ التسليم'] || formData['تاريخ التسليم '] || formData.deliveryDate;
      if (!existingDelDate) {
        const today = new Date().toISOString().slice(0, 10);
        handleInputChange('تاريخ التسليم', today);
        handleInputChange('deliveryDate', today);
      }
    }
  };

  // Special handler for classification changes with conditional cleanup
  const handleClassificationChange = (newCls: string) => {
    handleInputChange('التصنيف', newCls);
    handleInputChange('classification', newCls);

    // Clear conditional errors when switching
    setErrors((prev) => {
      const next = { ...prev };
      delete next['التصنيف'];
      delete next['المستند'];
      delete next['سبب المعوق او التعذر'];
      return next;
    });

    if (newCls === 'تم الانتهاء والتسليم' || newCls === 'تم التسليم') {
      handleInputChange('موقف التسليم', 'تم التسليم');
      handleInputChange('deliveryStatus', 'تم التسليم');
      const existingDelDate = formData['تاريخ التسليم'] || formData['تاريخ التسليم '] || formData.deliveryDate;
      if (!existingDelDate) {
        const today = new Date().toISOString().slice(0, 10);
        handleInputChange('تاريخ التسليم', today);
        handleInputChange('deliveryDate', today);
      }
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
    } else if (cls === 'متعذر' || cls === 'متعذرات' || cls === 'تعذر' || cls.includes('تعذر') || cls.includes('متعذر')) {
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
      const cleanedData: EtahaRecord = { ...formData };
      const paymentDate = String(
        formData['تاريخ السداد والبدء في التنفيذ'] ||
        formData['تاريخ السداد و البدء فى التنفيذ'] ||
        ''
      ).trim();
      const isSpecial = Boolean(
        formData.specialTarget ||
        formData['سبيشال تارجت'] ||
        formData['سبيشال_تارجت']
      );

      const intVal = String(formData['المسار الداخلى'] || formData['المسار الداخلي'] || formData.internalPath || 'لم يتم').trim();
      let extVal = String(formData['المسار الخارجي'] || formData.externalPath || 'لم يتم البدء').trim();
      if (extVal === 'تعذر' || extVal === 'متعذرات' || extVal === 'متعذر') {
        extVal = 'متعذر';
      }
      const spliceVal = String(formData['موقف اللحامات'] || formData.splicingStatus || 'لم يتم البدء').trim();
      const delVal = String(formData['موقف التسليم'] || formData.deliveryStatus || 'لم يتم').trim();
      let clsVal = String(formData['التصنيف'] || formData.classification || 'جاري العمل').trim();
      if (clsVal === 'تعذر' || clsVal === 'متعذرات' || clsVal === 'متعذر' || clsVal.includes('تعذر')) {
        clsVal = 'متعذر';
      }
      const delDate = String(formData['تاريخ التسليم'] || formData['تاريخ التسليم '] || formData.deliveryDate || '').trim();

      const payload: EtahaRecord = {
        ...cleanedData,
        'المسار الداخلى': intVal,
        'المسار الداخلي': intVal,
        internalPath: intVal,
        'المسار الخارجي': extVal,
        externalPath: extVal,
        'موقف اللحامات': spliceVal,
        splicingStatus: spliceVal,
        'موقف التسليم': delVal,
        deliveryStatus: delVal,
        'التصنيف': clsVal,
        classification: clsVal,
        specialTarget: isSpecial,
        'سبيشال تارجت': isSpecial,
        'سبيشال_تارجت': isSpecial,
        'تاريخ السداد والبدء في التنفيذ': paymentDate,
        'تاريخ السداد و البدء فى التنفيذ': paymentDate,
        paymentAndStartDate: paymentDate,
        payment_and_start_date: paymentDate,
        'تاريخ التسليم': delDate || (delVal === 'تم التسليم' ? new Date().toISOString().slice(0, 10) : ''),
        deliveryDate: delDate || (delVal === 'تم التسليم' ? new Date().toISOString().slice(0, 10) : ''),
        delivery_date: delDate || (delVal === 'تم التسليم' ? new Date().toISOString().slice(0, 10) : ''),
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

  // Bulk Template Download
  const handleDownloadTemplate = async () => {
    try {
      setBulkDownloading(true);
      setBulkGeneralError('');
      const buffer = await generateEtahaBulkImportTemplate(sitesData || []);
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Availability_Etaha_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setBulkGeneralError(`فشل تنزيل النموذج: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setBulkDownloading(false);
    }
  };

  // Bulk File Upload & Validation
  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBulkUploading(true);
      setBulkGeneralError('');
      setBulkSuccessMsg('');
      setBulkReport(null);
      setBulkFileName(file.name);

      const arrayBuffer = await file.arrayBuffer();
      const valReport = await parseAndValidateEtahaBulkExcel(arrayBuffer, sitesData || []);
      setBulkReport(valReport);
    } catch (err: any) {
      setBulkGeneralError(`فشل قراءة وفحص الملف: ${err?.message || 'تأكد من اختيار ملف إكسيل معتمد'}`);
    } finally {
      setBulkUploading(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    }
  };

  // Bulk Execute Import
  const handleExecuteBulkImport = async () => {
    if (!bulkReport || bulkReport.recordsToImport.length === 0) return;
    try {
      setBulkImporting(true);
      setBulkGeneralError('');
      if (onBulkSave) {
        const res = await onBulkSave(bulkReport.recordsToImport);
        if (res.success) {
          setBulkSuccessMsg(`تم استيراد وحفظ ${res.savedCount || bulkReport.validRows} مشروع بنجاح في قاعدة بيانات Availability ✅`);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setBulkGeneralError(`فشل إتمام الحفظ: ${res.error || 'خطأ غير معروف'}`);
        }
      } else {
        // Fallback: save sequentially
        let saved = 0;
        for (const rec of bulkReport.recordsToImport) {
          const res = await onSave(rec);
          if (res.success) saved++;
        }
        setBulkSuccessMsg(`تم استيراد وحفظ ${saved} مشروع بنجاح في قاعدة بيانات Availability ✅`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setBulkGeneralError(`فشل استيراد وحفظ البيانات: ${err?.message || 'حدث خطأ غير متوقع'}`);
    } finally {
      setBulkImporting(false);
    }
  };

  // Filtered rows for Bulk Preview
  const filteredBulkRows = useMemo(() => {
    if (!bulkReport) return [];
    return bulkReport.rows.filter((r) => {
      if (bulkFilterStatus === 'valid' && r.validationErrors.length > 0) return false;
      if (bulkFilterStatus === 'errors' && r.validationErrors.length === 0) return false;

      if (bulkSearchQuery.trim()) {
        const q = bulkSearchQuery.toLowerCase();
        const matchesCode = (r.siteCode || '').toLowerCase().includes(q);
        const matchesClient = (r.clientName || '').toLowerCase().includes(q);
        const matchesBranch = (r.branchName || '').toLowerCase().includes(q);
        const matchesSector = (r.sector || '').toLowerCase().includes(q);
        const matchesCls = (r.classification || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesClient && !matchesBranch && !matchesSector && !matchesCls) {
          return false;
        }
      }
      return true;
    });
  }, [bulkReport, bulkFilterStatus, bulkSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-teal-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              {entryType === 'bulk' ? (
                <FileSpreadsheet className="w-6 h-6" />
              ) : activeMode === 'add' ? (
                <PlusCircle className="w-6 h-6" />
              ) : (
                <Edit3 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {entryType === 'bulk'
                    ? 'الاستيراد والرفع الجماعي لشيت إكسيل مشروعات الإتاحة (Bulk Excel Import)'
                    : activeMode === 'add'
                      ? 'إضافة مشروع إتاحة جديد (New Availability Project)'
                      : 'تعديل بيانات مشروع إتاحة (Edit Availability Project)'}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  Availability المعتمدة
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                {entryType === 'bulk'
                  ? 'تحميل النموذج الاسترشادي المعتمد • الفحص البرمجي • حماية الثوابت • تحديث الموقف التنفيذي وتاريخ السداد'
                  : 'إدخال وتحديث بيانات مشروعات الإتاحة مع القوائم المنسدلة المترابطة والتحقق الشرطي للمسارات والمستندات'}
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

            {/* Single mode sub-toggle: add vs edit (only in single entry mode) */}
            {entryType === 'single' && (
              <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('add');
                    setStep('fill-form');
                    setMasterRecord(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${activeMode === 'add'
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
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${activeMode === 'edit'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                    }`}
                >
                  تعديل مشروع
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Top Dual-Option Switcher (الإدخال اليدوي vs الرفع الجماعي) ── */}
        <div className="bg-slate-200/90 border-b border-slate-300 px-6 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEntryType('single')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${entryType === 'single'
                ? 'text-white bg-teal-700 border border-teal-600 shadow-sm ring-2 ring-teal-500/20'
                : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300'
                }`}
            >
              <span>✍️ الخيار الأول: إدخال مشروع فردي (Manual Entry)</span>
              {entryType === 'single' && (
                <span className="text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.2 rounded-full border border-teal-400/30">
                  مفعل حالياً
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setEntryType('bulk')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 group ${entryType === 'bulk'
                ? 'text-white bg-teal-700 border border-teal-600 shadow-sm ring-2 ring-teal-500/20 font-black'
                : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300'
                }`}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${entryType === 'bulk' ? 'text-teal-200' : 'text-teal-600 group-hover:scale-110'} transition-transform`} />
              <span>📤 الخيار الثاني: إدخال جماعي عبر إكسيل (Bulk Excel Import)</span>
              {entryType === 'bulk' && (
                <span className="text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.2 rounded-full border border-teal-400/30">
                  مفعل حالياً
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
            حماية الثوابت مقفلة برمجياً 🔒
          </span>
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
        {entryType === 'bulk' ? (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {bulkGeneralError && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{bulkGeneralError}</span>
              </div>
            )}

            {bulkSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {/* Guidelines Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lock className="w-4 h-4 text-teal-600" />
                  <span>حماية الثوابت الإلزامية لمشروعات الإتاحة:</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  الأعمدة الثابتة (كود المشروع، اسم العميل، الفرع، العنوان، القطاع، الإدارة العامة المنفذة، قطاع التنفيذ، المحافظة، أمر الخدمة) محمية ومؤمنة برمجياً.
                  التعديل متاح للموقف التنفيذي، التصنيف، سبب المعوقات، <strong className="text-teal-900 font-bold">تاريخ السداد والبدء في التنفيذ</strong>، وتاريخ الانتهاء والملاحظات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEntryType('single')}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>العودة للإدخال اليدوي</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Cards: Download Template & Upload File */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Download Template */}
              <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-teal-950 text-sm">
                    1. تحميل النموذج الاسترشادي المعتمد لمشروعات الإتاحة
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    تنزيل ملف إكسيل مجهز بمشروعات الإتاحة الحالية وقوائم الاختيار السريعة للحالات، شاملاً عمود <strong className="text-teal-800">تاريخ السداد والبدء في التنفيذ</strong> مع قفل الثوابت برمجياً.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={bulkDownloading}
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{bulkDownloading ? 'جارٍ إنشاء وتحميل النموذج...' : 'تحميل نموذج الإتاحة المعتمد (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: Upload File */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    2. رفع وفحص ملف الإكسيل المعبأ
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    يقوم النظام بالتحقق الآلي وتدقيق الأكواد، حماية الثوابت، تطابق التصنيفات، وصحة التواريخ قبل إتمام الحفظ والمزامنة السحابية.
                  </p>
                </div>

                <input
                  type="file"
                  ref={bulkFileInputRef}
                  onChange={handleBulkFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  disabled={bulkUploading}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{bulkUploading ? 'جارٍ قراءة وفحص الشيت...' : 'اختيار ورفع ملف الإكسيل'}</span>
                </button>
              </div>
            </div>

            {/* Validation Report & Summary */}
            {bulkReport && (
              <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in">
                {/* Header & Badges */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>تقرير فحص ملف: {bulkFileName}</span>
                  </h4>
                  <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                      الإجمالي: {bulkReport.totalRows} مشروع
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                      جاهز للحفظ: {bulkReport.validRows}
                    </span>
                    {bulkReport.tamperedRows > 0 && (
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                        ثوابت محمية مسترجعة: {bulkReport.tamperedRows}
                      </span>
                    )}
                    {bulkReport.invalidRows > 0 && (
                      <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-lg border border-red-200">
                        أخطاء: {bulkReport.invalidRows}
                      </span>
                    )}
                  </div>
                </div>

                {/* Warnings on Tampered Constants */}
                {bulkReport.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>تنبيهات حماية الثوابت (تم الحفاظ على البيانات الأساسية ومنع التعديل غير المصرح به):</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 text-amber-800 font-mono text-[11px]">
                      {bulkReport.warnings.map((w, idx) => (
                        <p key={idx}>• {w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors List */}
                {bulkReport.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-red-900 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>أخطاء يجب تصحيحها في الشيت:</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 text-red-800 font-mono text-[11px]">
                      {bulkReport.errors.map((e, idx) => (
                        <p key={idx}>• {e}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter and Search Bar for Preview */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBulkFilterStatus('all')}
                      className={`px-3 py-1 rounded-lg transition ${bulkFilterStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      الكل ({bulkReport.totalRows})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFilterStatus('valid')}
                      className={`px-3 py-1 rounded-lg transition ${bulkFilterStatus === 'valid'
                        ? 'bg-emerald-600 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      الجاهز فقط ({bulkReport.validRows})
                    </button>
                    {bulkReport.invalidRows > 0 && (
                      <button
                        type="button"
                        onClick={() => setBulkFilterStatus('errors')}
                        className={`px-3 py-1 rounded-lg transition ${bulkFilterStatus === 'errors'
                          ? 'bg-red-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        الأخطاء ({bulkReport.invalidRows})
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bulkSearchQuery}
                      onChange={(e) => setBulkSearchQuery(e.target.value)}
                      placeholder="بحث في نتائج الفحص..."
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Interactive Preview Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto text-xs bg-white shadow-2xs">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 shadow-2xs">
                      <tr>
                        <th className="p-2.5 border-b">كود المشروع</th>
                        <th className="p-2.5 border-b">اسم العميل / المشروع</th>
                        <th className="p-2.5 border-b">الفرع</th>
                        <th className="p-2.5 border-b">القطاع</th>
                        <th className="p-2.5 border-b">المحافظة</th>
                        <th className="p-2.5 border-b">تاريخ السداد والبدء</th>
                        <th className="p-2.5 border-b">التصنيف</th>
                        <th className="p-2.5 border-b text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBulkRows.slice(0, 50).map((r, idx) => (
                        <tr key={idx} className={r.validationErrors.length > 0 ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/80'}>
                          <td className="p-2.5 font-mono font-bold text-teal-800">{r.siteCode}</td>
                          <td className="p-2.5 font-bold text-slate-800">{r.clientName}</td>
                          <td className="p-2.5 text-slate-600">{r.branchName || '—'}</td>
                          <td className="p-2.5 text-slate-600">{r.sector || '—'}</td>
                          <td className="p-2.5 text-slate-600">{r.governorate || '—'}</td>
                          <td className="p-2.5 font-mono text-[11px] text-teal-900 font-bold">{r.startDate || '—'}</td>
                          <td className="p-2.5 font-bold text-emerald-700">{r.classification}</td>
                          <td className="p-2.5 text-center">
                            {r.validationErrors.length > 0 ? (
                              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                خطأ ({r.validationErrors.join(', ')})
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> جاهز
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    {bulkReport.validRows > 0
                      ? `سيتم استيراد وتحديث ${bulkReport.validRows} مشروع في قاعدة بيانات Availability سحابياً.`
                      : 'لا توجد أسطر صالحة للاستيراد حالياً.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    disabled={bulkImporting || bulkReport.validRows === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4 text-teal-200" />
                    <span>{bulkImporting ? 'جارٍ الاستيراد والحفظ...' : `تأكيد استيراد وحفظ (${bulkReport.validRows}) مشروع`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
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
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dir-ltr ${errors.Code ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
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
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${errors['اسم العميل'] ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
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

                    {/* تاريخ السداد والبدء في التنفيذ */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>تاريخ السداد والبدء في التنفيذ</span>
                      </label>
                      <input
                        type="date"
                        value={parseToDateInputValue(formData['تاريخ السداد والبدء في التنفيذ'] || formData['تاريخ السداد و البدء فى التنفيذ'])}
                        onChange={(e) => {
                          handleInputChange('تاريخ السداد والبدء في التنفيذ', e.target.value);
                          handleInputChange('تاريخ السداد و البدء فى التنفيذ', e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
                      />
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

                    {/* Special Target Checkbox */}
                    <div className="sm:col-span-3">
                      <label className="flex items-center gap-2.5 p-3 bg-amber-50/80 hover:bg-amber-100/70 border-2 border-amber-300/80 rounded-xl cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.specialTarget || formData['سبيشال تارجت'] || formData['سبيشال_تارجت'])}
                          onChange={(e) => {
                            handleInputChange('specialTarget', e.target.checked);
                            handleInputChange('سبيشال تارجت', e.target.checked);
                            handleInputChange('سبيشال_تارجت', e.target.checked);
                          }}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                            <span>⭐</span>
                            <span>Special Target</span>
                          </span>
                          <span className="text-[11px] text-amber-700 font-semibold">
                            - تحديد هذا المشروع كهدف ذو أولوية خاصة واستراتيجية
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* القسم الثاني: النطاق الإداري والتنفيذي */}
                {/* قوائم اختيار منسدلة مترابطة (Cascading Dropdowns) */}
                {/* 1) القطاعات */}
                {/* 2) قطاع التنفيذ */}
                {/* 3) الإدارة العامة للتنفيذ */}
                {/* 4) إدارة التنفيذ المختصة */}
                {/* ============================================================== */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      القسم الثاني - النطاق الإداري والتنفيذي (Cascading Dropdowns)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. القطاعات */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1) رئاسة القطاعات / القطاعات <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.القطاعات || 'المناطق الشرقية'}
                        onChange={(e) => handleSectorChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                      >
                        {APPROVED_SECTORS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. قطاع التنفيذ (Dropdown) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2) قطاع التنفيذ
                      </label>
                      <select
                        value={formData['قطاع التنفيذ'] || ''}
                        onChange={(e) => handleExecSectorChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-teal-300/80 rounded-xl text-xs font-bold text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                      >
                        <option value="">-- اختر قطاع التنفيذ --</option>
                        {availableExecSectors.map((es) => (
                          <option key={es} value={es}>
                            {es}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. الإدارة العامة للتنفيذ (Cascading Dropdown) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          3) الإدارة العامة للتنفيذ
                        </label>
                        {formData['قطاع التنفيذ'] && (
                          <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                            مفلترة لـ: {formData['قطاع التنفيذ']}
                          </span>
                        )}
                      </div>
                      <select
                        value={formData['الادارة العامة المنفذة'] || ''}
                        onChange={(e) => handleGeneralAdminChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-teal-300/80 rounded-xl text-xs font-bold text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                      >
                        <option value="">
                          {formData['قطاع التنفيذ']
                            ? '-- اختر الإدارة العامة للتنفيذ --'
                            : '-- اختر قطاع التنفيذ أولاً أو حدد الإدارة --'}
                        </option>
                        {availableGeneralAdmins.map((ga) => (
                          <option key={ga} value={ga}>
                            {ga}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. إدارة التنفيذ المختصة (Cascading Dropdown) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          4) إدارة التنفيذ المختصة
                        </label>
                        {formData['الادارة العامة المنفذة'] && (
                          <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                            مفلترة لـ: {formData['الادارة العامة المنفذة']}
                          </span>
                        )}
                      </div>
                      <select
                        value={formData['ادارة التنفيذ'] || ''}
                        onChange={(e) => handleCompetentAdminChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-teal-300/80 rounded-xl text-xs font-bold text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                      >
                        <option value="">
                          {formData['الادارة العامة المنفذة']
                            ? '-- اختر إدارة التنفيذ المختصة --'
                            : '-- اختر الإدارة العامة أولاً أو حدد الإدارة المختصة --'}
                        </option>
                        {availableCompetentAdmins.map((ca) => (
                          <option key={ca} value={ca}>
                            {ca}
                          </option>
                        ))}
                      </select>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {/* المسار الداخلي */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المسار الداخلي
                      </label>
                      <select
                        value={formData['المسار الداخلى'] || formData['المسار الداخلي'] || 'لم يتم'}
                        onChange={(e) => handleInputChange('المسار الداخلى', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${isInternalDone
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
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${isExternalDone
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

                    {/* موقف التسليم */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        موقف التسليم
                      </label>
                      <select
                        value={formData['موقف التسليم'] || 'لم يتم'}
                        onChange={(e) => handleDeliveryChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${formData['موقف التسليم'] === 'تم التسليم'
                            ? 'bg-purple-50 border-purple-300 text-purple-900 font-black'
                            : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                      >
                        {APPROVED_DELIVERY_STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* تاريخ التسليم / الانتهاء والتشغيل */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <CalendarCheck2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>تاريخ التسليم</span>
                      </label>
                      <input
                        type="date"
                        value={parseToDateInputValue(formData['تاريخ التسليم'] || formData['تاريخ التسليم '] || formData.deliveryDate)}
                        onChange={(e) => {
                          handleInputChange('تاريخ التسليم', e.target.value);
                          handleInputChange('deliveryDate', e.target.value);
                        }}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 ${formData['موقف التسليم'] === 'تم التسليم'
                            ? 'bg-purple-50/60 border-purple-300 text-purple-950 ring-1 ring-purple-200'
                            : 'bg-slate-50 border-slate-300'
                          }`}
                      />
                    </div>

                    {/* التصنيف العام / النهائي */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        التصنيف العام / النهائي <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData['التصنيف'] || 'جاري العمل'}
                        onChange={(e) => handleClassificationChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${isDeliverySelected
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
                              className={`p-3 rounded-xl border flex items-center justify-between ${isInternalDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                                }`}
                            >
                              <span>المسار الداخلي:</span>
                              <span className="font-mono">{internalRoute || 'غير محدد'}</span>
                              <span>{isInternalDone ? '✅ مكتمل' : '❌ غير مكتمل'}</span>
                            </div>
                            <div
                              className={`p-3 rounded-xl border flex items-center justify-between ${isExternalDone
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
                                className={`border-2 border-dashed p-4 rounded-xl text-center cursor-pointer transition bg-white ${errors.المستند ? 'border-rose-400 bg-rose-50/50' : 'border-emerald-300 hover:border-emerald-500'
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
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${errors['سبب المعوق او التعذر'] ? 'border-rose-400 bg-rose-50' : 'border-amber-300'
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

                  {/* ── الحالة 3: تم اختيار "متعذر" ── */}
                  {isStalled && (
                    <div className="space-y-3 p-4 bg-rose-50/70 border border-rose-300 rounded-2xl animate-in fade-in">
                      <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
                        <AlertCircle className="w-4 h-4 text-rose-700" />
                        <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                          قسم المتعذر والتواريخ والملاحظات (Stalled Reasons & Dates)
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
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${errors['سبب المعوق او التعذر'] ? 'border-rose-400 bg-rose-50' : 'border-rose-300'
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
        )}
      </div>
    </div>
  );
};
