// scripts/daily-backup-email.mjs
// Automated Daily Backup & Email Script for FTTS & Availability Dashboard
// Scheduled to run daily at midnight (12:00 AM Cairo Time) and on-demand via UI

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

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
    console.log(`[Backup] Supabase table [${tableName}]: fetched ${data.length} live rows.`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Safely load JSON from server/data
 */
function loadJsonFallback(filename) {
  try {
    const p = join(ROOT_DIR, 'server', 'data', filename);
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.records)) return parsed.records;
    }
  } catch {}
  return [];
}

/**
 * Main routine: Supports invocation with options object
 */
export async function runDailyBackup(optionsOrRecipient = null) {
  const options = (typeof optionsOrRecipient === 'string')
    ? { recipient: optionsOrRecipient }
    : (optionsOrRecipient || {});

  const recipient = options.recipient || TARGET_EMAIL;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `FTTS_Backup_${dateStr}_${timeStr}.xlsx`;

  console.log(`[Backup] Starting routine for ${recipient}...`);
  console.log(`[Backup] Time: ${now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} (Cairo Time)`);

  let weRows = [];
  let vodafoneRows = [];
  let orangeRows = [];
  let etahaRows = [];

  // Query Supabase tables with local JSON fallbacks
  const [liveWe, liveVodafone, liveOrange, liveEtaha] = await Promise.all([
    fetchTable('we_records').then(res => res || fetchTable('we')),
    fetchTable('vodafone_records'),
    fetchTable('orange_records'),
    fetchTable('etaha_records').then(res => res || fetchTable('etaha')),
  ]);

  weRows = (liveWe && liveWe.length > 0) ? liveWe : loadJsonFallback('We.json');
  vodafoneRows = (liveVodafone && liveVodafone.length > 0) ? liveVodafone : loadJsonFallback('Vodafone.json');
  orangeRows = (liveOrange && liveOrange.length > 0) ? liveOrange : loadJsonFallback('Orange_480.json');
  etahaRows = (liveEtaha && liveEtaha.length > 0) ? liveEtaha : loadJsonFallback('Etaha_360.json');

  console.log(`[Backup] Counts: WE=${weRows.length}, Vodafone=${vodafoneRows.length}, Orange=${orangeRows.length}, Availability=${etahaRows.length}`);

  // Format Excel sheets
  const wb = XLSX.utils.book_new();

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

  const masterFtts = [...formattedWe, ...formattedVodafone, ...formattedOrange];

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

  addStyledSheet(masterFtts, 'Master_FTTS_Plan');
  addStyledSheet(formattedWe, 'WE_Rollout');
  addStyledSheet(formattedVodafone, 'Vodafone_Plan');
  addStyledSheet(formattedOrange, 'Orange_Plan');
  addStyledSheet(formattedEtaha, 'Availability_الإتاحة');

  const summary = [
    { 'البيان': 'منظومة المتابعة', 'القيمة': 'Fiber Tracking Board (FTTS & Availability)' },
    { 'البيان': 'تاريخ وتوقيت التصدير', 'القيمة': now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) },
    { 'البيان': 'البريد المرسل إليه', 'القيمة': recipient },
    { 'البيان': 'نمط التوليد', 'القيمة': options.triggerType === 'MANUAL_ON_DEMAND' ? 'طلب فوري مباشر (Send Backup Now)' : 'جدولة يومية أوتوماتيكية (12:00 AM)' },
    { 'البيان': 'إجمالي مواقع FTTS المجمعة', 'القيمة': masterFtts.length },
    { 'البيان': 'عدد مواقع WE', 'القيمة': formattedWe.length },
    { 'البيان': 'عدد مواقع Vodafone', 'القيمة': formattedVodafone.length },
    { 'البيان': 'عدد مواقع Orange', 'القيمة': formattedOrange.length },
    { 'البيان': 'عدد مشروعات Availability (الإتاحة)', 'القيمة': formattedEtaha.length },
    { 'البيان': 'إجمالي السجلات المؤمّنة', 'القيمة': masterFtts.length + formattedEtaha.length },
  ];
  addStyledSheet(summary, 'تقرير_النسخة_الاحتياطية');

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Safe file write (works on both local dev and serverless /tmp)
  try {
    const tmpDir = os.tmpdir();
    const tmpPath = join(tmpDir, fileName);
    writeFileSync(tmpPath, excelBuffer);
    console.log(`[Backup] Copy written to temporary storage: ${tmpPath}`);
  } catch {}

  const grandTotal = masterFtts.length + formattedEtaha.length;
  console.log(`[Backup] Excel generated: ${grandTotal} records, ${excelBuffer.length} bytes.`);

  // ── Determine Email Service Credentials ──
  const resendApiKey = options.resendApiKey || process.env.RESEND_API_KEY;
  const gmailUser = options.gmailUser || options.smtpUser || process.env.GMAIL_USER || process.env.SMTP_USER || 'Elsoltanalex@gmail.com';
  const gmailPass = options.gmailAppPassword || options.smtpPass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

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

  const htmlContent = `
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
          منظومة المتابعة الرقمية للمشروعات القومية للفايبر والاتصالات • إرسال معتمد
        </div>
      </div>
    </div>
  `;

  // ── 1. Try Resend if configured (Most reliable on Vercel) ──
  if (resendApiKey) {
    try {
      console.log(`[Backup] Sending email via Resend API to ${recipient}...`);
      const resend = new Resend(resendApiKey);
      const resendResult = await resend.emails.send({
        from: 'FTTS System <onboarding@resend.dev>',
        to: recipient,
        subject: mailSubject,
        html: htmlContent,
        attachments: [
          {
            filename: fileName,
            content: excelBuffer.toString('base64'),
          },
        ],
      });

      console.log('[Backup] ✅ Successfully sent via Resend API!', resendResult);
      return {
        success: true,
        emailSent: true,
        provider: 'Resend',
        messageId: resendResult?.data?.id || 'resend-ok',
        fileName,
        totalRecords: grandTotal,
        message: `تم إرسال النسخة الاحتياطية بنجاح عبر Resend إلى ${recipient}`,
      };
    } catch (resendErr) {
      console.error('[Backup] Resend error:', resendErr);
      // Fall through to Nodemailer
    }
  }

  // ── 2. Try Nodemailer / Gmail SMTP ──
  if (gmailPass) {
    try {
      console.log(`[Backup] Sending email via Gmail SMTP as ${gmailUser} to ${recipient}...`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''), // clean any spaces in Google 16-char app password
        },
      });

      const info = await transporter.sendMail({
        from: `"FTTS Backup System" <${gmailUser}>`,
        to: recipient,
        subject: mailSubject,
        html: htmlContent,
        attachments: [
          {
            filename: fileName,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });

      console.log(`[Backup] ✅ Successfully sent via Gmail SMTP! MessageId: ${info.messageId}`);
      return {
        success: true,
        emailSent: true,
        provider: 'Gmail SMTP',
        messageId: info.messageId,
        fileName,
        totalRecords: grandTotal,
        message: `تم إرسال النسخة الاحتياطية بنجاح عبر Gmail إلى ${recipient}`,
      };
    } catch (smtpErr) {
      console.error('[Backup] Gmail SMTP error:', smtpErr);
      return {
        success: false,
        emailSent: false,
        error: `خطأ في اتصال خادم البريد (Gmail SMTP): ${smtpErr.message}`,
        fileName,
        totalRecords: grandTotal,
      };
    }
  }

  // ── 3. Neither Resend nor Gmail password is set ──
  console.log(`[Backup Notice] No email provider configured yet!`);
  return {
    success: false,
    emailSent: false,
    requiresConfig: true,
    error: 'MISSING_EMAIL_CREDENTIALS',
    message: 'يتطلب إرسال الإيميل تزويد مفتاح Resend API أو كلمة مرور تطبيقات Gmail (App Password). يمكنك إدخالها مباشرة في النافذة التالية أو إضافتها في إعدادات Vercel.',
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
