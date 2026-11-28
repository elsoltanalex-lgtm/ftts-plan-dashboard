// src/components/DuplicateSiteAlertBanner.tsx
// Shared prominent Arabic duplicate site-code warning banner with one-click switch to Edit mode

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { DuplicateSiteMatch } from '../utils/siteValidation';

interface DuplicateSiteAlertBannerProps {
  duplicate: DuplicateSiteMatch | null;
  onSwitchToEdit: (siteCode: string) => void;
}

export const DuplicateSiteAlertBanner: React.FC<DuplicateSiteAlertBannerProps> = ({
  duplicate,
  onSwitchToEdit,
}) => {
  if (!duplicate) return null;

  return (
    <div
      className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-extrabold text-xs sm:text-sm text-amber-950">
            {duplicate.message}
          </div>
          {duplicate.central && duplicate.central !== 'غير محدد' && (
            <div className="text-[11px] text-amber-800">
              السنترال: <strong>{duplicate.central}</strong>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSwitchToEdit(duplicate.siteCode)}
        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition shadow-xs"
      >
        فتح تعديل هذا الموقع ←
      </button>
    </div>
  );
};

export default DuplicateSiteAlertBanner;
