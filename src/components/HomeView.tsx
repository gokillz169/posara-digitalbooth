import React from 'react';
import { ViewTab } from '../types/photobooth';
import { PHOTO_TEMPLATES } from '../data/mockData';
import { PlanTier, isTemplateLocked } from '../utils/subscription';
import { StripTemplateArtwork } from './StripTemplateArtwork';

interface HomeViewProps {
  onNavigate: (tab: ViewTab) => void;
  onSelectTemplate: (templateId: string) => void;
  planTier: PlanTier;
  onRequestUpgrade: (reason: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectTemplate,
  planTier,
  onRequestUpgrade
}) => {
  const favoriteTemplates = PHOTO_TEMPLATES.slice(0, 6);

  return (
    <div className="flex flex-col w-full pb-28">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-4 pb-8 flex flex-col items-center text-center max-w-xl mx-auto">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6dffb] text-[#142b4a] shadow-sm mb-3">
          <span className="material-symbols-outlined text-[16px] text-[#142b4a]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <span className="text-[12px] font-bold tracking-wide">
            Photobooth Digital #1 di Browser
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-headline text-[32px] sm:text-[42px] leading-tight text-[#001632] font-black tracking-tight mb-2.5">
          Abadikan Momen, Ciptakan Ceritamu.
        </h1>

        {/* Subtitle / Deskripsi */}
        <p className="text-[14px] sm:text-[16px] text-[#516070] max-w-md mb-6 leading-relaxed">
          Photobooth online praktis tanpa instal aplikasi. Pilih template estetik, ambil foto langsung dari kamera HP atau webcam, dan simpan photo strip instan.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm mb-8">
          <button
            onClick={() => onNavigate('photobooth-kamera')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[15px] px-6 py-3.5 rounded-xl shadow-[0_8px_20px_rgba(20,43,74,0.18)] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            <span>Mulai Photobooth</span>
          </button>
          <button
            onClick={() => onNavigate('pilih-template')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#ffffff] hover:bg-[#f0f3ff] text-[#142b4a] font-bold text-[15px] px-5 py-3.5 rounded-xl border border-[#e2e8f0] shadow-sm transition-all cursor-pointer"
          >
            <span>Lihat Template</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {/* Visual Hero Preview ("THE SNAP EXPRESS" Vintage Ticket Mockup) */}
        <div className="relative w-full max-w-xs mx-auto pt-4 pb-4">
          {/* Ambient Lighting Blurs */}
          <div className="absolute -top-3 -left-3 w-32 h-32 bg-[#e6dffb] rounded-full filter blur-2xl opacity-70 pointer-events-none"></div>
          <div className="absolute -bottom-2 -right-3 w-36 h-36 bg-[#d5e4f8] rounded-full filter blur-2xl opacity-80 pointer-events-none"></div>

          <div className="relative mx-auto transition-transform duration-300 hover:rotate-[-1deg]">
            {/* Floating Sticker Badges */}
            <div className="absolute -top-3 right-3 bg-[#142b4a] text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 rotate-6 z-20">
              <span className="material-symbols-outlined text-[11px] text-[#e6dffb]">confirmation_number</span>
              <span>★ VIP MEMORY</span>
            </div>
            <div className="absolute top-1/2 -left-3 bg-[#e6dffb] text-[#142b4a] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm -rotate-12 z-20 border border-[#142b4a]/10">
              ✨ VIBES 90s
            </div>

            {/* Photostrip Physical Ticket Container */}
            <div
              id="hero-strip-preview"
              className="relative bg-[#fbf7ee] rounded-2xl shadow-[0_18px_40px_rgba(20,43,74,0.18)] border border-[#142b4a]/15 overflow-hidden"
            >

            {/* Top Tri-Color Airmail/Express Chevron Bar */}
            <div
              className="w-full h-3"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, #c83434 0 12px, #fbf7ee 12px 18px, #142b4a 18px 30px, #fbf7ee 30px 36px)'
              }}
            />

            <div className="p-3 pt-2.5">
              {/* Ticket Top Header & Verified Stamp */}
              <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-dashed border-[#142b4a]/20">
                <div className="text-left">
                  <span className="block font-mono text-[8px] font-bold tracking-widest text-[#c83434] uppercase">
                    SPECIAL EDITION • PASS 01
                  </span>
                  <span className="font-headline text-[14px] font-black tracking-tight text-[#142b4a] leading-none">
                    THE SNAP EXPRESS
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#c83434]/80 text-[#c83434] flex flex-col items-center justify-center text-[5.5px] font-mono font-black leading-tight -rotate-12 bg-[#fbf7ee]">
                  <span>VERIFIED</span>
                  <span>MEMORIES</span>
                </div>
              </div>

              {/* 3-Frame Photo Stack */}
              <div className="flex flex-col gap-2">
                <div className="w-full aspect-[6/5] rounded-lg overflow-hidden bg-[#e7eeff] relative shadow-sm border border-[#142b4a]/10 flex items-center justify-center">
                  <img
                    className="w-full h-full object-cover object-center"
                    alt="Pose wide-angle studio biru di photobooth"
                    src="/assets/images/hero_booth_highangle_1794656995608.jpg"
                  />
                  <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-[#142b4a]/75 backdrop-blur-sm text-[9px] font-mono text-white tracking-wider">
                    01/03
                  </div>
                </div>
                <div className="w-full aspect-[6/5] rounded-lg overflow-hidden bg-[#e7eeff] relative shadow-sm border border-[#142b4a]/10 flex items-center justify-center">
                  <img
                    className="w-full h-full object-cover object-center"
                    alt="Pose retro cinema popcorn di photobooth tirai navy"
                    src="/assets/images/hero_booth_cinema_1794656996528.jpg"
                  />
                  <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-[#142b4a]/75 backdrop-blur-sm text-[9px] font-mono text-white tracking-wider">
                    02/03
                  </div>
                </div>
                <div className="w-full aspect-[6/5] rounded-lg overflow-hidden bg-[#e7eeff] relative shadow-sm border border-[#142b4a]/10 flex items-center justify-center">
                  <img
                    className="w-full h-full object-cover object-[50%_38%]"
                    alt="Pose manis berbagi earphone di photobooth"
                    src="/assets/images/hero_booth_earphones_1794656997315.jpg"
                  />
                  <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-[#142b4a]/75 backdrop-blur-sm text-[9px] font-mono text-white tracking-wider">
                    03/03
                  </div>
                </div>
              </div>

              {/* Ticket Perforation & Barcode Footer */}
              <div className="relative mt-3 pt-2.5 border-t border-dashed border-[#142b4a]/30 flex flex-col items-center gap-1.5">
                <div className="absolute -left-5 -top-2.5 w-5 h-5 rounded-full bg-[#f9f9ff] border border-[#142b4a]/15" />
                <div className="absolute -right-5 -top-2.5 w-5 h-5 rounded-full bg-[#f9f9ff] border border-[#142b4a]/15" />

                <div className="w-full flex items-center justify-between text-[#142b4a]">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                    <span className="font-headline text-[10px] tracking-wider font-extrabold">
                      POSARA PHOTO STUDIO
                    </span>
                  </div>
                  <span className="font-mono text-[8px] font-bold text-[#c83434]">
                    ROW 04 • SEAT A1
                  </span>
                </div>

                <div className="w-full flex flex-col items-center pt-0.5">
                  <div className="h-4 w-44 bg-[repeating-linear-gradient(90deg,#142b4a_0,#142b4a_2px,transparent_2px,transparent_4px,#142b4a_4px,#142b4a_7px,transparent_7px,transparent_9px)] opacity-90" />
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#516070] font-bold mt-1">
                    #TK-9284 • ADMIT ONE
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Tri-Color Chevron Bar */}
            <div
              className="w-full h-2.5"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, #142b4a 0 12px, #fbf7ee 12px 18px, #c83434 18px 30px, #fbf7ee 30px 36px)'
              }}
            />
          </div>
          </div>
        </div>
      </section>

      {/* Template Showcase Section */}
      <section className="mt-4 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-[11px] font-bold text-[#516070] uppercase tracking-wider block mb-0.5">
              Pilihan Populer
            </span>
            <h2 className="font-headline text-[22px] font-bold text-[#001632] tracking-tight">
              Template Favorit
            </h2>
          </div>
          <button
            onClick={() => onNavigate('pilih-template')}
            className="text-[13px] text-[#142b4a] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Semua
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Horizontal Scrolling Strip */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar snap-x">
          {favoriteTemplates.map((template) => {
            const locked = isTemplateLocked(template, planTier);
            return (
              <div
                key={template.id}
                className="min-w-[225px] max-w-[240px] bg-[#ffffff] rounded-2xl p-3.5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between snap-start hover:shadow-md transition-shadow relative"
              >
                <div>
                  <div className="mb-3 relative">
                    <StripTemplateArtwork template={template} compact />
                    {locked && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-[#001632]/85 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[13px]">lock</span>
                        <span>PRO</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#516070] mb-1 tabular-nums">
                    <span className="font-semibold text-[#142b4a]">{template.badge || 'Populer'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{template.shots} Frame</span>
                  </div>

                  <h3 className="font-headline text-[15px] text-[#001632] font-bold">
                    {template.name}
                  </h3>
                  <p className="text-[12px] text-[#516070] mt-0.5 leading-snug line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (locked) {
                      onRequestUpgrade(
                        `Template "${template.name}" terkunci khusus pengguna berlangganan.`
                      );
                      return;
                    }
                    onSelectTemplate(template.id);
                    onNavigate('photobooth-kamera');
                  }}
                  className={`mt-3.5 w-full py-2 text-[13px] rounded-xl font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                    locked
                      ? 'bg-[#eef2f8] hover:bg-[#e6dffb] text-[#142b4a]'
                      : 'bg-[#f0f3ff] hover:bg-[#142b4a] hover:text-white text-[#142b4a]'
                  }`}
                >
                  {locked && <span className="material-symbols-outlined text-[15px]">lock</span>}
                  <span>{locked ? 'Khusus Premium' : 'Gunakan Template Ini'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works (3 Langkah Cepat) */}
      <section className="mt-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="bg-[#f0f3ff] rounded-3xl p-5 sm:p-6 border border-[#e2e8f0]/80">
          <div className="text-center mb-5">
            <span className="text-[11px] font-bold text-[#516070] uppercase tracking-wider">
              Sangat Mudah
            </span>
            <h2 className="font-headline text-[22px] text-[#001632] font-extrabold mt-0.5">
              3 Langkah, Langsung Jadi!
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-[#ffffff] p-4 rounded-2xl shadow-sm border border-[#e2e8f0]/60">
              <div className="w-10 h-10 rounded-xl bg-[#d5e4f8] text-[#142b4a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">dashboard_customize</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[#001632]">1. Pilih Desain</h3>
                  <span className="font-mono text-[11px] font-bold text-[#516070]">01</span>
                </div>
                <p className="text-[12px] text-[#516070] mt-1 leading-snug">
                  Tentukan gaya layout strip, warna latar belakang, dan nuansa filter yang kamu sukai.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-[#ffffff] p-4 rounded-2xl shadow-sm border border-[#e2e8f0]/60">
              <div className="w-10 h-10 rounded-xl bg-[#e6dffb] text-[#142b4a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">timer</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[#001632]">2. Pose & Jepret</h3>
                  <span className="font-mono text-[11px] font-bold text-[#516070]">02</span>
                </div>
                <p className="text-[12px] text-[#516070] mt-1 leading-snug">
                  Kamera akan menghitung mundur otomatis 3 detik per frame. Ganti pose sesukamu!
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-[#ffffff] p-4 rounded-2xl shadow-sm border border-[#e2e8f0]/60">
              <div className="w-10 h-10 rounded-xl bg-[#d5e4f8] text-[#142b4a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">download</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[#001632]">3. Unduh & Share</h3>
                  <span className="font-mono text-[11px] font-bold text-[#516070]">03</span>
                </div>
                <p className="text-[12px] text-[#516070] mt-1 leading-snug">
                  Simpan strip HD ke galeri, unduh file ZIP per foto, atau bagikan langsung ke aplikasi favoritmu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kenapa Memilih POSARA? (Fitur Unggulan) */}
      <section className="mt-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-[11px] font-bold text-[#516070] uppercase tracking-wider">
            Kelebihan
          </span>
          <h2 className="font-headline text-[22px] text-[#001632] font-extrabold mt-0.5">
            Kenapa Memilih POSARA?
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
            <div className="w-9 h-9 rounded-lg bg-[#f0f3ff] flex items-center justify-center text-[#142b4a] mb-2.5">
              <span className="material-symbols-outlined text-[20px]">public</span>
            </div>
            <div>
              <h3 className="text-[13px] text-[#001632] font-bold leading-tight">Langsung di Browser</h3>
              <p className="text-[11px] text-[#516070] mt-1 leading-snug">Nggak perlu download app tambahan, buka link langsung jepret.</p>
            </div>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
            <div className="w-9 h-9 rounded-lg bg-[#e6dffb] flex items-center justify-center text-[#142b4a] mb-2.5">
              <span className="material-symbols-outlined text-[20px]">palette</span>
            </div>
            <div>
              <h3 className="text-[13px] text-[#001632] font-bold leading-tight">Filter Estetik & Grain</h3>
              <p className="text-[11px] text-[#516070] mt-1 leading-snug">Koleksi tone retro 90s, Y2K soft, hingga monokrom tajam.</p>
            </div>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
            <div className="w-9 h-9 rounded-lg bg-[#d5e4f8] flex items-center justify-center text-[#142b4a] mb-2.5">
              <span className="material-symbols-outlined text-[20px]">sentiment_very_satisfied</span>
            </div>
            <div>
              <h3 className="text-[13px] text-[#001632] font-bold leading-tight">Stiker & Personalisasi</h3>
              <p className="text-[11px] text-[#516070] mt-1 leading-snug">Hias strip fotomu dengan date stamp, caption, dan stiker imut.</p>
            </div>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
            <div className="w-9 h-9 rounded-lg bg-[#d5e4f8] flex items-center justify-center text-[#142b4a] mb-2.5">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <h3 className="text-[13px] text-[#001632] font-bold leading-tight">Privasi Aman 100%</h3>
              <p className="text-[11px] text-[#516070] mt-1 leading-snug">Foto diproses di perangkatmu sendiri tanpa diunggah ke server asing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner Bottom */}
      <section className="mt-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="relative bg-[#d5e4f8] text-[#142b4a] rounded-3xl p-6 overflow-hidden border border-[#b9c8db]/60 shadow-sm">
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-[#b2c7ee] rounded-full opacity-40 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-start max-w-lg">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#142b4a] bg-white/80 px-2.5 py-0.5 rounded-full mb-2">
              <span>📸 Siap Foto?</span>
            </div>
            <h2 className="font-headline text-[22px] sm:text-[26px] text-[#001632] font-extrabold leading-tight mb-2">
              Sudah siap mengabadikan momen serumu?
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#516070] mb-5 leading-normal">
              Mulai sesi fotomu sekarang bersama teman atau solo, gratis dan langsung jadi!
            </p>
            <button
              onClick={() => onNavigate('photobooth-kamera')}
              className="inline-flex items-center justify-center gap-2 bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[14px] px-6 py-3 rounded-xl shadow-md active:translate-y-[1px] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Mulai Photobooth Sekarang</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 px-4 sm:px-6 pt-6 border-t border-[#e2e8f0] flex flex-col items-center text-center max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-2 text-[#142b4a]">
          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          <span className="font-headline text-[15px] font-black tracking-tight">POSARA BOOTH</span>
        </div>
        <p className="text-[12px] text-[#516070] max-w-sm mb-3">
          Platform photobooth digital estetik untuk merayakan setiap detik berharga di mana saja.
        </p>
        <span className="font-mono text-[11px] text-[#516070]/70">
          © {new Date().getFullYear()} POSARA Booth. All rights reserved.
        </span>
      </footer>
    </div>
  );
};
