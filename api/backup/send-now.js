// api/backup/send-now.js
// Dedicated On-Demand Endpoint for "نسخة احتياطية الآن" (Send Backup Now)

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

    console.log(`[Send Backup Now API] Running on-demand backup for: ${recipient}...`);

    const result = await runDailyBackup({
      recipient,
      triggerType: 'MANUAL_ON_DEMAND',
    });

    if (!result.emailSent) {
      return res.status(result.requiresConfig ? 400 : 500).json({
        success: false,
        requiresConfig: !!result.requiresConfig,
        error: result.error || 'لم يتم إرسال الإيميل',
        message: result.message || 'فشل إرسال الإيميل، يرجى التحقق من إعدادات البريد.',
        fileName: result.fileName,
        totalRecords: result.totalRecords,
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient,
      triggerType: 'MANUAL_ON_DEMAND',
      provider: result.provider,
      messageId: result.messageId,
      fileName: result.fileName,
      totalRecords: result.totalRecords,
      message: result.message || `تم إرسال النسخة الاحتياطية بنجاح إلى ${recipient}`,
    });
  } catch (error) {
    console.error('[Send Backup Now API] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ تقني في معالجة النسخة الاحتياطية',
    });
  }
}
