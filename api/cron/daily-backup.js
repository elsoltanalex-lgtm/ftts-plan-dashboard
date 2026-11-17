// api/cron/daily-backup.js
// Vercel Serverless Function / Cron Job Endpoint
// Triggered automatically by Vercel Cron daily at midnight Cairo time (22:00 UTC)

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
    const targetRecipient = req.query.email || req.body?.email || TARGET_EMAIL;
    console.log(`[Vercel Cron API] Executing daily backup trigger for ${targetRecipient}...`);

    const result = await runDailyBackup(targetRecipient);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient: targetRecipient,
      fileName: result.fileName,
      totalRecords: result.totalRecords,
      emailSent: result.emailSent,
      message: result.message || (result.emailSent ? 'تم إرسال النسخة الاحتياطية بنجاح إلى البريد الإلكتروني' : 'تم تجهيز النسخة الاحتياطية بنجاح'),
    });
  } catch (error) {
    console.error('[Vercel Cron API] Error executing backup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تشغيل النسخة الاحتياطية اليومية',
    });
  }
}
