// api/cron/daily-backup.js
// Vercel Serverless Function / Cron Job Endpoint
// Triggered automatically by Vercel Cron daily at midnight Cairo time (22:00 UTC)

import { runDailyBackup, TARGET_EMAIL } from '../../scripts/daily-backup-email.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`[Vercel Midnight Cron] Executing daily automated backup routine for ${TARGET_EMAIL}...`);

    const result = await runDailyBackup({
      recipient: TARGET_EMAIL,
      triggerType: 'AUTOMATED_CRON',
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient: TARGET_EMAIL,
      triggerType: 'AUTOMATED_CRON',
      ...result,
      buffer: undefined,
    });
  } catch (error) {
    console.error('[Vercel Midnight Cron] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تشغيل النسخة الاحتياطية المجدولة',
    });
  }
}
