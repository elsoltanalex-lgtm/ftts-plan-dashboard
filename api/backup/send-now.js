// api/backup/send-now.js
// Dedicated On-Demand Endpoint for "نسخة احتياطية الآن" (Send Backup Now)
// Triggered on-demand when the user clicks the manual backup button in Admin Dashboard

import { runDailyBackup, TARGET_EMAIL } from '../../scripts/daily-backup-email.mjs';

export default async function handler(req, res) {
  // CORS configuration
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

    console.log(`[Manual Send Backup Now] Triggered on-demand for recipient: ${recipient}...`);

    const result = await runDailyBackup({
      recipient,
      clientData,
      smtpUser,
      smtpPass,
      triggerType: 'MANUAL_ON_DEMAND',
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient,
      triggerType: 'MANUAL_ON_DEMAND',
      fileName: result.fileName,
      totalRecords: result.totalRecords,
      emailSent: result.emailSent,
      requiresPassword: !!result.requiresPassword,
      message: result.message || (result.emailSent ? `تم إرسال النسخة الاحتياطية بنجاح إلى ${recipient}` : 'تم تجهيز ملف النسخة الاحتياطية بنجاح'),
    });
  } catch (error) {
    console.error('[Manual Send Backup Now] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إرسال النسخة الاحتياطية',
    });
  }
}
