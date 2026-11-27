// src/utils/proofDocument.ts
// Unified proof/status document detection & safe open/download helper across all FTTS, Availability & Digital Transformation modules

export interface ProofDocumentInfo {
  url: string;
  name: string;
  mimeType: string;
  isImage: boolean;
  isPdf: boolean;
  isDataUrl: boolean;
}

const URL_FIELD_CANDIDATES = [
  'documentUrl',
  'attachmentUrl',
  'attachment_url',
  'document_url',
  'proof_url',
  'proofUrl',
  'file_url',
  'fileUrl',
  'file_data',
  'fileData',
  'attachment_base64',
  'document_base64',
  'attachment',
  'document',
  'رابط المستند',
  'رابط المرفق',
  'المرفق',
  'مرفق',
  'المستند',
  'مستند',
];

const NAME_FIELD_CANDIDATES = [
  'documentName',
  'file_name',
  'fileName',
  'attachmentName',
  'attachment_name',
  'المستند',
  'اسم المستند',
  'اسم المرفق',
];

function isValidDocumentUrl(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (s.length < 8) return false;
  return (
    s.startsWith('https://') ||
    s.startsWith('http://') ||
    s.startsWith('data:') ||
    s.startsWith('blob:')
  );
}

function inferMimeType(url: string, name: string): string {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;,]+)/i);
    if (match && match[1]) return match[1].toLowerCase();
  }
  const combined = `${name} ${url}`.toLowerCase();
  if (combined.includes('.pdf') || combined.includes('application/pdf')) return 'application/pdf';
  if (combined.includes('.png')) return 'image/png';
  if (combined.includes('.jpg') || combined.includes('.jpeg')) return 'image/jpeg';
  if (combined.includes('.webp')) return 'image/webp';
  if (combined.includes('.gif')) return 'image/gif';
  if (combined.includes('.bmp')) return 'image/bmp';
  if (combined.includes('.svg')) return 'image/svg+xml';
  if (combined.includes('.doc') || combined.includes('.docx')) return 'application/msword';
  if (combined.includes('.xls') || combined.includes('.xlsx')) return 'application/vnd.ms-excel';
  return 'application/octet-stream';
}

function extractNameFromUrl(url: string, fallbackCode?: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').pop();
      if (last && last.length > 2) return decodeURIComponent(last);
    } catch {
      // ignore
    }
  }
  return fallbackCode ? `مستند-${fallbackCode}` : 'مستند إثبات الموقف';
}

/**
 * Inspects a SiteRecord or raw record across WE, Vodafone, Orange, الإتاحة, and التحول الرقمي
 * and returns normalized ProofDocumentInfo if an attached proof document exists, or null otherwise.
 */
export function getSiteProofDocument(record: any): ProofDocumentInfo | null {
  if (!record || typeof record !== 'object') return null;

  const sources: Record<string, any>[] = [record];
  if (record.rawRecord && typeof record.rawRecord === 'object') {
    sources.push(record.rawRecord);
    if (record.rawRecord.data && typeof record.rawRecord.data === 'object') {
      sources.push(record.rawRecord.data);
    }
  }
  if (record.data && typeof record.data === 'object') {
    sources.push(record.data);
  }

  let foundUrl = '';
  for (const src of sources) {
    for (const key of URL_FIELD_CANDIDATES) {
      const val = src[key];
      if (isValidDocumentUrl(val)) {
        foundUrl = val.trim();
        break;
      }
      // Handle nested object attachment `{ url, name }`
      if (val && typeof val === 'object' && isValidDocumentUrl(val.url)) {
        foundUrl = String(val.url).trim();
        break;
      }
    }
    if (foundUrl) break;
  }

  if (!foundUrl) return null;

  const siteCode = String(
    record.siteCode ||
      record['site code'] ||
      record['Site code'] ||
      record.site_code ||
      record.Code ||
      record['الكود'] ||
      ''
  ).trim();

  let foundName = '';
  for (const src of sources) {
    for (const key of NAME_FIELD_CANDIDATES) {
      const val = src[key];
      if (typeof val === 'string' && val.trim() && !isValidDocumentUrl(val)) {
        foundName = val.trim();
        break;
      }
    }
    if (foundName) break;
  }

  const name = foundName || extractNameFromUrl(foundUrl, siteCode);
  const mimeType = inferMimeType(foundUrl, name);
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isDataUrl = foundUrl.startsWith('data:');

  return {
    url: foundUrl,
    name,
    mimeType,
    isImage,
    isPdf,
    isDataUrl,
  };
}

/**
 * Converts a Base64 Data URL to a Blob so large PDFs/images open cleanly without browser blocks
 */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const base64 = parts[1];
    const mimeMatch = header.match(/data:([^;]+)/i);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function openProofDocumentInNewTab(doc: ProofDocumentInfo): void {
  if (doc.isDataUrl) {
    const blobUrl = dataUrlToBlobUrl(doc.url);
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }
  }
  window.open(doc.url, '_blank', 'noopener,noreferrer');
}

export function downloadProofDocument(doc: ProofDocumentInfo): void {
  let href = doc.url;
  let revokeLater = false;
  if (doc.isDataUrl) {
    const blobUrl = dataUrlToBlobUrl(doc.url);
    if (blobUrl) {
      href = blobUrl;
      revokeLater = true;
    }
  }
  const link = document.createElement('a');
  link.href = href;
  link.download = doc.name || 'proof-document';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (revokeLater) {
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }
}
