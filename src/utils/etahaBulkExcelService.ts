// src/utils/etahaBulkExcelService.ts
// Professional Excel generator & parser for Availability / Etaha bulk import with locked constants & data validations

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { SiteRecord } from '../types/dashboard';
import type { EtahaRecord } from '../data/etahaSites';

export interface EtahaExcelRow {
  rowNumber: number;
  siteCode: string;
  projectName: string;
  clientName: string;
  branchName: string;
  address: string;
  sector: string;
  generalAdmin: string;
  executionSector: string;
  governorate: string;
  responsibility: string;
  executionAdmin: string;
  managerContact: string;
  orderService: string;
  startDate: string;
  classification: string;
  obstacleReason?: string;
  notes?: string;
  completionDate?: string;
  deliveryStatus?: string;
  externalPath?: string;
  splicingStatus?: string;
  tamperedFields: string[];
  validationErrors: string[];
  sanitizedRecord?: EtahaRecord;
}

export interface EtahaValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  tamperedRows: number;
  recordsToImport: EtahaRecord[];
  rows: EtahaExcelRow[];
  errors: string[];
  warnings: string[];
}

export const ETAHA_APPROVED_STATUSES = [
  'تم الانتهاء والتسليم',
  'تم خارجي -متوقف علي العميل',
  'تصاريح',
  'جاري خارجي',
  'معوقات',
  'تعذر',
  'منتظر التسليم',
];

/**
 * Generate a protected, formatted Excel workbook template for Etaha Bulk Import
 */
export async function generateEtahaBulkImportTemplate(sites: SiteRecord[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiber Tracking Port - Availability Project System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('بيانات مشروعات الإتاحة', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }],
  });

  // 1. Group Headers (Row 1)
  ws.mergeCells('A1:L1');
  const group1 = ws.getCell('A1');
  group1.value = '🔒 البيانات الأساسية الثابتة والمحمية لمشروعات الإتاحة (Read-Only - غير مسموح بالتعديل من القطاع)';
  group1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal header
  group1.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('M1:R1');
  const group2 = ws.getCell('M1');
  group2.value = '✏️ الموقف التنفيذي وتفاصيل التعذر والمعوقات (متاح للتعديل)';
  group2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Amber header
  group2.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('S1:U1');
  const group3 = ws.getCell('S1');
  group3.value = '📋 موقف المسار الخارجي والتسليمات الميدانية';
  group3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue header
  group3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  group3.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getRow(1).height = 28;

  // 2. Column Sub-headers (Row 2)
  const headers = [
    { text: 'كود المشروع [ثابت مقفل]', key: 'siteCode', width: 14, locked: true },
    { text: 'اسم المشروع [ثابت مقفل]', key: 'projectName', width: 14, locked: true },
    { text: 'اسم العميل [ثابت مقفل]', key: 'clientName', width: 28, locked: true },
    { text: 'اسم الفرع [ثابت مقفل]', key: 'branchName', width: 22, locked: true },
    { text: 'العنوان [ثابت مقفل]', key: 'address', width: 35, locked: true },
    { text: 'القطاع [ثابت مقفل]', key: 'sector', width: 20, locked: true },
    { text: 'الادارة العامة المنفذة [ثابت مقفل]', key: 'generalAdmin', width: 28, locked: true },
    { text: 'قطاع التنفيذ [ثابت مقفل]', key: 'executionSector', width: 20, locked: true },
    { text: 'المحافظة [ثابت مقفل]', key: 'governorate', width: 16, locked: true },
    { text: 'مسئوليه التنفيذ [ثابت مقفل]', key: 'responsibility', width: 16, locked: true },
    { text: 'ادارة التنفيذ [ثابت مقفل]', key: 'executionAdmin', width: 24, locked: true },
    { text: 'أمر الخدمة [ثابت مقفل]', key: 'orderService', width: 16, locked: true },
    { text: 'التصنيف [تعديل - قائمة منسدلة]', key: 'classification', width: 24, locked: false },
    { text: 'سبب المعوق او التعذر [تعديل]', key: 'obstacleReason', width: 28, locked: false },
    { text: 'ملحوظة عدم الانتهاء [تعديل]', key: 'notes', width: 35, locked: false },
    { text: 'مدير الإدارة وهاتفه [تعديل]', key: 'managerContact', width: 24, locked: false },
    { text: 'تاريخ الانتهاء [تعديل]', key: 'completionDate', width: 18, locked: false },
    { text: 'موقف التسليم [تعديل]', key: 'deliveryStatus', width: 18, locked: false },
    { text: 'المسار الخارجي [تعديل]', key: 'externalPath', width: 18, locked: false },
    { text: 'موقف اللحامات [تعديل]', key: 'splicingStatus', width: 22, locked: false },
    { text: 'تاريخ التسليم [تعديل]', key: 'deliveryDate', width: 18, locked: false },
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
        argb: h.locked ? 'FF1E293B' : colNumber <= 18 ? 'FFB45309' : 'FF1D4ED8',
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
      raw['المشروع'] || 'اتاحة',
      raw['اسم العميل'] || site.siteName.split(' - ')[0] || '',
      raw['اسم الفرع'] || '',
      raw['العنوان'] || '',
      raw['القطاعات'] || site.sector || '',
      site.generalAdmin || raw['الادارة العامة المنفذة'] || '',
      site.executionSector || raw['قطاع التنفيذ'] || '',
      site.governorate || raw['المحافظة'] || '',
      site.responsibility || raw['مسئوليه التنفيذ'] || 'التنفيذ',
      site.competentAdmin || raw['ادارة التنفيذ'] || '',
      raw['  Order Service'] || raw['Order Service'] || '',
      raw['التصنيف'] || site.classification || 'جاري التنفيذ',
      site.obstacleReason && site.obstacleReason !== 'لا يوجد تعذر' ? site.obstacleReason : (raw['سبب المعوق او التعذر'] || ''),
      raw['ملحوظه في حاله عدم الانتهاء'] || '',
      raw['اسم ورقم تليفون مدير الادارة'] || '',
      site.expectedDate || raw['تاريخ الانتهاء'] || '',
      raw['موقف التسليم'] || site.deliveryArea || '',
      raw['المسار الخارجي'] || '',
      raw['موقف اللحامات'] || '',
      raw['تاريخ التسليم '] || '',
    ];

    row.values = rowData;

    // Apply formatting & protections
    headers.forEach((h, cIdx) => {
      const colNum = cIdx + 1;
      const cell = row.getCell(colNum);
      cell.protection = { locked: h.locked };
      cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: h.locked ? 'FF475569' : 'FF0F172A' } };
      cell.alignment = { horizontal: colNum <= 2 ? 'center' : 'right', vertical: 'middle' };

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

    // Add validation for classification (column 13)
    row.getCell(13).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"تم الانتهاء والتسليم,تم خارجي -متوقف علي العميل,تصاريح,جاري خارجي,معوقات,تعذر,منتظر التسليم"'],
      showErrorMessage: true,
      errorTitle: 'تصنيف غير صحيح',
      error: 'يرجى اختيار تصنيف معتمد من القائمة فقط',
    };
  });

  // Enable Sheet Protection
  await ws.protect('ETAHA_Availability_2026', {
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

function cleanStr(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.\\[\]()]/g, '');
}

function extractCell(row: Record<string, any>, candidateHeaders: string[]): string {
  const rowKeys = Object.keys(row);
  for (const cand of candidateHeaders) {
    const cleanCand = cleanStr(cand);
    const matched = rowKeys.find((k) => cleanStr(k) === cleanCand || cleanStr(k).includes(cleanCand));
    if (matched && row[matched] !== undefined && row[matched] !== null) {
      return String(row[matched]).trim();
    }
  }
  return '';
}

/**
 * Parse and validate uploaded Availability/Etaha bulk Excel file
 */
export function parseAndValidateEtahaBulkExcel(
  fileBuffer: ArrayBuffer,
  baselineSites: SiteRecord[]
): EtahaValidationReport {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = wb.SheetNames.find((s) => s.includes('Details') || s.includes('الإتاحة') || s.includes('Etaha')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (rawMatrix.length < 2) {
    throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات.');
  }

  // Detect header row
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawMatrix.length, 5); i++) {
    const row = rawMatrix[i] || [];
    const text = row.map(cleanStr).join(' ');
    if (text.includes('code') || text.includes('كود') || text.includes('عميل') || text.includes('المشروع')) {
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

  const parsedRows: EtahaExcelRow[] = [];
  const recordsToImport: EtahaRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let tamperedCount = 0;
  let validCount = 0;

  rawRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + idx + 2;

    const siteCode = extractCell(row, ['code', 'كود المشروع', 'كود', 'sitecode']);
    const projectName = extractCell(row, ['المشروع', 'اسم المشروع', 'project']) || 'اتاحة';
    const clientName = extractCell(row, ['اسم العميل', 'العميل', 'client']);
    const branchName = extractCell(row, ['اسم الفرع', 'الفرع', 'branch']);
    const address = extractCell(row, ['العنوان', 'address']);
    const sector = extractCell(row, ['القطاعات', 'القطاع', 'sector']);
    const generalAdmin = extractCell(row, ['الادارة العامة المنفذة', 'الإدارة العامة المنفذة', 'الإدارة العامة']);
    const executionSector = extractCell(row, ['قطاع التنفيذ', 'executionsector']);
    const governorate = extractCell(row, ['المحافظة', 'المحافظه', 'governorate']);
    const responsibility = extractCell(row, ['مسئوليه التنفيذ', 'مسؤولية التنفيذ']) || 'التنفيذ';
    const executionAdmin = extractCell(row, ['ادارة التنفيذ', 'إدارة التنفيذ', 'ادارة']);
    const managerContact = extractCell(row, ['اسم ورقم تليفون مدير الادارة', 'مدير الادارة', 'مدير']);
    const orderService = extractCell(row, ['orderservice', 'order service', 'أمر الخدمة']);
    const startDate = extractCell(row, ['تاريخ السداد و البدء فى التنفيذ', 'تاريخ البدء']);

    // Editable fields
    const classification = extractCell(row, ['التصنيف', 'classification']) || 'جاري التنفيذ';
    const obstacleReason = extractCell(row, ['سبب المعوق او التعذر', 'سبب المعوق', 'أسباب التعذر']);
    const notes = extractCell(row, ['ملحوظه في حاله عدم الانتهاء', 'ملحوظة', 'ملاحظات', 'notes']);
    const completionDate = extractCell(row, ['تاريخ الانتهاء', 'تاريخ التسليم', 'تاريخ التسليم ']);
    const deliveryStatus = extractCell(row, ['موقف التسليم', 'تسليم']);
    const externalPath = extractCell(row, ['المسار الخارجي']);
    const splicingStatus = extractCell(row, ['موقف اللحامات']);

    const tamperedFields: string[] = [];
    const validationErrors: string[] = [];

    if (!siteCode) {
      validationErrors.push('كود المشروع غير موجود في هذا الصف');
    }

    const baseline = baselineMap.get((siteCode || '').toUpperCase());

    // Compare immutable constants with baseline if baseline exists
    if (baseline) {
      if (clientName && baseline.rawRecord?.['اسم العميل'] && cleanStr(clientName) !== cleanStr(baseline.rawRecord['اسم العميل'])) {
        tamperedFields.push(`اسم العميل (القيمة المرفوعة: ${clientName} | الأصل: ${baseline.rawRecord['اسم العميل']})`);
      }
      if (generalAdmin && baseline.generalAdmin && cleanStr(generalAdmin) !== cleanStr(baseline.generalAdmin)) {
        tamperedFields.push(`الإدارة العامة (القيمة المرفوعة: ${generalAdmin} | الأصل: ${baseline.generalAdmin})`);
      }
      if (executionAdmin && baseline.competentAdmin && cleanStr(executionAdmin) !== cleanStr(baseline.competentAdmin)) {
        tamperedFields.push(`إدارة التنفيذ (القيمة المرفوعة: ${executionAdmin} | الأصل: ${baseline.competentAdmin})`);
      }
    }

    if (tamperedFields.length > 0) {
      tamperedCount++;
      warnings.push(`صف ${rowNum} (${siteCode}): تم رصد محاولة تعديل في ثوابت المشروع، وسيتم اعتماد القيم الأصلية.`);
    }

    const now = new Date().toISOString();
    const sanitizedRecord: EtahaRecord = {
      ...(baseline?.rawRecord || {}),
      Code: baseline?.siteCode || siteCode,
      'المشروع': projectName,
      'اسم العميل': baseline?.rawRecord?.['اسم العميل'] || clientName,
      'اسم الفرع': baseline?.rawRecord?.['اسم الفرع'] || branchName,
      'العنوان': baseline?.rawRecord?.['العنوان'] || address,
      'القطاعات': baseline?.rawRecord?.['القطاعات'] || sector,
      'الادارة العامة المنفذة': baseline?.generalAdmin || generalAdmin,
      'قطاع التنفيذ': baseline?.executionSector || executionSector,
      'المحافظة': baseline?.governorate || governorate,
      'مسئوليه التنفيذ': baseline?.responsibility || responsibility,
      'ادارة التنفيذ': baseline?.competentAdmin || executionAdmin,
      'اسم ورقم تليفون مدير الادارة': managerContact || baseline?.rawRecord?.['اسم ورقم تليفون مدير الادارة'] || '',
      '  Order Service': orderService || baseline?.rawRecord?.['  Order Service'] || '',
      'تاريخ السداد و البدء فى التنفيذ': startDate || baseline?.rawRecord?.['تاريخ السداد و البدء فى التنفيذ'] || '',
      // Editable fields from upload
      'التصنيف': classification,
      'سبب المعوق او التعذر': obstacleReason,
      'ملحوظه في حاله عدم الانتهاء': notes,
      'تاريخ الانتهاء': completionDate || baseline?.expectedDate || '',
      'موقف التسليم': deliveryStatus,
      'المسار الخارجي': externalPath,
      'موقف اللحامات': splicingStatus,
      _id: `ETAHA-${siteCode}`,
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
      projectName,
      clientName,
      branchName,
      address,
      sector,
      generalAdmin,
      executionSector,
      governorate,
      responsibility,
      executionAdmin,
      managerContact,
      orderService,
      startDate,
      classification,
      obstacleReason,
      notes,
      completionDate,
      deliveryStatus,
      externalPath,
      splicingStatus,
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

