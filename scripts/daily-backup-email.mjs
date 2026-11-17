// scripts/daily-backup-email.mjs
// Automated Daily Backup & Email Script for FTTS & Availability Dashboard
// Scheduled to run daily at midnight (12:00 AM Cairo Time) and on-demand via UI

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
  } catch {
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
 * Main routine: Supports invocation with string (recipient email) or options object
 */
export async function runDailyBackup(optionsOrRecipient = null) {
  const options = (typeof optionsOrRecipient === 'string')
    ? { recipient: optionsOrRecipient }
    : (optionsOrRecipient || {});

  const recipient = options.recipient || TARGET_EMAIL;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `FTTS_Daily_Backup_${dateStr}_${timeStr}.xlsx`;

  console.log(`[Daily Backup] Starting backup routine for ${recipient}...`);
  console.log(`[Daily Backup] Time: ${now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} (Cairo Time)`);

  let weRows = [];
  let vodafoneRows = [];
  let orangeRows = [];
  let etahaRows = [];

  // Prioritize live client data passed from UI (most up-to-date in-memory state)
  if (options.clientData) {
    console.log('[Daily Backup] Using client-provided live active dataset from browser state.');
    if (Array.isArray(options.clientData.we)) weRows = options.clientData.we;
    if (Array.isArray(options.clientData.vodafone)) vodafoneRows = options.clientData.vodafone;
    if (Array.isArray(options.clientData.orange)) orangeRows = options.clientData.orange;
    if (Array.isArray(options.clientData.etaha)) etahaRows = options.clientData.etaha;
  }

  // If any dataset is still empty, query Supabase and fallbacks
  if (weRows.length === 0 || vodafoneRows.length === 0 || orangeRows.length === 0 || etahaRows.length === 0) {
    const [liveWe, liveVodafone, liveOrange, liveEtaha] = await Promise.all([
      weRows.length > 0 ? null : fetchTable('we_records').then(res => res || fetchTable('we')),
      vodafoneRows.length > 0 ? null : fetchTable('vodafone_records'),
      orangeRows.length > 0 ? null : fetchTable('orange_records'),
      etahaRows.length > 0 ? null : fetchTable('etaha_records').then(res => res || fetchTable('etaha')),
    ]);

    if (weRows.length === 0) {
      weRows = (liveWe && liveWe.length > 0) ? liveWe : loadJsonFallback('We.json');
    }
    if (vodafoneRows.length === 0) {
      vodafoneRows = (liveVodafone && liveVodafone.length > 0) ? liveVodafone : loadJsonFallback('Vodafone.json');
    }
    if (orangeRows.length === 0) {
      orangeRows = (liveOrange && liveOrange.length > 0) ? liveOrange : loadJsonFallback('Orange_480.json');
    }
    if (etahaRows.length === 0) {
      etahaRows = (liveEtaha && liveEtaha.length > 0) ? liveEtaha : loadJsonFallback('Etaha_360.json');
    }
  }

  console.log(`[Daily Backup] Data counts: WE=${weRows.length}, Vodafone=${vodafoneRows.length}, Orange=${orangeRows.length}, Availability=${etahaRows.length}`);

  // Format sheets
  const wb = XLSX.utils.book_new();

  // Helper to format table rows cleanly
  const sanitizeRows = (list, defaultCompany) => {
    return list.map((item, idx) => {
      const raw = item.rawRecord || item.data || item;
      const code = item.siteCode || item['site code'] || item[' Site code'] || item.site_code || item.Code || raw[' Site code'] || raw['site code'] || `SITE-${idx + 1}`;
      return {
        'مسلسل': idx + 1,
        'Site Code': code,
        'المشغل': item.company || defaultCompany || 'WE',
        'سنترال الربط': item.central || item['سنترال الربط'] || raw['سنترال الربط'] || '',
        'التصنيف': item.classification || item['التصنيف'] || raw['التصنيف'] || '',
        'الحالة التنفيذية': item.status || item['التصنيف'] || '',
        'رئاسة قطاعات التنفيذ': item.sector || item['رئاسة قطاعات التنفيذ'] || raw['رئاسة قطاعات التنفيذ'] || '',
        'الادارة العامة لتنفيذ الشبكات': item.generalAdmin || item['الادارة العامة لتنفيذ الشبكات'] || raw['الادارة العامة لتنفيذ الشبكات'] || '',
        'إدارة التنفيذ المختصة': item.competentAdmin || item['ادارة التنفيذ الفرعية'] || item['إدارة التنفيذ المختصة'] || '',
        'تاريخ الانتهاء المتوقع': item.expectedDate || item['التاريخ المتوقع للانتهاء'] || '',
        'اسباب التعذر': item.obstacleReason || item['اسباب التعّذر'] || item['اسباب التعذر'] || '',
        'الملاحظات': item.notes || item['الملاحظات'] || '',
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
      'اسم العميل': item.clientName || raw['اسم العميل'] || 'العميل المعتمد',
      'اسم الفرع': item.branchName || raw['اسم الفرع'] || '',
      'العنوان': item.address || raw['العنوان'] || '',
      'القطاع': item.sector || raw['القطاعات'] || raw['القطاع'] || '',
      'الإدارة العامة': item.generalAdmin || raw['الادارة العامة المنفذة'] || raw['الإدارة العامة'] || raw['الادارة العامة'] || '',
      'إدارة التنفيذ المختصة': item.competentAdmin || raw['ادارة التنفيذ'] || raw['إدارة التنفيذ المختصة'] || '',
      'المسار الداخلي': raw['المسار الداخلى'] || raw['المسار الداخلي'] || 'غير محدد',
      'المسار الخارجي': raw['المسار الخارجي'] || 'غير محدد',
      'موقف التسليم': item.status || raw['موقف التسليم'] || raw['موقف_التسليم'] || raw['التصنيف'] || '',
      'الملاحظات': item.notes || raw['ملحوظه في حاله عدم الانتهاء'] || raw['الملاحظات'] || '',
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
    { 'البيان': 'حالة الحفظ السحابي', 'القيمة': 'نسخة احتياطية آلية ومحدثة من قاعدة البيانات' },
  ];
  addStyledSheet(summary, 'تقرير_النسخة_الاحتياطية');

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Save local copy to backups for archive (if filesystem writable)
  try {
    const backupDir = join(ROOT_DIR, 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    const localFilePath = join(backupDir, fileName);
    writeFileSync(localFilePath, excelBuffer);
    console.log(`[Daily Backup] Local backup copy saved: ${localFilePath}`);
  } catch {}

  const grandTotal = masterFtts.length + formattedEtaha.length;
  console.log(`[Daily Backup] Excel file generated successfully (${grandTotal} records, ${excelBuffer.length} bytes).`);

  // Email sending configuration
  const smtpUser = options.smtpUser || process.env.SMTP_USER || process.env.GMAIL_USER || 'Elsoltanalex@gmail.com';
  const smtpPass = options.smtpPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!smtpPass) {
    console.log(`\n======================================================`);
    console.log(`⚠️  [Daily Backup Notice] SMTP Credentials / Gmail App Password not yet configured!`);
    console.log(`   Target Email: ${recipient}`);
    console.log(`   File ready: ${fileName} (${excelBuffer.length} bytes, ${grandTotal} records)`);
    console.log(`======================================================\n`);
    return {
      success: true,
      emailSent: false,
      requiresPassword: true,
      message: 'تم تجهيز ملف النسخة الاحتياطية بنجاح (' + grandTotal + ' موقعاً). يرجى إدخال كلمة مرور تطبيقات Gmail لإتمام الإرسال الفوري للبريد.',
      fileName,
      totalRecords: grandTotal,
    };
  }

  console.log(`[Daily Backup] Connecting to SMTP server (${smtpHost}:${smtpPort}) as ${smtpUser} to deliver email to ${recipient}...`);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const isManual = options.triggerType === 'MANUAL_ON_DEMAND';
  const mailSubject = isManual
    ? `⚡ نسخة احتياطية فورية (طلب يدوي) - FTTS & Availability - ${dateStr}`
    : `📦 النسخة الاحتياطية اليومية التلقائية (12:00 AM) - FTTS & Availability - ${dateStr}`;
  const bannerTitle = isManual
    ? `⚡ نسخة احتياطية فورية (طلب يدوي)`
    : `📦 النسخة الاحتياطية اليومية التلقائية`;
  const bannerSubtitle = isManual
    ? `تم التوليد والإرسال فورياً بناءً على طلبك من لوحة التحكم (Send Backup Now)`
    : `تم التوليد والإرسال أوتوماتيكياً عبر الجدولة اليومية (الساعة 12:00 منتصف الليل)`;

  const mailOptions = {
    from: `"FTTS Backup System" <${smtpUser}>`,
    to: recipient,
    subject: mailSubject,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, ${isManual ? '#0d9488, #2563eb' : '#0284c7, #4f46e5'}); color: #ffffff; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">${bannerTitle}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">${bannerSubtitle}</p>
          </div>
          
          <div style="padding: 25px;">
            <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
              تحية طيبة،<br/>
              ${isManual ? 'بناءً على طلبك الفوري عبر زر <strong>"نسخة احتياطية الآن"</strong>، مرفق طيه أحدث نسخة احتياطية شاملة ومحدثة من قاعدة البيانات السحابية Supabase:' : 'مرفق طيه النسخة الاحتياطية اليومية التلقائية المجدولة والشاملة لكافة مشروعات FTTS ومشروعات Availability (الإتاحة) والعمليات الجديدة:'}
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">⚙️ نمط التشغيل:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: ${isManual ? '#0d9488' : '#2563eb'};">
                  ${isManual ? 'طلب يدوي فوري (Send Backup Now)' : 'جدولة أوتوماتيكية يومية (12:00 منتصف الليل)'}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📅 تاريخ التصدير:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">⏰ التوقيت:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${now.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo' })} (توقيت القاهرة)</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">🌐 إجمالي مواقع FTTS:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0284c7;">${masterFtts.length} موقعاً (WE: ${formattedWe.length} • Vodafone: ${formattedVodafone.length} • Orange: ${formattedOrange.length})</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📋 مشروعات Availability:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0d9488;">${formattedEtaha.length} مشروعاً معتمداً</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">📁 اسم الملف المرفق:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${fileName}</td>
              </tr>
            </table>

            <div style="background-color: #ecfdf5; border-right: 4px solid #10b981; padding: 12px; border-radius: 4px; font-size: 13px; color: #065f46;">
              ✅ تم تأمين واستخراج هذه النسخة بنجاح لحفظ وتأمين كافة بيانات المشروعات وسلامة العمليات والرجوع إليها في أي وقت.
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            منظومة المتابعة الرقمية للمشروعات القومية للفايبر والاتصالات • نظام النسخ الاحتياطي الهجين (أوتوماتيكي + فوري)
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
