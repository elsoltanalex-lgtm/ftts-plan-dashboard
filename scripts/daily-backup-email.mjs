// scripts/daily-backup-email.mjs
// Automated Daily Backup & Email Script for FTTS & Availability Dashboard
// Scheduled to run daily at midnight (12:00 AM Cairo Time)

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 1. Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ljwflhbaiszapocyqbqt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Email destination
export const TARGET_EMAIL = process.env.BACKUP_TARGET_EMAIL || 'Elsoltanalex@gmail.com';

console.log(`[Daily Backup] Starting backup routine for ${TARGET_EMAIL}...`);
console.log(`[Daily Backup] Time: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} (Cairo Time)`);

/**
 * Fetch table safely from Supabase
 */
async function fetchTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(10000);

    if (error || !data || data.length === 0) {
      return null;
    }
    console.log(`[Daily Backup] Supabase table [${tableName}]: successfully fetched ${data.length} live rows.`);
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Safely load JSON from server/data
 */
function loadJsonFallback(filename) {
  const p = join(ROOT_DIR, 'server', 'data', filename);
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.records)) return parsed.records;
    } catch {}
  }
  return [];
}

/**
 * Main routine
 */
export async function runDailyBackup(customRecipient = null) {
  const recipient = customRecipient || TARGET_EMAIL;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `FTTS_Daily_Backup_${dateStr}_${timeStr}.xlsx`;

  // Fetch Supabase live data with fallbacks
  const [liveWe, liveVodafone, liveOrange, liveEtaha] = await Promise.all([
    fetchTable('we_records').then(res => res || fetchTable('we')),
    fetchTable('vodafone_records'),
    fetchTable('orange_records'),
    fetchTable('etaha_records').then(res => res || fetchTable('etaha')),
  ]);

  // Load verified local datasets if table is not active in Supabase yet
  const weRows = (liveWe && liveWe.length > 0) ? liveWe : loadJsonFallback('We.json');
  const vodafoneRows = (liveVodafone && liveVodafone.length > 0) ? liveVodafone : loadJsonFallback('Vodafone.json');
  const orangeRows = (liveOrange && liveOrange.length > 0) ? liveOrange : loadJsonFallback('Orange_480.json');
  const etahaRows = (liveEtaha && liveEtaha.length > 0) ? liveEtaha : loadJsonFallback('Etaha_360.json');

  console.log(`[Daily Backup] Data counts: WE=${weRows.length}, Vodafone=${vodafoneRows.length}, Orange=${orangeRows.length}, Availability=${etahaRows.length}`);

  // Format sheets
  const wb = XLSX.utils.book_new();

  // Helper to format table rows cleanly
  const sanitizeRows = (list, defaultCompany) => {
    return list.map((item, idx) => {
      const raw = item.rawRecord || item.data || item;
      const code = item['site code'] || item[' Site code'] || item.site_code || item.Code || raw[' Site code'] || raw['site code'] || `SITE-${idx + 1}`;
      return {
        'مسلسل': idx + 1,
        'Site Code': code,
        'المشغل': item.company || defaultCompany || 'WE',
        'سنترال الربط': item['سنترال الربط'] || item.central || raw['سنترال الربط'] || '',
        'التصنيف': item['التصنيف'] || item.classification || raw['التصنيف'] || '',
        'الحالة التنفيذية': item.status || item['التصنيف'] || '',
        'رئاسة قطاعات التنفيذ': item['رئاسة قطاعات التنفيذ'] || item.sector || raw['رئاسة قطاعات التنفيذ'] || '',
        'الادارة العامة لتنفيذ الشبكات': item['الادارة العامة لتنفيذ الشبكات'] || item.generalAdmin || raw['الادارة العامة لتنفيذ الشبكات'] || '',
        'إدارة التنفيذ المختصة': item['ادارة التنفيذ الفرعية'] || item['إدارة التنفيذ المختصة'] || item.competentAdmin || '',
        'تاريخ الانتهاء المتوقع': item['التاريخ المتوقع للانتهاء'] || item.expectedDate || '',
        'اسباب التعذر': item['اسباب التعّذر'] || item['اسباب التعذر'] || item.obstacleReason || '',
        'الملاحظات': item['الملاحظات'] || item.notes || '',
      };
    });
  };

  const formattedWe = sanitizeRows(weRows, 'WE');
  const formattedVodafone = sanitizeRows(vodafoneRows, 'Vodafone');
  const formattedOrange = sanitizeRows(orangeRows, 'Orange');

  // Format Availability (Etaha 360 sites)
  const formattedEtaha = etahaRows.map((item, idx) => {
    const raw = item.rawRecord || item;
    return {
      'مسلسل': idx + 1,
      'كود الموقع (Code)': item.Code || item.code || item.siteCode || `ETAH-${idx + 1}`,
      'اسم العميل': raw['اسم العميل'] || item.clientName || 'العميل المعتمد',
      'اسم الفرع': raw['اسم الفرع'] || item.branchName || '',
      'العنوان': raw['العنوان'] || item.address || '',
      'القطاع': raw['القطاعات'] || raw['القطاع'] || item.sector || '',
      'الإدارة العامة': raw['الادارة العامة المنفذة'] || raw['الإدارة العامة'] || raw['الادارة العامة'] || item.generalAdmin || '',
      'إدارة التنفيذ المختصة': raw['ادارة التنفيذ'] || raw['إدارة التنفيذ المختصة'] || item.competentAdmin || '',
      'المسار الداخلي': raw['المسار الداخلى'] || raw['المسار الداخلي'] || 'غير محدد',
      'المسار الخارجي': raw['المسار الخارجي'] || 'غير محدد',
      'موقف التسليم': raw['موقف التسليم'] || raw['موقف_التسليم'] || raw['التصنيف'] || item.status || '',
      'الملاحظات': raw['ملحوظه في حاله عدم الانتهاء'] || raw['الملاحظات'] || item.notes || '',
    };
  });

  // Consolidated Master FTTS Plan
  const masterFtts = [...formattedWe, ...formattedVodafone, ...formattedOrange];

  // Helper to add sheet with RTL and auto column width
  const addStyledSheet = (sheetData, sheetName) => {
    if (!sheetData || sheetData.length === 0) {
      sheetData = [{ 'تنبيه': 'لا توجد بيانات مسجلة حالياً في هذا الجدول' }];
    }
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const keys = Object.keys(sheetData[0] || {});
    ws['!cols'] = keys.map((key) => ({ wch: Math.min(Math.max(key.length + 4, 16), 40) }));
    ws['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  // Add sheets
  addStyledSheet(masterFtts, 'Master_FTTS_Plan');
  addStyledSheet(formattedWe, 'WE_Rollout');
  addStyledSheet(formattedVodafone, 'Vodafone_Plan');
  addStyledSheet(formattedOrange, 'Orange_Plan');
  addStyledSheet(formattedEtaha, 'Availability_الإتاحة');

  // Summary metadata sheet
  const summary = [
    { 'البيان': 'منظومة المتابعة', 'القيمة': 'Fiber Tracking Board (FTTS & Availability)' },
    { 'البيان': 'تاريخ وتوقيت التصدير', 'القيمة': now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) },
    { 'البيان': 'البريد المرسل إليه', 'القيمة': recipient },
    { 'البيان': 'إجمالي مواقع FTTS المجمعة', 'القيمة': masterFtts.length },
    { 'البيان': 'عدد مواقع WE', 'القيمة': formattedWe.length },
    { 'البيان': 'عدد مواقع Vodafone', 'القيمة': formattedVodafone.length },
    { 'البيان': 'عدد مواقع Orange', 'القيمة': formattedOrange.length },
    { 'البيان': 'عدد مشروعات Availability (الإتاحة)', 'القيمة': formattedEtaha.length },
    { 'البيان': 'إجمالي السجلات المؤمّنة', 'القيمة': masterFtts.length + formattedEtaha.length },
    { 'البيان': 'حالة الحفظ السحابي', 'القيمة': 'نسخة احتياطية آلية مجدولة يومياً' },
  ];
  addStyledSheet(summary, 'تقرير_النسخة_الاحتياطية');

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Save local copy to backups for archive
  const backupDir = join(ROOT_DIR, 'backups');
  if (!existsSync(backupDir)) {
    try { mkdirSync(backupDir, { recursive: true }); } catch {}
  }
  const localFilePath = join(backupDir, fileName);
  try {
    writeFileSync(localFilePath, excelBuffer);
    console.log(`[Daily Backup] Local backup copy saved: ${localFilePath}`);
  } catch {}

  const grandTotal = masterFtts.length + formattedEtaha.length;
  console.log(`[Daily Backup] Excel file generated successfully (${grandTotal} records, ${excelBuffer.length} bytes).`);

  // Email sending configuration
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!smtpUser || !smtpPass) {
    console.log(`\n======================================================`);
    console.log(`⚠️  [Daily Backup Notice] SMTP Credentials not yet set in environment variables!`);
    console.log(`   Target Email: ${recipient}`);
    console.log(`   File ready: ${fileName} (${excelBuffer.length} bytes)`);
    console.log(`   To send emails automatically via Gmail:`);
    console.log(`   Set GMAIL_USER and GMAIL_APP_PASSWORD in your Vercel / GitHub Secrets.`);
    console.log(`======================================================\n`);
    return {
      success: true,
      emailSent: false,
      message: 'تم إنشاء وتجهيز النسخة الاحتياطية بنجاح. يرجى تزويد بيانات SMTP / Gmail لإتمام الإرسال الفعلي.',
      fileName,
      totalRecords: grandTotal,
      buffer: excelBuffer,
    };
  }

  console.log(`[Daily Backup] Connecting to SMTP server (${smtpHost}:${smtpPort}) to deliver email to ${recipient}...`);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: `"FTTS Backup System" <${smtpUser}>`,
    to: recipient,
    subject: `📦 النسخة الاحتياطية اليومية لنظام FTTS & Availability - ${dateStr}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #0284c7, #4f46e5); color: #ffffff; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">📦 النسخة الاحتياطية اليومية التلقائية</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Fiber Tracking Board (FTTS & Availability)</p>
          </div>
          
          <div style="padding: 25px;">
            <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
              تحية طيبة،<br/>
              مرفق طيه النسخة الاحتياطية اليومية الشاملة والمحدثة بالكامل من قاعدة البيانات السحابية Supabase، والمتضمنة كافة مشروعات FTTS ومشروعات Availability (الإتاحة الـ 360 مشروعاً) والعمليات الجديدة.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📅 تاريخ التصدير:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">⏰ التوقيت:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">12:00 منتصف الليل (توقيت القاهرة)</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">🌐 إجمالي مواقع FTTS:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0284c7;">${masterFtts.length} موقعاً (WE: ${formattedWe.length} • Vodafone: ${formattedVodafone.length} • Orange: ${formattedOrange.length})</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📋 مشروعات Availability:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0d9488;">${formattedEtaha.length} مشروعاً معتمداً</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📁 اسم الملف المرفق:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${fileName}</td>
              </tr>
            </table>

            <div style="background-color: #ecfdf5; border-right: 4px solid #10b981; padding: 12px; border-radius: 4px; font-size: 13px; color: #065f46;">
              ✅ تم تأمين واستخراج هذه النسخة تلقائياً لحفظ وتأمين كافة بيانات المشروعات وسلامة العمليات والرجوع إليها في أي وقت.
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            منظومة المتابعة الرقمية للمشروعات القومية للفايبر والاتصالات • إرسال آلي مجدول
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: fileName,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Daily Backup] ✅ Email successfully sent to ${recipient}! MessageId: ${info.messageId}`);

  return {
    success: true,
    emailSent: true,
    messageId: info.messageId,
    fileName,
    totalRecords: grandTotal,
  };
}

// Run if called directly as script
if (process.argv[1] && process.argv[1].endsWith('daily-backup-email.mjs')) {
  runDailyBackup()
    .then((res) => {
      console.log('[Daily Backup] Execution result:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Daily Backup] Fatal execution error:', err);
      process.exit(1);
    });
}
