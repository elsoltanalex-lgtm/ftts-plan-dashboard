// src/components/OrangeDataAnalysisModal.tsx
// Comprehensive Executive Analytics Modal for Orange Network (Matches Official Orange Portal Reports)

import React, { useState, useMemo } from 'react';
import type { SiteRecord } from '../types/dashboard';
import {
  X,
  BarChart3,
  Building2,
  FileText,
  Zap,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export interface OrangeDataAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  orangeSites: SiteRecord[];
}

export const OrangeDataAnalysisModal: React.FC<OrangeDataAnalysisModalProps> = ({
  isOpen,
  onClose,
  orangeSites,
}) => {
  const [activeTab, setActiveTab] = useState<
    'civil' | 'electrical' | 'attachments' | 'delivery' | 'obstacles' | 'links' | 'comparison'
  >('civil');

  // Sector filter inside analysis
  const [selectedSector, setSelectedSector] = useState<string>('All');

  // Sectors list
  const sectors = useMemo(() => {
    const s = new Set<string>();
    orangeSites.forEach((site) => {
      if (site.sector) s.add(site.sector);
    });
    return Array.from(s);
  }, [orangeSites]);

  const filtered = useMemo(() => {
    if (selectedSector === 'All') return orangeSites;
    return orangeSites.filter((s) => s.sector === selectedSector);
  }, [orangeSites, selectedSector]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalSites = filtered.length;
    const totalLinks = filtered.reduce((acc, s) => acc + (s.linksCount || 1), 0);
    const completedSites = filtered.filter(
      (s) => s.classification.includes('تم الانتهاء') || s.status.includes('تم')
    ).length;
    const completedLinks = filtered
      .filter((s) => s.classification.includes('تم الانتهاء') || s.status.includes('تم'))
      .reduce((acc, s) => acc + (s.linksCount || 1), 0);
    const permitsSites = filtered.filter((s) => s.classification.includes('تصاريح')).length;
    const inspectionSites = filtered.filter((s) => s.classification.includes('معاين')).length;
    const stalledSites = filtered.filter(
      (s) => s.classification.includes('متعذر') || s.status === 'متعذر'
    ).length;
    const obstacleSites = filtered.filter(
      (s) => s.classification.includes('معوق') || s.status === 'معوقات'
    ).length;
    const deliveredOrange = filtered.filter((s) => s.deliveryOrange?.includes('تم التسليم')).length;
    const attachedDocs = filtered.filter((s) => s.documentStatus === 'تم الارفاق').length;

    return {
      totalSites,
      totalLinks,
      completedSites,
      completedLinks,
      permitsSites,
      inspectionSites,
      stalledSites,
      obstacleSites,
      deliveredOrange,
      attachedDocs,
    };
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Sticky Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>التحليل الإحصائي المتقدم لمواقع شبكة Orange</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
                  {stats.totalSites} موقع • {stats.totalLinks} لينك
                </span>
              </h2>
              <p className="text-xs text-orange-100 font-medium">
                توزيع وتقارير الموقف العام للتنفيذ المدني والكهربي ومرفقات التسليمات طبقاً للبيانات المعتمدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="All" className="text-slate-800">
                كافة رئاسات القطاعات
              </option>
              {sectors.map((sec) => (
                <option key={sec} value={sec} className="text-slate-800">
                  {sec}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-bold">إجمالي المواقع واللينكات</span>
            <span className="text-base font-black text-slate-800 font-mono">
              {stats.totalSites} <span className="text-xs font-normal text-slate-400">({stats.totalLinks} L)</span>
            </span>
          </div>

          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-emerald-700 block text-[11px] font-bold">تم الانتهاء مدني</span>
            <span className="text-base font-black text-emerald-800 font-mono">
              {stats.completedSites} <span className="text-xs font-normal text-emerald-600">({stats.completedLinks} L)</span>
            </span>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-amber-700 block text-[11px] font-bold">جاري تصاريح</span>
            <span className="text-base font-black text-amber-800 font-mono">{stats.permitsSites}</span>
          </div>

          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
            <span className="text-blue-700 block text-[11px] font-bold">جاري المعاينة</span>
            <span className="text-base font-black text-blue-800 font-mono">{stats.inspectionSites}</span>
          </div>

          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-rose-700 block text-[11px] font-bold">متعذرات ومعوقات</span>
            <span className="text-base font-black text-rose-800 font-mono">
              {stats.stalledSites + stats.obstacleSites}
            </span>
          </div>

          <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-200 shadow-2xs">
            <span className="text-orange-700 block text-[11px] font-bold">تم التسليم لاورنج</span>
            <span className="text-base font-black text-orange-800 font-mono">{stats.deliveredOrange}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 bg-white shrink-0 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('civil')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'civil'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. الموقف العام للتصنيف المدني</span>
          </button>

          <button
            onClick={() => setActiveTab('electrical')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'electrical'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. التصنيف الكهربي</span>
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>3. موقف المرفقات والإثبات</span>
          </button>

          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'delivery'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>4. تأكيد التسليمات</span>
          </button>

          <button
            onClick={() => setActiveTab('obstacles')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'obstacles'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>5. تفصيل المعوقات</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'links'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>6. توضيح اللينكات</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comparison'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>7. الموقف الزمني والأسبوعي</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: Civil Classification Pivot */}
          {activeTab === 'civil' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm">
                  📊 جدول الموقف العام للتصنيف المدني (القطاعات × مسؤولية التنفيذ):
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  مطابق لجدول البيفت المعتمد لتقرير Orange
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-b">رئاسة القطاعات</th>
                      <th className="p-2.5 border-b">مسؤولية التنفيذ</th>
                      <th className="p-2.5 border-b text-center bg-emerald-50 text-emerald-800">تم الانتهاء مدني</th>
                      <th className="p-2.5 border-b text-center bg-amber-50 text-amber-800">جاري تصاريح</th>
                      <th className="p-2.5 border-b text-center bg-blue-50 text-blue-800">جاري العمل مدني</th>
                      <th className="p-2.5 border-b text-center bg-indigo-50 text-indigo-800">جاري المعاينة</th>
                      <th className="p-2.5 border-b text-center bg-rose-50 text-rose-800">متعذرات</th>
                      <th className="p-2.5 border-b text-center bg-orange-50 text-orange-800">معوقات</th>
                      <th className="p-2.5 border-b text-center font-black">إجمالي المواقع</th>
                      <th className="p-2.5 border-b text-center font-black">إجمالي اللينكات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold" rowSpan={2}>القاهرة الكبرى</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">4</td>
                      <td className="p-2.5 text-center">40</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center font-bold">50</td>
                      <td className="p-2.5 text-center font-bold">71</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans">المناطق</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">42</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center font-bold">43</td>
                      <td className="p-2.5 text-center font-bold">71</td>
                    </tr>
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 font-sans" colSpan={2}>إجمالي القاهرة الكبرى</td>
                      <td className="p-2.5 text-center text-emerald-700">46</td>
                      <td className="p-2.5 text-center">41</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center">93</td>
                      <td className="p-2.5 text-center">142</td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold">الجيزة و أكتوبر</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">2</td>
                      <td className="p-2.5 text-center">9</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">35</td>
                      <td className="p-2.5 text-center">6</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center font-bold">54</td>
                      <td className="p-2.5 text-center font-bold">71</td>
                    </tr>
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 font-sans" colSpan={2}>إجمالي الجيزة و أكتوبر</td>
                      <td className="p-2.5 text-center text-emerald-700">2</td>
                      <td className="p-2.5 text-center">9</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">35</td>
                      <td className="p-2.5 text-center">6</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center">54</td>
                      <td className="p-2.5 text-center">71</td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold" rowSpan={2}>المنطقة الجنوبية</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">7</td>
                      <td className="p-2.5 text-center">19</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center">35</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center font-bold">65</td>
                      <td className="p-2.5 text-center font-bold">106</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans">المناطق</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">55</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center font-bold">60</td>
                      <td className="p-2.5 text-center font-bold">86</td>
                    </tr>
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 font-sans" colSpan={2}>إجمالي المنطقة الجنوبية</td>
                      <td className="p-2.5 text-center text-emerald-700">63</td>
                      <td className="p-2.5 text-center">19</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center">38</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center">125</td>
                      <td className="p-2.5 text-center">192</td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold" rowSpan={2}>المنطقة الشرقية</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">5</td>
                      <td className="p-2.5 text-center">18</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center">29</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">7</td>
                      <td className="p-2.5 text-center font-bold">62</td>
                      <td className="p-2.5 text-center font-bold">102</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans">المناطق</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">44</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">2</td>
                      <td className="p-2.5 text-center font-bold">48</td>
                      <td className="p-2.5 text-center font-bold">73</td>
                    </tr>
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 font-sans" colSpan={2}>إجمالي المنطقة الشرقية</td>
                      <td className="p-2.5 text-center text-emerald-700">49</td>
                      <td className="p-2.5 text-center">19</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center">29</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">9</td>
                      <td className="p-2.5 text-center">110</td>
                      <td className="p-2.5 text-center">175</td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold" rowSpan={2}>المنطقة الغربية</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">6</td>
                      <td className="p-2.5 text-center">7</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">9</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center font-bold">30</td>
                      <td className="p-2.5 text-center font-bold">54</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans">المناطق</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">10</td>
                      <td className="p-2.5 text-center">9</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center">14</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center font-bold">39</td>
                      <td className="p-2.5 text-center font-bold">53</td>
                    </tr>
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 font-sans" colSpan={2}>إجمالي المنطقة الغربية</td>
                      <td className="p-2.5 text-center text-emerald-700">16</td>
                      <td className="p-2.5 text-center">16</td>
                      <td className="p-2.5 text-center">3</td>
                      <td className="p-2.5 text-center">23</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center">7</td>
                      <td className="p-2.5 text-center">69</td>
                      <td className="p-2.5 text-center">107</td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold">اسكندرية و الساحل</td>
                      <td className="p-2.5 font-sans">إدارة التنفيذ</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">19</td>
                      <td className="p-2.5 text-center">4</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">0</td>
                      <td className="p-2.5 text-center">5</td>
                      <td className="p-2.5 text-center font-bold">29</td>
                      <td className="p-2.5 text-center font-bold">29</td>
                    </tr>

                    {/* Grand Total */}
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="p-3 font-sans" colSpan={2}>الإجمالي العام لشبكة Orange</td>
                      <td className="p-3 text-center text-emerald-400">195</td>
                      <td className="p-3 text-center text-amber-300">108</td>
                      <td className="p-3 text-center text-blue-300">11</td>
                      <td className="p-3 text-center text-indigo-300">125</td>
                      <td className="p-3 text-center text-rose-300">11</td>
                      <td className="p-3 text-center text-orange-300">30</td>
                      <td className="p-3 text-center text-white">480</td>
                      <td className="p-3 text-center text-white">716</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Electrical Classification */}
          {activeTab === 'electrical' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                ⚡ التصنيف الكهربي للمواقع المنتهية مدنياً (194 موقع):
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-700 font-bold block">تم الانتهاء كهربي</span>
                  <span className="text-2xl font-black text-emerald-900 font-mono">180</span>
                  <span className="text-emerald-600 block text-[11px] mt-1">يمثل 261 لينك</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-blue-700 font-bold block">جاري العمل كهربي</span>
                  <span className="text-2xl font-black text-blue-900 font-mono">7</span>
                  <span className="text-blue-600 block text-[11px] mt-1">يمثل 9 لينكات</span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-700 font-bold block">معوقات كهربي (مالك)</span>
                  <span className="text-2xl font-black text-amber-900 font-mono">7</span>
                  <span className="text-amber-600 block text-[11px] mt-1">يمثل 14 لينك</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                📎 موقف المرفقات ومستندات الإثبات للمواقع المنتهية:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-700 font-bold block">تم الإرفاق (مستند معتمد)</span>
                  <span className="text-2xl font-black text-emerald-900 font-mono">87</span>
                  <span className="text-emerald-600 block text-[11px] mt-1">119 لينك</span>
                </div>
                <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl">
                  <span className="text-slate-700 font-bold block">لم يتم الإرفاق (إدارة التنفيذ)</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">88</span>
                  <span className="text-slate-500 block text-[11px] mt-1">135 لينك</span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-700 font-bold block">لم يتم الإرفاق (تخص المناطق)</span>
                  <span className="text-2xl font-black text-amber-900 font-mono">5</span>
                  <span className="text-amber-600 block text-[11px] mt-1">7 لينكات</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Delivery Confirmation */}
          {activeTab === 'delivery' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                🤝 تأكيد التسليم للمنطقة وموقف التسليم لأورنج:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-800 border-b pb-1.5">تأكيد التسليم للمنطقة (87 موقع مرفق):</h4>
                  <div className="flex justify-between py-1"><span>تم التسليم</span><span className="font-bold font-mono">32 موقع</span></div>
                  <div className="flex justify-between py-1"><span>منفذ من قبل المنطقة</span><span className="font-bold font-mono">53 موقع</span></div>
                  <div className="flex justify-between py-1"><span>منفذ من قبل أورنج</span><span className="font-bold font-mono">2 موقع</span></div>
                </div>

                <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-orange-950 border-b border-orange-200 pb-1.5">موقف التسليم لأورنج:</h4>
                  <div className="flex justify-between py-1 text-orange-900"><span>تم التسليم لأورنج</span><span className="font-bold font-mono text-emerald-700">7 مواقع (13 L)</span></div>
                  <div className="flex justify-between py-1 text-orange-900"><span>لم يتم التسليم لأورنج (جاهز / MMR)</span><span className="font-bold font-mono">80 موقع (106 L)</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Obstacles Breakdown */}
          {activeTab === 'obstacles' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                ⚠️ تفصيل المعوقات والمتعذرات السبعة (41 موقع معوق ومتعذر):
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-b">نوع المعوق / المتعذر</th>
                      <th className="p-2.5 border-b text-center">عدد المواقع</th>
                      <th className="p-2.5 border-b text-center">عدد اللينكات</th>
                      <th className="p-2.5 border-b">أبرز القطاعات المتأثرة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr><td className="p-2.5 font-sans font-bold">رفض استخراج تصاريح</td><td className="p-2.5 text-center font-bold text-red-600">9</td><td className="p-2.5 text-center">20</td><td className="p-2.5 font-sans">الجيزة وأكتوبر، الغربية، القاهرة</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">معوقات تصاريح دخول</td><td className="p-2.5 text-center font-bold text-red-600">10</td><td className="p-2.5 text-center">15</td><td className="p-2.5 font-sans">الشرقية، اسكندرية والساحل</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">مؤجل من قبل اورنج</td><td className="p-2.5 text-center font-bold text-amber-600">12</td><td className="p-2.5 text-center">17</td><td className="p-2.5 font-sans">الغربية، القاهرة الكبرى</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">معوقات (مالك)</td><td className="p-2.5 text-center font-bold text-amber-600">6</td><td className="p-2.5 text-center">9</td><td className="p-2.5 font-sans">الشرقية، الجنوبية، اسكندرية</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">معوقات ملف إنشاء</td><td className="p-2.5 text-center">2</td><td className="p-2.5 text-center">3</td><td className="p-2.5 font-sans">الجيزة وأكتوبر</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">تكلفة مرتفعة</td><td className="p-2.5 text-center">1</td><td className="p-2.5 text-center">3</td><td className="p-2.5 font-sans">المنطقة الغربية</td></tr>
                    <tr><td className="p-2.5 font-sans font-bold">عدم إمكانية التنفيذ</td><td className="p-2.5 text-center">1</td><td className="p-2.5 text-center">1</td><td className="p-2.5 font-sans">المنطقة الغربية</td></tr>
                    <tr className="bg-slate-900 text-white font-bold"><td className="p-2.5 font-sans">الإجمالي</td><td className="p-2.5 text-center text-red-300">41</td><td className="p-2.5 text-center">68</td><td className="p-2.5 font-sans">كافة القطاعات</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: Links Count Breakdown */}
          {activeTab === 'links' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                🔗 توضيح اللينكات لأبراج Orange المنتهية مدنياً (180 موقع):
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center"><span className="text-slate-500 font-sans block text-xs">1 Link</span><span className="text-xl font-bold text-slate-800">131 موقع</span></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center"><span className="text-slate-500 font-sans block text-xs">2 Links</span><span className="text-xl font-bold text-slate-800">29 موقع</span></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center"><span className="text-slate-500 font-sans block text-xs">3 Links</span><span className="text-xl font-bold text-slate-800">8 مواقع</span></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center"><span className="text-slate-500 font-sans block text-xs">4 Links</span><span className="text-xl font-bold text-slate-800">12 موقع</span></div>
              </div>
            </div>
          )}

          {/* TAB 7: Comparison & Weekly Evolution */}
          {activeTab === 'comparison' && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                📈 المقارنة الزمنية والتطور الأسبوعي (28-10-2026 مقابل 04-11-2026):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-bold block">موقف 28-10-2026</span>
                  <span className="text-xl font-black text-slate-800 font-mono">191 موقع</span>
                  <span className="text-slate-400 block text-[11px] mt-1">278 لينك منجز</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-700 font-bold block">موقف 04-11-2026 (الحالي)</span>
                  <span className="text-xl font-black text-emerald-900 font-mono">194 موقع</span>
                  <span className="text-emerald-600 block text-[11px] mt-1">284 لينك منجز</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-blue-700 font-bold block">فرق الإنجاز الأسبوعي (+W)</span>
                  <span className="text-xl font-black text-blue-900 font-mono">+3 مواقع</span>
                  <span className="text-blue-600 block text-[11px] mt-1">+6 لينكات منجزة بالأسبوع</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>منظومة المشروعات القومية للاتصالات • تقارير المتابعة التحليلية لـ Orange</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

