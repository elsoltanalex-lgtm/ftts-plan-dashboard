// src/components/ProofDocumentModal.tsx
// Built-in preview modal for site proof/status documents (images, PDFs, Office/scan files)

import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileCheck2,
} from 'lucide-react';
import {
  dataUrlToBlobUrl,
  downloadProofDocument,
  openProofDocumentInNewTab,
  type ProofDocumentInfo,
} from '../utils/proofDocument';

interface ProofDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProofDocumentInfo | null;
  siteCode?: string;
  siteName?: string;
}

export const ProofDocumentModal: React.FC<ProofDocumentModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  siteCode,
  siteName,
}) => {
  const [previewSrc, setPreviewSrc] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !doc) {
      setPreviewSrc('');
      return;
    }

    if (doc.isDataUrl && doc.isPdf) {
      const blobUrl = dataUrlToBlobUrl(doc.url);
      if (blobUrl) {
        setPreviewSrc(blobUrl);
        return () => URL.revokeObjectURL(blobUrl);
      }
    }
    setPreviewSrc(doc.url);
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-3.5 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              {doc.isImage ? (
                <ImageIcon className="w-4 h-4 text-emerald-300" />
              ) : (
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate flex items-center gap-2">
                <span>مستند إثبات الموقف</span>
                {siteCode && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/15 text-sky-200">
                    {siteCode}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                {doc.name} {siteName ? `• ${siteName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openProofDocumentInNewTab(doc)}
              className="px-3 py-1.5 bg-sky-600/80 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              title="فتح المستند في تبويب جديد"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تبويب جديد</span>
            </button>
            <button
              type="button"
              onClick={() => downloadProofDocument(doc)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              title="تحميل المستند"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحميل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Body */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4 min-h-[380px]">
          {doc.isImage && previewSrc ? (
            <img
              src={previewSrc}
              alt={doc.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
            />
          ) : doc.isPdf && previewSrc ? (
            <iframe
              src={previewSrc}
              title={doc.name}
              className="w-full h-[75vh] rounded-xl border border-slate-300 bg-white shadow-sm"
            />
          ) : (
            <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{doc.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  هذا النوع من الملفات جاهز للفتح أو التحميل المباشر على جهازك.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openProofDocumentInNewTab(doc)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح المستند</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadProofDocument(doc)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
