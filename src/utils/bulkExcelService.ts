import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { SiteRecord } from '../types/dashboard';
import type { WeRecord } from '../config/fieldConfig';
import { normalizeStatus } from './excelParser';
import { isRecordInSector } from './sectorPermissions';
import { saveRecord } from '../hooks/useWeAPI';

// ── Column Definitions ──
export interface BulkExcelRow {
  rowNumber: number;
  siteCode: string;
  siteName: string;
  company: string;
  sector: string;
  central: string;
  generalAdmin: string;
  competentAdmin: string;
  siteType: string;
  civilContractor: string;
  planYear: string;
  classification: string;
  siteStatus: string;
  progressPercent: number;
  obstacleReason: string;
  supportRequired: string;
  costExpected?: string;
  distanceKm?: string;
  expectedDate: string;
  actualDate: string;
  notes: string;
  documentRef?: string;
}

export type RowValidationStatus = 'VALID' | 'WARNING_TAMPER' | 'ERROR';

export interface RowValidationResult {
  rowNumber: number;
  raw: Record<string, any>;
  data: BulkExcelRow;
  status: RowValidationStatus;
  errors: string[];
  warnings: string[];
  tamperedFields: { field: string; baselineValue: string; uploadedValue: string }[];
  sanitizedRecord?: WeRecord;
}

export interface BulkValidationSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  results: RowValidationResult[];
  readyToImportCount: number;
}

// ── Dropdown Choices Reference Lists ──
export const OFFICIAL_CLASSIFICATIONS = [
  'تم الانتهاء',
  'تم التشغيل فايبر',
  'جاري العمل مدني',
  'جاري العمل كهربى',
  'جاري المعاينة',
  'جاري تصاريح',
  'متعذر',
  'معوقات',
];

export const OFFICIAL_SITE_STATUSES = [
  'تم التشغيل',
  'ON AIR',
  'تم الانتهاء',
  'جاري العمل مدني',
  'جاري العمل كهربى',
  'جاري المعاينة',
  'جاري تصاريح',
  'متعذر',
  'معوقات',
];

export const OFFICIAL_OBSTACLE_REASONS = [
  'لا يوجد تعذر',
  'ارتفاع التكلفة',
  'التصاريح',
  'عدم إمكانية',
  'تصاريح مرور',
  'تصاريح سكة حديد',
  'تعارض مسار مع مرافق',
  'اعتراضات أهالي',
  'أخرى',
];

export const OFFICIAL_SUPPORT_ENTITIES = [
  'لا يوجد',
  'الجهاز القومي لتنظيم الاتصالات NTRA',
  'وزارة النقل / الطرق والكباري',
  'حي / مجلس مدينة',
  'إدارة المرور',
  'الشركة المصرية لنقل الكهرباء',
  'الهيئة العامة للطرق والكباري',
  'السكك الحديدية',
  'جهة أمنية / شرطة',
  'المحافظة',
];

// ── 1. Generate & Download Template with Native Dropdowns & Protected Cells ──
export async function generateBulkImportTemplate(
  baselineSites: SiteRecord[],
  mode: 'with-data' | 'blank' = 'with-data'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FTTS Fiber Tracking Dashboard';
  wb.created = new Date();

  // ── Sheet 1: بيانات المواقع الميدانية ──
  const ws = wb.addWorksheet('بيانات المواقع الميدانية', {
    views: [{ rightToLeft: true }],
  });

  // Group Headers (Row 1)
  ws.mergeCells('A1:J1');
  const group1 = ws.getCell('A1');
  group1.value = '🔒 الثوابت المقفلة والمحمية برمجياً - يمنع تعديلها من قبل القطاع (READ-ONLY)';
  group1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };
  group1.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('K1:M1');
  const group2 = ws.getCell('K1');
  group2.value = '✏️ الموقف التنفيذي والتصنيف (EDITABLE)';
  group2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4338CA' }, // Indigo
  };
  group2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('N1:Q1');
  const group3 = ws.getCell('N1');
  group3.value = '⚠️ تفاصيل التعذر الميداني المفتوحة للتعديل عند تصنيف متعذر أو معوقات (STALL DETAILS)';
  group3.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB91C1C' }, // Crimson / Rose
  };
  group3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group3.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('R1:U1');
  const group4 = ws.getCell('R1');
  group4.value = '📅 التواريخ والملاحظات والمستندات (DATES & NOTES)';
  group4.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF047857' }, // Emerald green
  };
  group4.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getRow(1).height = 28;

  // Sub-headers (Row 2)
  const headers = [
    'كود الموقع [ثابت مقفل]',                         // A (1)
    'قطاع التنفيذ [ثابت مقفل]',                       // B (2)
    'قطاع المناطق [ثابت مقفل]',                        // C (3)
    'إدارة الشبكات [ثابت مقفل]',                       // D (4)
    'مسؤول التنفيذ [ثابت مقفل]',                       // E (5)
    'النوع [ثابت مقفل]',                              // F (6)
    'الخطة [ثابت مقفل]',                             // G (7)
    'السنترال [ثابت مقفل]',                          // H (8)
    'إدارة التنفيذ المختصة [ثابت مقفل]',                // I (9)
    'المشغل [ثابت مقفل]',                            // J (10)
    'حالة الموقع الميدانية [تعديل]',                  // K (11) - Dropdown
    'التصنيف [مطلوب - قائمة منسدلة] [تعديل]',         // L (12) - Dropdown
    'نسبة الإنجاز % [تعديل]',                        // M (13)
    'أسباب التعذر أو المعوقات [تعديل عند التعذر]',       // N (14) - Dropdown
    'الجهة المطلوب الدعم منها [تعديل]',                // O (15) - Dropdown
    'التكلفة المتوقعة ج.م [تعديل]',                    // P (16)
    'المسافة كم [تعديل]',                            // Q (17)
    'التاريخ المتوقع للانتهاء [تعديل]',                // R (18)
    'التاريخ الفعلي للانتهاء [تعديل]',                 // S (19)
    'الملاحظات وتفاصيل التعذر [تعديل]',               // T (20)
    'مرجع محضر الاستلام أو المستند [تعديل]',           // U (21)
  ];

  const subHeaderRow = ws.getRow(2);
  headers.forEach((h, idx) => {
    const cell = subHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx < 10 ? 'FFE2E8F0' : 'FFF1F5F9' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  subHeaderRow.height = 34;

  // Set column widths
  const colWidths = [18, 24, 20, 32, 22, 16, 14, 20, 26, 14, 22, 28, 16, 30, 28, 22, 16, 20, 20, 38, 26];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  // Dropdown formulae strings
  const classificationListFormula = `"${OFFICIAL_CLASSIFICATIONS.join(',')}"`;
  const siteStatusListFormula = `"${OFFICIAL_SITE_STATUSES.join(',')}"`;
  const obstacleReasonsListFormula = `"${OFFICIAL_OBSTACLE_REASONS.join(',')}"`;
  const supportEntitiesListFormula = `"${OFFICIAL_SUPPORT_ENTITIES.join(',')}"`;

  // Populate data rows
  const sitesToOutput = mode === 'with-data' && baselineSites.length > 0 ? baselineSites : [];

  if (sitesToOutput.length > 0) {
    sitesToOutput.forEach((site, rowIdx) => {
      const rowNumber = rowIdx + 3;
      const row = ws.getRow(rowNumber);
      const planYear = site.expectedDate ? site.expectedDate.slice(0, 4) : '2026';

      row.values = [
        site.siteCode || '',                                                                  // A
        site.sector || '',                                                                    // B
        site.central || site.competentAdmin || '',                                            // C
        site.generalAdmin || 'الإدارة العامة لتنفيذ الشبكات',                                    // D
        site.civilContractor || 'المصرية للاتصالات',                                          // E
        site.classification || 'FTTS Rollout',                                                // F
        planYear,                                                                             // G
        site.central || '',                                                                   // H
        site.competentAdmin || 'إدارة التنفيذ والمسارات',                                       // I
        site.company || 'WE',                                                                 // J
        site.status || 'جاري المعاينة',                                                       // K
        site.classification || 'جاري المعاينة',                                               // L
        site.progressPercent || (site.status === 'تم التسليم' || site.status === 'تم الانتهاء' ? 100 : 0), // M
        site.obstacleReason || 'لا يوجد تعذر',                                                // N
        '',                                                                                   // O
        '',                                                                                   // P
        '',                                                                                   // Q
        site.expectedDate || '2026-12-31',                                                    // R
        site.status === 'تم التسليم' || site.status === 'تم الانتهاء' ? (site.expectedDate || '2026-10-30') : '', // S
        site.notes || '',                                                                     // T
        '',                                                                                   // U
      ];

      // Format & Protect cells
      for (let colIdx = 1; colIdx <= 21; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.alignment = { horizontal: colIdx === 1 ? 'center' : 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 10 };

        // Constants (A-J): Locked & subtle shading
        if (colIdx <= 10) {
          cell.protection = { locked: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
          cell.font = { name: 'Calibri', size: 10, bold: colIdx === 1, color: { argb: 'FF334155' } };
        } else {
          // Editable (K-U): Unlocked
          cell.protection = { locked: false };
        }

        cell.border = {
          top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      // Add Data Validations (Dropdown Lists)
      row.getCell(11).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [siteStatusListFormula],
        showErrorMessage: true,
        errorTitle: 'حالة غير صحيحة',
        error: 'يرجى اختيار حالة معتمدة من القائمة المنسدلة فقط',
      };

      row.getCell(12).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [classificationListFormula],
        showErrorMessage: true,
        errorTitle: 'تصنيف غير صحيح',
        error: 'يرجى اختيار تصنيف معتمد من القائمة المنسدلة فقط (مثل: تم الانتهاء، متعذر، معوقات...)',
      };

      row.getCell(14).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [obstacleReasonsListFormula],
        showErrorMessage: true,
        errorTitle: 'سبب تعذر غير صحيح',
        error: 'يرجى اختيار سبب تعذر معتمد من القائمة المنسدلة',
      };

      row.getCell(15).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [supportEntitiesListFormula],
        showErrorMessage: true,
        errorTitle: 'جهة دعم غير صحيحة',
        error: 'يرجى اختيار جهة دعم معتمدة من القائمة المنسدلة',
      };
    });
  } else {
    // Blank template sample rows
    for (let i = 1; i <= 3; i++) {
      const rowNumber = i + 2;
      const row = ws.getRow(rowNumber);
      row.values = [
        `WE_SITE_00${i}`,
        'قطاع مناطق القاهرة الكبرى',
        'مدينة نصر 1',
        'الادارة العامة الاولى لتنفيذ شبكات القاهرة',
        'المصرية للاتصالات',
        'FTTS',
        '2026',
        'مدينة نصر',
        'مناطق شرق القاهره',
        'WE',
        'جاري العمل مدني',
        'جاري العمل مدني',
        40,
        'لا يوجد تعذر',
        'لا يوجد',
        '',
        '',
        '2026-12-31',
        '',
        'ملاحظات العمل الميداني...',
        '',
      ];

      for (let colIdx = 1; colIdx <= 21; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.protection = { locked: colIdx <= 10 };
        cell.font = { name: 'Calibri', size: 10 };
      }

      row.getCell(11).dataValidation = { type: 'list', allowBlank: true, formulae: [siteStatusListFormula] };
      row.getCell(12).dataValidation = { type: 'list', allowBlank: false, formulae: [classificationListFormula] };
      row.getCell(14).dataValidation = { type: 'list', allowBlank: true, formulae: [obstacleReasonsListFormula] };
      row.getCell(15).dataValidation = { type: 'list', allowBlank: true, formulae: [supportEntitiesListFormula] };
    }
  }

  // Worksheet Protection: Protect locked constant cells (Cols A-J) while allowing editing in unlocked cells (Cols K-U)
  await ws.protect('ftts-admin-lock', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
  });

  // ── Sheet 2: قوائم الاختيارات والتعليمات ──
  const wsRef = wb.addWorksheet('قوائم الاختيارات والتعليمات', {
    views: [{ rightToLeft: true }],
  });

  wsRef.mergeCells('A1:D1');
  const refHeader = wsRef.getCell('A1');
  refHeader.value = 'قوائم الاختيارات الرسمية المعتمدة لنظام متابعة الفايبر (FTTS Data Reference)';
  refHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  refHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  refHeader.alignment = { horizontal: 'center', vertical: 'middle' };

  const refSubHeaders = [
    'التصنيفات المعتمدة (Classification)',
    'حالات الموقع الميدانية (Site Status)',
    'أسباب التعذر المعتمدة (Obstacle Reasons)',
    'الجهات المطلوب الدعم منها (Support Required)',
  ];
  const refSubRow = wsRef.getRow(2);
  refSubHeaders.forEach((sh, idx) => {
    const c = refSubRow.getCell(idx + 1);
    c.value = sh;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  });

  const maxOpts = Math.max(
    OFFICIAL_CLASSIFICATIONS.length,
    OFFICIAL_SITE_STATUSES.length,
    OFFICIAL_OBSTACLE_REASONS.length,
    OFFICIAL_SUPPORT_ENTITIES.length
  );

  for (let i = 0; i < maxOpts; i++) {
    const r = wsRef.getRow(i + 3);
    r.values = [
      OFFICIAL_CLASSIFICATIONS[i] || '',
      OFFICIAL_SITE_STATUSES[i] || '',
      OFFICIAL_OBSTACLE_REASONS[i] || '',
      OFFICIAL_SUPPORT_ENTITIES[i] || '',
    ];
  }

  wsRef.columns = [{ width: 32 }, { width: 30 }, { width: 36 }, { width: 38 }];

  // Write Excel file buffer & trigger client-side download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const fileName =
    mode === 'with-data'
      ? `FTTS_Mobile_Sites_Template_${new Date().toISOString().slice(0, 10)}.xlsx`
      : 'FTTS_Bulk_Import_Blank_Template.xlsx';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Smart column matcher ──
function cleanStr(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.\\[\]()]/g, '');
}

function getCellValue(row: Record<string, any>, candidateNames: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidateNames) {
    const cleanCand = cleanStr(cand);
    const matchedKey = keys.find((k) => cleanStr(k) === cleanCand || cleanStr(k).includes(cleanCand));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }
  return '';
}

// ── 2. Parse & Validate Uploaded Excel ──
export function parseAndValidateBulkExcel(
  fileBuffer: ArrayBuffer,
  baselineSites: SiteRecord[],
  userSector?: string,
  isAdmin: boolean = false
): BulkValidationSummary {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  // Convert to array of arrays to inspect header rows
  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

  if (rawMatrix.length < 2) {
    throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات.');
  }

  // Detect header row: row 0 might be group title (e.g. Read-Only / Editable), row 1 column names
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawMatrix.length, 5); i++) {
    const row = rawMatrix[i] || [];
    const text = row.map(cleanStr).join(' ');
    if (text.includes('كود') || text.includes('sitecode') || text.includes('موقع')) {
      headerRowIndex = i;
      break;
    }
  }

  // Parse JSON using detected header row
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    range: headerRowIndex,
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('لم يتم العثور على سجلات صالحة في ملف الإكسيل.');
  }

  // Build lookup index of baseline sites by siteCode (case-insensitive)
  const baselineMap = new Map<string, SiteRecord>();
  baselineSites.forEach((s) => {
    if (s?.siteCode) {
      baselineMap.set(String(s.siteCode).trim().toLowerCase(), s);
    }
  });

  const results: RowValidationResult[] = [];
  const seenCodes = new Set<string>();

  rawRows.forEach((row, idx) => {
    const rowNumber = headerRowIndex + idx + 2; // 1-based row number in Excel

    const siteCode = getCellValue(row, ['site code', 'sitecode', 'كود الموقع', 'كود', 'code', 'site']);
    const siteName = getCellValue(row, ['اسم الموقع', 'sitename', 'اسم', 'الموقع']);
    const company = getCellValue(row, ['المشغل', 'company', 'الشركة', 'operator']) || 'WE';
    const sector = getCellValue(row, ['رئاسة قطاعات التنفيذ', 'رئاسة القطاعات', 'القطاع', 'قطاع التنفيذ', 'sector', 'القطاع التنفيذي', 'exc sector']);
    const central = getCellValue(row, ['سنترال الربط', 'السنترال', 'central']);
    const generalAdmin = getCellValue(row, [
      'الادارة العامة لتنفيذ الشبكات',
      'الإدارة العامة لتنفيذ الشبكات',
      'الادارة العامة للمنطقة',
      'الإدارة العامة',
      'generaladmin',
      'exc zone',
    ]);
    const competentAdmin = getCellValue(row, [
      'ادارة التنفيذ الفرعية',
      'إدارة التنفيذ الفرعية',
      'إدارة التنفيذ المختصة',
      'ادارة التنفيذ المختصة',
      'اداره التنفيذ المختصه',
      'competentadmin',
      'zone',
    ]);
    const siteType = getCellValue(row, ['النوع', 'النوع / المشروع', 'type', 'تصنيف', 'classification']) || 'FTTS';
    const civilContractor = getCellValue(row, ['مسئولية التنفيذ', 'مسؤولية التنفيذ', 'المسئولية', 'contractor', 'مقاول']) || 'المصرية للاتصالات';
    const planYear = getCellValue(row, ['سنة الخطة', 'خطة', 'plan', 'year']) || '2026';

    // Editable fields
    const classification = getCellValue(row, ['التصنيف', 'classification', 'نوع النشاط']) || 'جاري المعاينة';
    const rawStatus = getCellValue(row, ['حالة الموقع', 'حالة الموقع الميدانية', 'sitestatus', 'الموقف التنفيذي', 'status', 'الحالة']);
    const obstacleReason = getCellValue(row, ['اسباب التعّذر', 'أسباب التعذر أو المعوقات', 'اسباب التعذر', 'سبب التعذر', 'معوقات', 'obstaclereason']);
    const supportRequired = getCellValue(row, ['الجهة المطلوب الدعم منها', 'الدعم المطلوب', 'support']);
    const rawProgress = getCellValue(row, ['نسبة الإنجاز %', 'نسبة الإنجاز', 'الانجاز', 'progress']);
    const expectedDate = getCellValue(row, ['التاريخ المتوقع للانتهاء', 'التاريخ المتوقع', 'expecteddate', 'duedate']);
    const actualDate = getCellValue(row, ['التاريخ الفعلي للانتهاء', 'التاريخ الفعلي', 'actualdate']);
    const notes = getCellValue(row, ['الملاحظات', 'الملاحظات الميدانية', 'ملاحظات', 'notes', 'comments']);
    const documentRef = getCellValue(row, ['مرجع محضر الاستلام أو المستند', 'مرجع المستند', 'المستند', 'docref']);

    // Skip totally empty rows
    if (!siteCode && !siteName && !rawStatus && !classification) {
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const tamperedFields: { field: string; baselineValue: string; uploadedValue: string }[] = [];

    // Parse progress percentage
    let progressPercent = 0;
    if (rawProgress) {
      const num = parseFloat(rawProgress.replace(/%/g, '').trim());
      if (!isNaN(num)) {
        progressPercent = Math.min(100, Math.max(0, num));
      } else {
        warnings.push('قيمة نسبة الإنجاز غير رقمية، تم تعيينها تلقائياً.');
      }
    }

    // 1. Validate Site Code presence
    if (!siteCode) {
      errors.push('كود الموقع فارغ في هذا الصف (مطلوب للربط مع قاعدة البيانات).');
    }

    // 2. Duplicate check within the same sheet
    const cleanCode = String(siteCode || '').toLowerCase();
    if (seenCodes.has(cleanCode)) {
      warnings.push(`كود الموقع (${siteCode}) مكرر أكثر من مرة في نفس الملف.`);
    } else {
      seenCodes.add(cleanCode);
    }

    // 3. Lookup in baseline records
    const baseline = baselineMap.get(cleanCode);
    if (!baseline && siteCode) {
      // New site to be inserted
      if (!isAdmin && userSector && userSector !== 'ALL') {
        if (sector && cleanStr(sector) !== cleanStr(userSector)) {
          errors.push(`غير مصرح بإضافة موقع جديد خارج قطاعك المصرح به (${userSector}).`);
        }
      }
    }

    // 4. Sector Access Permission check (RBAC)
    if (baseline && !isAdmin && userSector && userSector !== 'ALL') {
      const hasPermission = isRecordInSector(userSector, baseline);
      if (!hasPermission) {
        errors.push(`ليس لديك صلاحية لتحديث مواقع خارج قطاعك المصرح به (${userSector}).`);
      }
    }

    // 5. Read-Only / Constant Fields Tamper Detection & Security Enforcement!
    if (baseline) {
      if (sector && cleanStr(sector) !== cleanStr(baseline.sector)) {
        tamperedFields.push({
          field: 'القطاع (Sector)',
          baselineValue: baseline.sector,
          uploadedValue: sector,
        });
      }
      if (central && cleanStr(central) !== cleanStr(baseline.central)) {
        tamperedFields.push({
          field: 'السنترال (Central)',
          baselineValue: baseline.central,
          uploadedValue: central,
        });
      }
      if (generalAdmin && cleanStr(generalAdmin) !== cleanStr(baseline.generalAdmin)) {
        tamperedFields.push({
          field: 'الإدارة العامة لتنفيذ الشبكات (General Admin)',
          baselineValue: baseline.generalAdmin,
          uploadedValue: generalAdmin,
        });
      }
      if (competentAdmin && cleanStr(competentAdmin) !== cleanStr(baseline.competentAdmin)) {
        tamperedFields.push({
          field: 'إدارة التنفيذ المختصة (Competent Admin)',
          baselineValue: baseline.competentAdmin,
          uploadedValue: competentAdmin,
        });
      }
      if (company && cleanStr(company) !== cleanStr(baseline.company)) {
        tamperedFields.push({
          field: 'المشغل (Company)',
          baselineValue: baseline.company,
          uploadedValue: company,
        });
      }
      if (civilContractor && cleanStr(civilContractor) !== cleanStr(baseline.civilContractor)) {
        tamperedFields.push({
          field: 'مسؤولية التنفيذ (Contractor)',
          baselineValue: baseline.civilContractor || 'المصرية للاتصالات',
          uploadedValue: civilContractor,
        });
      }
    }

    if (tamperedFields.length > 0) {
      warnings.push(
        `تم رصد محاولة تعديل حقول ثابتة مقفلة (${tamperedFields.map((t) => t.field).join('، ')}). تم حجب التعديل برمجياً والاحتفاظ بالبيانات الأصلية المعتمدة.`
      );
    }

    // 6. Validate Operational Status & Classification
    const normalizedSiteStatus = rawStatus ? normalizeStatus(rawStatus) : (baseline?.status || 'جاري المعاينة');
    if (!rawStatus && !classification) {
      warnings.push('حالة الموقع والتصنيف لم يُحددا، تم الإبقاء على الحالة السابقة.');
    }

    // 7. Validate Obstacles
    if (
      (normalizedSiteStatus === 'معوقات' || normalizedSiteStatus === 'متعذر' || normalizedSiteStatus === 'متعثرات' || classification === 'متعذر' || classification === 'معوقات') &&
      !obstacleReason &&
      !notes
    ) {
      warnings.push('تم تحديد حالة معوقات/تعذر بدون ذكر سبب التعذر أو الملاحظات.');
    }

    // Auto adjust progress for finished sites
    if ((normalizedSiteStatus === 'تم التسليم' || classification === 'تم الانتهاء' || classification === 'تم التشغيل فايبر') && progressPercent < 100) {
      progressPercent = 100;
    }

    // Determine row status
    let status: RowValidationStatus = 'VALID';
    if (errors.length > 0) {
      status = 'ERROR';
    } else if (tamperedFields.length > 0 || warnings.length > 0) {
      status = 'WARNING_TAMPER';
    }

    // Create sanitized record ready for save (strictly preserving baseline constants)
    const sanitizedRecord: WeRecord = {
      'site code': siteCode || baseline?.siteCode || '',
      'Exc sector': baseline?.sector || sector,
      'Sectores': baseline?.sector || sector,
      'Sectore': baseline?.sector || sector,
      'السنترال': baseline?.central || central,
      'الادارة العامة لتنفيذ الشبكات': baseline?.generalAdmin || generalAdmin,
      'اداره التنفيذ المختصه': baseline?.competentAdmin || competentAdmin,
      'Zone': baseline?.competentAdmin || competentAdmin,
      'Exc Zone': baseline?.generalAdmin || generalAdmin,
      'المسئولية': baseline?.civilContractor || civilContractor || 'المصرية للاتصالات',
      'خطة': baseline?.expectedDate ? baseline.expectedDate.slice(0, 4) : planYear,
      'Type': baseline?.classification || siteType || 'FTTS',
      'Site Status': normalizedSiteStatus === 'تم التسليم' ? 'ON AIR' : normalizedSiteStatus,
      'التصنيف': classification,
      'اسباب التعذر': obstacleReason || baseline?.obstacleReason || '',
      'الجهة المطلوب الدعم منها': supportRequired || '',
      'نسبة الإنجاز %': progressPercent,
      'التاريخ المتوقع للانتهاء': expectedDate || baseline?.expectedDate || '',
      'التاريخ الفعلى للانتهاء': actualDate || '',
      'الملاحظات': notes || baseline?.notes || '',
      'مرجع_المستند': documentRef || '',
      _id: baseline?.id,
    };

    results.push({
      rowNumber,
      raw: row,
      data: {
        rowNumber,
        siteCode,
        siteName: baseline?.siteName || siteName,
        company: baseline?.company || company,
        sector: baseline?.sector || sector,
        central: baseline?.central || central,
        generalAdmin: baseline?.generalAdmin || generalAdmin,
        competentAdmin: baseline?.competentAdmin || competentAdmin,
        siteType: baseline?.classification || siteType,
        civilContractor: baseline?.civilContractor || civilContractor,
        planYear: baseline?.expectedDate ? baseline.expectedDate.slice(0, 4) : planYear,
        siteStatus: normalizedSiteStatus,
        classification,
        obstacleReason,
        supportRequired,
        progressPercent,
        expectedDate,
        actualDate,
        notes,
        documentRef,
      },
      status,
      errors,
      warnings,
      tamperedFields,
      sanitizedRecord,
    });
  });

  const validCount = results.filter((r) => r.status === 'VALID').length;
  const warningCount = results.filter((r) => r.status === 'WARNING_TAMPER').length;
  const errorCount = results.filter((r) => r.status === 'ERROR').length;
  const readyToImportCount = results.filter((r) => r.status !== 'ERROR').length;

  return {
    totalRows: results.length,
    validCount,
    warningCount,
    errorCount,
    results,
    readyToImportCount,
  };
}

export interface BulkExecutionResult {
  success: boolean;
  savedCount: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

// ── 3. Execute Bulk Import in batches with live progress ──
export async function executeBulkImport(
  recordsToImport: WeRecord[],
  onProgress?: (current: number, total: number) => void
): Promise<BulkExecutionResult> {
  let savedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const total = recordsToImport.length;

  for (let i = 0; i < total; i++) {
    const record = recordsToImport[i];
    try {
      const isEdit = Boolean(record._id);
      const res = await saveRecord(record, true, isEdit);
      if (res.success) {
        savedCount++;
        if (res.action === 'created' || !isEdit) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      } else {
        failedCount++;
        errors.push(`الموقع [${record['site code']}]: ${res.error || 'فشل الحفظ'}`);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`الموقع [${record['site code']}]: ${err?.message || 'خطأ غير متوقع'}`);
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return {
    success: savedCount > 0,
    savedCount,
    insertedCount,
    updatedCount,
    failedCount,
    errors,
  };
}

