import React, { useState } from 'react';
import { SessionSettings, TemplateCategory, ViewTab } from '../types/photobooth';
import { FILTER_OPTIONS, PHOTO_TEMPLATES } from '../data/mockData';
import { PlanTier, getPlanMeta, isFilterLocked, isTemplateLocked } from '../utils/subscription';
import { StripTemplateArtwork } from './StripTemplateArtwork';

interface TemplateViewProps {
  settings: SessionSettings;
  onUpdateSettings: (updates: Partial<SessionSettings>) => void;
  onNavigate: (tab: ViewTab) => void;
  planTier: PlanTier;
  creditsRemaining: number;
  creditsTotal: number;
  onRequestUpgrade: (reason: string) => void;
}

const THEME_CATEGORY_TABS: { id: 'all' | TemplateCategory; label: string }[] = [
  { id: 'all', label: `Semua (${PHOTO_TEMPLATES.length})` },
  { id: 'ticket', label: 'Tiket & Pos' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'y2k', label: 'Y2K & Pop' },
  { id: 'romantic', label: 'Romantis' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'film', label: 'Film & Analog' }
];

export const TemplateView: React.FC<TemplateViewProps> = ({
  settings,
  onUpdateSettings,
  onNavigate,
  planTier,
  creditsRemaining,
  creditsTotal,
  onRequestUpgrade
}) => {
  const [activeThemeCategory, setActiveThemeCategory] = useState<'all' | TemplateCategory>('all');
  const planMeta = getPlanMeta(planTier);

  const selectedTemplate =
    PHOTO_TEMPLATES.find((t) => t.id === settings.templateId) || PHOTO_TEMPLATES[0];

  const filteredTemplates = PHOTO_TEMPLATES.filter((template) => {
    if (activeThemeCategory === 'all') return true;
    return template.category === activeThemeCategory;
  });

  return (
    <div className="flex flex-col w-full pb-40 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section (Clean Editorial Hierarchy, Zero Pill/Pulse Slop) */}
      <div className="pt-2 pb-5 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-[#516070] tabular-nums">
            Langkah 1 dari 3
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="w-6 h-1.5 rounded-full bg-[#142b4a]" />
            <div className="w-2 h-1.5 rounded-full bg-[#c4c6ce]" />
            <div className="w-2 h-1.5 rounded-full bg-[#c4c6ce]" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="font-headline text-[26px] sm:text-[32px] text-[#001632] font-black tracking-tight leading-tight text-balance">
              Pilih Desain Strip Fotomu
            </h1>
            <p className="text-[14px] text-[#516070] mt-1 max-w-xl leading-relaxed">
              Setiap format memiliki proporsi, bingkai cetak, dan karakter visual berbeda. Kamu tetap bisa menyesuaikan warna dan stiker setelah memotret.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-1 shrink-0">
            <span className="text-[12px] font-medium text-[#516070] tabular-nums whitespace-nowrap">
              Menampilkan {filteredTemplates.length} dari {PHOTO_TEMPLATES.length} format
            </span>
            <span className="text-[11px] font-bold text-[#142b4a] bg-[#eef2f8] px-2.5 py-1 rounded-lg tabular-nums">
              {planMeta.isUnlimited
                ? `${planMeta.label} · Unlimited`
                : `${planMeta.label} · Sisa Kuota ${creditsRemaining}/${creditsTotal}`}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Category Filter Bar (Single-line interactive buttons, no emoji pills) */}
      <div className="py-4 overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1 p-1 bg-[#eef2f8] rounded-xl whitespace-nowrap">
          {THEME_CATEGORY_TABS.map((cat) => {
            const active = activeThemeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveThemeCategory(cat.id)}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#142b4a] text-white shadow-xs'
                    : 'text-[#516070] hover:text-[#001632] hover:bg-white/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive 2–4 Column Template Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => {
          const isSelected = template.id === settings.templateId;
          const isLocked = isTemplateLocked(template, planTier);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  onRequestUpgrade(
                    `Template "${template.name}" terkunci dengan ikon gembok untuk pengguna Free. Upgrade untuk membuka semua template viral.`
                  );
                  return;
                }
                onUpdateSettings({
                  templateId: template.id,
                  frameColor: template.defaultBg,
                  framePattern: template.defaultPattern || 'none'
                });
              }}
              aria-pressed={isSelected}
              className={`relative w-full flex flex-col items-stretch justify-between p-2.5 rounded-2xl bg-[#ffffff] border text-left transition-all cursor-pointer group ${
                isLocked
                  ? 'border-[#e2e8f0] opacity-90 hover:border-[#142b4a]/40'
                  : isSelected
                  ? 'border-[#142b4a] ring-2 ring-[#142b4a]/20 shadow-md'
                  : 'border-[#e2e8f0] hover:border-[#142b4a]/45 hover:shadow-sm'
              }`}
            >
              <div className="relative">
                <StripTemplateArtwork template={template} isSelected={isSelected} />
                {isLocked && (
                  <div className="absolute inset-0 bg-[#001632]/25 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <div className="w-9 h-9 rounded-full bg-[#001632]/90 text-white flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white/95 text-[#001632] text-[10px] font-black tracking-wide shadow-xs">
                      PREMIUM
                    </span>
                  </div>
                )}
              </div>

              {/* Clean Unboxed Card Metadata */}
              <div className="mt-2.5 px-1 w-full">
                <div className="flex items-center justify-between gap-1.5">
                  <h3 className="font-headline text-[13px] font-bold text-[#001632] truncate">
                    {template.name}
                  </h3>
                  {isLocked ? (
                    <span className="material-symbols-outlined text-[15px] text-[#516070] shrink-0">
                      lock
                    </span>
                  ) : isSelected ? (
                    <span className="text-[11px] font-bold text-[#142b4a] shrink-0">
                      Dipilih
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-[#516070] mt-0.5 truncate tabular-nums">
                  {template.shots} Frame · {template.ratioLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pengaturan Tambahan (Setup Options Section) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#142b4a] text-[20px]">tune</span>
              <h2 className="font-headline text-[16px] text-[#001632] font-bold">
                Pengaturan Sesi Foto
              </h2>
            </div>
            <span className="text-[12px] font-medium text-[#516070]">Opsional</span>
          </div>

          {/* 1. Filter Kamera Awal */}
          <div>
            <label className="block text-[13px] text-[#001632] font-bold mb-2">
              Tone & Filter Awal
            </label>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {FILTER_OPTIONS.map((f) => {
                const isSelected = settings.filter === f.id;
                const locked = isFilterLocked(f, planTier);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        onRequestUpgrade(
                          `Filter "${f.name}" khusus pengguna berlangganan.`
                        );
                        return;
                      }
                      onUpdateSettings({ filter: f.id });
                    }}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
                  >
                    <div
                      className={`relative w-12 h-12 rounded-full p-0.5 transition-all ${
                        isSelected ? 'bg-[#142b4a] ring-2 ring-[#142b4a]/30' : 'bg-transparent'
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-[#ffffff] overflow-hidden relative">
                        <img
                          className={`w-full h-full object-cover ${locked ? 'opacity-65' : ''}`}
                          alt={f.name}
                          src={f.previewImg}
                          style={{ filter: f.cssFilter }}
                        />
                        {locked && (
                          <div className="absolute inset-0 bg-[#001632]/40 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[16px]">
                              lock
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap flex items-center gap-0.5 ${
                        isSelected ? 'text-[#142b4a] font-bold' : 'text-[#516070]'
                      }`}
                    >
                      {locked && <span className="material-symbols-outlined text-[11px]">lock</span>}
                      <span>{f.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Timer Countdown & Flash Column */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[13px] text-[#001632] font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#516070]">timer</span>
                Countdown
              </div>
              <span className="text-[11px] text-[#516070]">Jeda antar jepretan</span>
            </div>
            <div className="flex items-center p-1 rounded-xl bg-[#eef2f8]">
              {[3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ countdown: sec })}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition-colors cursor-pointer tabular-nums ${
                    settings.countdown === sec
                      ? 'bg-[#142b4a] text-white'
                      : 'text-[#516070] hover:text-[#001632]'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
            <div>
              <div className="text-[13px] text-[#001632] font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#516070]">flare</span>
                Flash Layar
              </div>
              <span className="text-[11px] text-[#516070]">Pencahayaan lembut layar</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.screenFlash}
              onClick={() => onUpdateSettings({ screenFlash: !settings.screenFlash })}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                settings.screenFlash ? 'bg-[#142b4a]' : 'bg-[#c4c6ce]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.screenFlash ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] text-[12px] text-[#516070] leading-relaxed">
            Kamera akan mengambil{' '}
            <span className="font-semibold text-[#001632]">{selectedTemplate.shots} foto</span>{' '}
            secara berurutan untuk template {selectedTemplate.name}.
          </div>
        </div>
      </div>

      {/* Floating Sticky Bottom Action Bar */}
      <div className="fixed bottom-24 left-0 right-0 z-30 px-4 max-w-lg mx-auto">
        <div className="p-3 rounded-2xl bg-[#ffffff]/95 backdrop-blur-xl border border-[#e2e8f0] shadow-[0_12px_32px_rgba(20,43,74,0.16)] flex items-center justify-between gap-3">
          <div className="min-w-0 pl-1">
            <span className="block text-[11px] text-[#516070] font-medium">
              Format terpilih
            </span>
            <span className="block text-[13px] text-[#001632] font-bold truncate tabular-nums">
              {selectedTemplate.name} · {selectedTemplate.shots} Foto
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('photobooth-kamera')}
            className="py-2.5 px-4 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white flex items-center justify-center gap-1.5 font-headline text-[13px] font-bold whitespace-nowrap shrink-0 shadow-sm active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Buka Kamera</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
