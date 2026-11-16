// src/utils/orangeBulkExcelService.ts
// Professional Excel generator & parser for Orange bulk import using ExcelJS with locked constants & data validations

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { SiteRecord } from '../types/dashboard';
import type { OrangeRecord } from '../types/orange';
import {
  ORANGE_APPROVED_CLASSIFICATIONS,
  ORANGE_STALL_REASONS,
  ORANGE_SUPPORT_ENTITIES,
  normalizeOrangeClassification,
} from '../types/orange';

export interface OrangeExcelRow {
  rowNumber: number;
  siteCode: string;
  sector: string;
  areasSector: string;
  executionSector: string;
  generalAdmin: string;
  area: string;
  governorate: string;
  central: string;
  responsibility: string;
  siteStatus: string;
  classification: string;
  obstacleReason?: string;
  notes?: string;
  expectedDate?: string;
  workCost?: string;
  materialCost?: string;
  permitCost?: string;
  civilClassification?: string;
  areaDelivery?: string;
  electricalClassification?: string;
  electricalStage?: string;
  tamperedFields: string[];
  validationErrors: string[];
  sanitizedRecord?: OrangeRecord;
}

export interface OrangeValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  tamperedRows: number;
  recordsToImport: OrangeRecord[];
  rows: OrangeExcelRow[];
  errors: string[];
  warnings: string[];
}

/**
 * Generate a protected, formatted Excel workbook template for Orange Bulk Import
 */
export async function generateOrangeBulkImportTemplate(sites: SiteRecord[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiber Tracking Port - Orange System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('بيانات مواقع أورنج الميدانية', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }],
  });

  // 1. Group Headers (Row 1)
  ws.mergeCells('A1:M1');
  const group1 = ws.getCell('A1');
  group1.value = '🔒 البيانات الأساسية الثابتة والمحمية لـ Orange (Read-Only - غير مسموح بالتعديل من القطاع)';
  group1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
  group1.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('N1:Q1');
  const group2 = ws.getCell('N1');
  group2.value = '✏️ الموقف والتصنيف الميداني (متاح للتعديل)';
  group2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  group2.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('R1:T1');
  const group3 = ws.getCell('R1');
  group3.value = '💰 التكاليف والمصروفات الميدانية (ج.م)';
  group3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  group3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group3.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('U1:X1');
  const group4 = ws.getCell('U1');
  group4.value = '⚡ الموقف المدني والكهربي ومراحل التسليم';
  group4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
  group4.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getRow(1).height = 28;

  // 2. Column Sub-headers (Row 2)
  const headers = [
    { text: 'كود الموقع [ثابت مقفل]', key: 'siteCode', width: 14, locked: true },
    { text: 'رئاسة قطاعات التنفيذ [ثابت مقفل]', key: 'sector', width: 22, locked: true },
    { text: 'قطاع التنفيذ [ثابت مقفل]', key: 'executionSector', width: 20, locked: true },
    { text: 'قطاع المناطق [ثابت مقفل]', key: 'areasSector', width: 22, locked: true },
    { text: 'الادارة العامة للمنطقة [ثابت مقفل]', key: 'generalAreaAdmin', width: 24, locked: true },
    { text: 'الادارة العامة لتنفيذ الشبكات [ثابت مقفل]', key: 'generalAdmin', width: 28, locked: true },
    { text: 'ادارة التنفيذ الفرعية [ثابت مقفل]', key: 'competentAdmin', width: 22, locked: true },
    { text: 'مسئولية التنفيذ [ثابت مقفل]', key: 'responsibility', width: 18, locked: true },
    { text: 'سنترال الربط [ثابت مقفل]', key: 'central', width: 20, locked: true },
    { text: 'المحافظة [ثابت مقفل]', key: 'governorate', width: 16, locked: true },
    { text: 'سنة الخطة [ثابت مقفل]', key: 'planYear', width: 14, locked: true },
    { text: 'خط العرض [ثابت مقفل]', key: 'lat', width: 16, locked: true },
    { text: 'خط الطول [ثابت مقفل]', key: 'lng', width: 16, locked: true },
    { text: 'التصنيف [تعديل - قائمة منسدلة]', key: 'classification', width: 22, locked: false },
    { text: 'أسباب التعذر أو المعوقات [تعديل]', key: 'obstacleReason', width: 26, locked: false },
    { text: 'الملاحظات والتسليمات [تعديل]', key: 'notes', width: 30, locked: false },
    { text: 'التاريخ المتوقع للانتهاء [تعديل]', key: 'expectedDate', width: 20, locked: false },
    { text: 'تكلفة اعمال [تعديل]', key: 'workCost', width: 16, locked: false },
    { text: 'تكلفة مهمات [تعديل]', key: 'materialCost', width: 16, locked: false },
    { text: 'تكلفة استخراج تصاريح [تعديل]', key: 'permitCost', width: 18, locked: false },
    { text: 'التصنيف (مدني) [تعديل]', key: 'civilClassification', width: 20, locked: false },
    { text: 'تأكيد التسليم للمنطقة [تعديل]', key: 'areaDelivery', width: 20, locked: false },
    { text: 'التصنيف (كهربي) [تعديل]', key: 'electricalClassification', width: 20, locked: false },
    { text: 'المرحلة الكهربية [تعديل]', key: 'electricalStage', width: 20, locked: false },
  ];

  const headerRow = ws.getRow(2);
  headerRow.height = 26;

  headers.forEach((h, idx) => {
    const colNumber = idx + 1;
    ws.getColumn(colNumber).width = h.width;
    const cell = headerRow.getCell(colNumber);
    cell.value = h.text;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: h.locked ? 'FF334155' : colNumber <= 17 ? 'FFC2410C' : colNumber <= 20 ? 'FF0F766E' : 'FF065F46',
      },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Populate Rows
  sites.forEach((site, rIdx) => {
    const rowNum = rIdx + 3;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const raw = site.rawRecord || {};
    const rowData = [
      site.siteCode,
      site.sector || raw['رئاسة قطاعات التنفيذ'] || '',
      site.executionSector || raw['قطاع التنفيذ'] || '',
      site.subSector || raw['قطاع المناطق'] || '',
      raw['الادارة العامة للمنطقة'] || '',
      site.generalAdmin || raw['الادارة العامة لتنفيذ الشبكات'] || '',
      site.competentAdmin || raw['ادارة التنفيذ الفرعية'] || '',
      site.responsibility || raw['مسئولية التنفيذ'] || 'التنفيذ',
      site.central || raw['سنترال الربط'] || '',
      site.governorate || raw['المحافظه'] || '',
      raw['خطة'] || '2026',
      site.lat || raw['احدثيات خط العرض'] || '',
      site.lng || raw['احدثيات خط الطول'] || '',
      raw['التصنيف'] || site.classification || 'جاري المعاينة',
      site.obstacleReason && site.obstacleReason !== 'لا يوجد تعذر' ? site.obstacleReason : (raw['اسباب التعّذر'] || ''),
      site.notes || raw['الملاحظات'] || '',
      site.expectedDate || raw['التاريخ المتوقع للانتهاء'] || '2026-12-31',
      raw['تكلفة اعمال'] ?? 0,
      raw['تكلفة مهمات'] ?? 0,
      raw['تكلفة استخراج تصاريح'] ?? 0,
      raw['التصنيف (مدني)'] || '',
      site.deliveryArea || raw['تاكيد التسليم للمنطقه'] || 'لم يتم التسليم',
      raw['التصنيف (كهربي)'] || '',
      raw['المرحله الكهربيه'] || '',
    ];

    row.values = rowData;

    // Apply formatting & protections
    headers.forEach((h, cIdx) => {
      const colNum = cIdx + 1;
      const cell = row.getCell(colNum);
      cell.protection = { locked: h.locked };
      cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: h.locked ? 'FF475569' : 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (h.locked) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rIdx % 2 === 0 ? 'FFF8FAFC' : 'FFF1F5F9' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    // Add validation for classification (column 14)
    row.getCell(14).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"تم التسليم,جاري  تصاريح,معوقات,متعذرات,جاري العمل مدني,جاري العمل كهربي,جاري المعاينة"'],
      showErrorMessage: true,
      errorTitle: 'تصنيف غير صحيح',
      error: 'يرجى اختيار تصنيف معتمد من القائمة فقط',
    };
  });

  // Enable Sheet Protection
  await ws.protect('FTTS_Orange_2026', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: true,
    autoFilter: true,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/**
 * Smart Column Matcher
 */
function cleanKey(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.\\[\]()]/g, '');
}

function extractCell(row: Record<string, any>, candidateHeaders: string[]): string {
  const rowKeys = Object.keys(row);
  for (const cand of candidateHeaders) {
    const cleanCand = cleanKey(cand);
    const matched = rowKeys.find((k) => cleanKey(k) === cleanCand || cleanKey(k).includes(cleanCand));
    if (matched && row[matched] !== undefined && row[matched] !== null) {
      return String(row[matched]).trim();
    }
  }
  return '';
}

/**
 * Parse and validate uploaded Orange bulk Excel file (supports both raw sheets and template formats)
 */
export async function parseAndValidateOrangeBulkExcel(
  fileBuffer: ArrayBuffer,
  baselineSites: SiteRecord[]
): Promise<OrangeValidationReport> {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (rawMatrix.length < 2) {
    throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات.');
  }

  // Detect header row
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawMatrix.length, 5); i++) {
    const row = rawMatrix[i] || [];
    const text = row.map(cleanKey).join(' ');
    if (text.includes('كود') || text.includes('sitecode') || text.includes('رئاسةقطاعاتالتنفيذ') || text.includes('قطاعالتنفيذ')) {
      headerRowIndex = i;
      break;
    }
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    range: headerRowIndex,
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('لم يتم العثور على سجلات صالحة في ملف الإكسيل.');
  }

  // Build baseline map
  const baselineMap = new Map<string, SiteRecord>();
  baselineSites.forEach((s) => {
    if (s.siteCode) baselineMap.set(s.siteCode.trim().toUpperCase(), s);
  });

  const parsedRows: OrangeExcelRow[] = [];
  const recordsToImport: OrangeRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let tamperedCount = 0;
  let validCount = 0;

  rawRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + idx + 2;

    const siteCode = extractCell(row, ['site code', 'sitecode', 'كود الموقع', 'كود', 'code', 'hubid', 'site']);
    const sector = extractCell(row, ['رئاسة قطاعات التنفيذ', 'رئاسة القطاعات', 'رئاسة القطاعات ', 'sector']);
    const executionSector = extractCell(row, ['قطاع التنفيذ', 'executionsector']);
    const areasSector = extractCell(row, ['قطاع المناطق', 'areasector']);
    const generalAreaAdmin = extractCell(row, ['الادارة العامة للمنطقة', 'منطقة']);
    const generalAdmin = extractCell(row, ['الادارة العامة لتنفيذ الشبكات', 'الادارة العامة للتنفيذ', 'الإدارة العامة لتنفيذ الشبكات', 'الادارة العامة']);
    const competentAdmin = extractCell(row, ['ادارة التنفيذ الفرعية', 'إدارة التنفيذ الفرعية', 'ادارة التنفيذ', 'المنطقة']);
    const responsibility = extractCell(row, ['مسئولية التنفيذ', 'مسؤولية التنفيذ', 'مسئوليه التنفيذ']) || 'التنفيذ';
    const central = extractCell(row, ['سنترال الربط', 'السنترال', 'central']);
    const governorate = extractCell(row, ['المحافظه', 'المحافظة', 'governorate']);
    const planYear = extractCell(row, ['سنة الخطة', 'خطة', 'planyear']) || '2026';
    const lat = extractCell(row, ['احدثيات خط العرض', 'خط العرض', 'latitude', 'lat']);
    const lng = extractCell(row, ['احدثيات خط الطول', 'خط الطول', 'longitude', 'lng']);

    // Editable fields
    const classification = extractCell(row, ['التصنيف', 'classification', 'التصنيف (مدني)']) || 'جاري المعاينة';
    const obstacleReason = extractCell(row, ['أسباب التعذر أو المعوقات', 'اسباب التعّذر', 'اسباب التعذر', 'سبب التعذر', 'نوع المعوق المدني']);
    const notes = extractCell(row, ['الملاحظات والتسليمات', 'الملاحظات الميدانية', 'الملاحظات', 'ملاحظات', 'notes']);
    const expectedDate = extractCell(row, ['التاريخ المتوقع للانتهاء', 'التاريخ المتوقع', 'expecteddate']);
    const workCost = extractCell(row, ['تكلفة اعمال', 'تكلفة أعمال']);
    const materialCost = extractCell(row, ['تكلفة مهمات']);
    const permitCost = extractCell(row, ['تكلفة استخراج تصاريح']);
    const civilClassification = extractCell(row, ['التصنيف (مدني)', 'مدني']);
    const areaDelivery = extractCell(row, ['تاكيد التسليم للمنطقه', 'تأكيد التسليم للمنطقة']);
    const electricalClassification = extractCell(row, ['التصنيف (كهربي)', 'كهربي']);
    const electricalStage = extractCell(row, ['المرحله الكهربيه', 'المرحلة الكهربية']);

    const tamperedFields: string[] = [];
    const validationErrors: string[] = [];

    if (!siteCode) {
      validationErrors.push('كود الموقع غير موجود في هذا الصف');
    }

    const baseline = baselineMap.get((siteCode || '').toUpperCase());

    // Compare immutable constants with baseline if baseline exists
    if (baseline) {
      if (sector && baseline.sector && cleanKey(sector) !== cleanKey(baseline.sector)) {
        tamperedFields.push(`رئاسة قطاعات التنفيذ (القيمة المرفوعة: ${sector} | الأصل: ${baseline.sector})`);
      }
      if (generalAdmin && baseline.generalAdmin && cleanKey(generalAdmin) !== cleanKey(baseline.generalAdmin)) {
        tamperedFields.push(`الإدارة العامة (القيمة المرفوعة: ${generalAdmin} | الأصل: ${baseline.generalAdmin})`);
      }
      if (competentAdmin && baseline.competentAdmin && cleanKey(competentAdmin) !== cleanKey(baseline.competentAdmin)) {
        tamperedFields.push(`إدارة التنفيذ الفرعية (القيمة المرفوعة: ${competentAdmin} | الأصل: ${baseline.competentAdmin})`);
      }
    }

    if (tamperedFields.length > 0) {
      tamperedCount++;
      warnings.push(`صف ${rowNum} (${siteCode}): تم اكتشاف محاولة تعديل ثوابت محمية، وسيتم تثبيت القيم الأصلية.`);
    }

    const now = new Date().toISOString();
    const sanitizedRecord: OrangeRecord = {
      ...(baseline?.rawRecord || {}),
      ' Site code': baseline?.siteCode || siteCode,
      'Site code': baseline?.siteCode || siteCode,
      'site code': baseline?.siteCode || siteCode,
      site_code: baseline?.siteCode || siteCode,
      'رئاسة قطاعات التنفيذ': baseline?.sector || sector,
      'رئاسة القطاعات ': baseline?.sector || sector,
      'قطاع التنفيذ': baseline?.executionSector || executionSector,
      'قطاع المناطق': baseline?.subSector || areasSector,
      'الادارة العامة للمنطقة': (baseline?.rawRecord && baseline.rawRecord['الادارة العامة للمنطقة']) || generalAreaAdmin,
      'الادارة العامة لتنفيذ الشبكات': baseline?.generalAdmin || generalAdmin,
      'الادارة العامة للتنفيذ': baseline?.generalAdmin || generalAdmin,
      'ادارة التنفيذ الفرعية': baseline?.competentAdmin || competentAdmin,
      'المنطقة': baseline?.competentAdmin || competentAdmin,
      'مسئولية التنفيذ': baseline?.responsibility || responsibility,
      'مسئوليه التنفيذ': baseline?.responsibility || responsibility,
      'سنترال الربط': baseline?.central || central,
      'المحافظه': baseline?.governorate || governorate,
      'خطة': (baseline?.rawRecord && baseline.rawRecord['خطة']) || planYear,
      'احدثيات خط العرض': baseline?.lat || lat,
      'احدثيات خط الطول': baseline?.lng || lng,
      // Editable values from uploaded sheet
      'التصنيف': classification,
      'التصنيف (مدني)': civilClassification || classification,
      'اسباب التعّذر': obstacleReason,
      'اسباب التعذر': obstacleReason,
      'الملاحظات': notes,
      'التاريخ المتوقع للانتهاء': expectedDate || (baseline?.expectedDate || '2026-12-31'),
      'تكلفة اعمال': workCost,
      'تكلفة مهمات': materialCost,
      'تكلفة استخراج تصاريح': permitCost,
      'تاكيد التسليم للمنطقه': areaDelivery,
      'التصنيف (كهربي)': electricalClassification,
      'المرحله الكهربيه': electricalStage,
      _id: `ORANGE-${siteCode}`,
      _updatedAt: now,
    };

    if (validationErrors.length === 0) {
      validCount++;
      recordsToImport.push(sanitizedRecord);
    } else {
      errors.push(`صف ${rowNum}: ${validationErrors.join(', ')}`);
    }

    parsedRows.push({
      rowNumber: rowNum,
      siteCode,
      sector,
      areasSector,
      executionSector,
      generalAdmin,
      area: competentAdmin,
      governorate,
      central,
      responsibility,
      siteStatus: classification,
      classification,
      obstacleReason,
      notes,
      expectedDate,
      workCost,
      materialCost,
      permitCost,
      civilClassification,
      areaDelivery,
      electricalClassification,
      electricalStage,
      tamperedFields,
      validationErrors,
      sanitizedRecord,
    });
  });

  return {
    totalRows: rawRows.length,
    validRows: validCount,
    invalidRows: errors.length,
    tamperedRows: tamperedCount,
    recordsToImport,
    rows: parsedRows,
    errors,
    warnings,
  };
}
