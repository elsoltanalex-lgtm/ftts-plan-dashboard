// api/cron/daily-backup.js
// Vercel Serverless Function / Cron Job Endpoint
// Triggered automatically by Vercel Cron daily at midnight Cairo time (22:00 UTC)
// or on-demand from the UI via "إرسال نسخة احتياطية الآن (Send Backup Now)"

import { runDailyBackup, TARGET_EMAIL } from '../../scripts/daily-backup-email.mjs';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const recipient = req.query.email || body.email || TARGET_EMAIL;
    const clientData = body.clientData || null;
    const smtpUser = body.smtpUser || null;
    const smtpPass = body.smtpPass || null;

    console.log(`[Vercel Cron API] Executing backup trigger for ${recipient}...`);

    const result = await runDailyBackup({
      recipient,
      clientData,
      smtpUser,
      smtpPass,
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient,
      fileName: result.fileName,
      totalRecords: result.totalRecords,
      emailSent: result.emailSent,
      requiresPassword: !!result.requiresPassword,
      message: result.message || (result.emailSent ? 'تم إرسال النسخة الاحتياطية بنجاح إلى البريد الإلكتروني' : 'تم تجهيز النسخة الاحتياطية بنجاح'),
    });
  } catch (error) {
    console.error('[Vercel Cron API] Error executing backup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تشغيل النسخة الاحتياطية',
    });
  }
}
