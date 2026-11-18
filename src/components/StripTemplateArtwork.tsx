import React from 'react';
import { PhotoTemplate } from '../types/photobooth';
import { FRAME_COLOR_OPTIONS } from '../data/mockData';

interface StripTemplateArtworkProps {
  template: PhotoTemplate;
  isSelected?: boolean;
  compact?: boolean;
}

function getSmartObjectPosition(src: string): string {
  if (src.includes('hero_booth_earphones')) return '50% 38%';
  if (src.includes('hero_booth_')) return '50% 45%';
  if (src.includes('pb_peach_finger_heart')) return '50% 38%';
  if (src.includes('pb_cobalt_highangle_duo')) return '50% 42%';
  return '50% 35%';
}

function getSmartImageScale(src: string): string {
  if (
    src.includes('pb_burgundy_sunglasses') ||
    src.includes('pb_silver_tinsel_night') ||
    src.includes('pb_peach_finger_heart') ||
    src.includes('pb_bw_booth_laugh')
  ) {
    return 'scale-[1.12]';
  }
  if (
    src.includes('pb_skyblue_squad_silly') ||
    src.includes('pb_lavender_confetti_trio')
  ) {
    return 'scale-[1.08]';
  }
  return '';
}

function getBasePalette(defaultBg: string) {
  const def = FRAME_COLOR_OPTIONS.find((c) => c.id === defaultBg) || FRAME_COLOR_OPTIONS[0];
  return { hex: def.hex, isDark: def.textTheme === 'light' };
}

export const StripTemplateArtwork: React.FC<StripTemplateArtworkProps> = ({
  template,
  isSelected = false,
  compact = false
}) => {
  const pattern = template.defaultPattern || 'none';
  const base = getBasePalette(template.defaultBg);
  const maxFrames = compact ? Math.min(template.shots, 3) : template.shots;
  const photos = template.previewImages.slice(0, maxFrames);
  const heightClass = compact ? 'h-[300px]' : 'h-[330px]';

  const renderFrames = (frameClassName = 'rounded-sm bg-white overflow-hidden') => {
    const isGrid = template.type === 'grid';
    if (isGrid) {
      const gridRows = photos.length > 4 ? 'grid-rows-3' : 'grid-rows-2';
      return (
        <div className={`grid grid-cols-2 ${gridRows} gap-1.5 w-full flex-1 min-h-0`}>
          {photos.map((imgUrl, idx) => (
            <div key={idx} className={`w-full h-full relative min-h-0 ${frameClassName}`}>
              <img
                className={`w-full h-full object-cover ${getSmartImageScale(imgUrl)}`}
                style={{ objectPosition: getSmartObjectPosition(imgUrl) }}
                alt={`${template.name} contoh ${idx + 1}`}
                src={imgUrl}
              />
            </div>
          ))}
        </div>
      );
    }

    if (template.id === 'y2k-pastel-duo') {
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full flex-1 min-h-0">
          {photos.map((imgUrl, idx) => (
            <div key={idx} className={`w-full h-full relative min-h-0 ${frameClassName}`}>
              <img
                className={`w-full h-full object-cover ${getSmartImageScale(imgUrl)}`}
                style={{ objectPosition: getSmartObjectPosition(imgUrl) }}
                alt={`${template.name} contoh ${idx + 1}`}
                src={imgUrl}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 w-full flex-1 min-h-0">
        {photos.map((imgUrl, idx) => (
          <div key={idx} className={`w-full flex-1 min-h-0 relative ${frameClassName}`}>
            <img
              className={`w-full h-full object-cover ${getSmartImageScale(imgUrl)}`}
              style={{ objectPosition: getSmartObjectPosition(imgUrl) }}
              alt={`${template.name} contoh ${idx + 1}`}
              src={imgUrl}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderSelectedBadge = () =>
    isSelected ? (
      <div
        aria-label="Terpilih"
        className="absolute bottom-2 right-2 z-20 w-6 h-6 rounded-full bg-[#142b4a] text-white flex items-center justify-center shadow-md ring-2 ring-white"
      >
        <span className="material-symbols-outlined text-[15px] font-bold">check</span>
      </div>
    ) : null;

  // 1. SNAP EXPRESS: Tri-color chevron rails, PASS 01 stamp & bottom barcode
  if (pattern === 'snap-express') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#fbf7ee] border border-[#142b4a]/15 overflow-hidden flex flex-col justify-between shadow-inner`}>
        {renderSelectedBadge()}
        <div
          className="w-full h-2.5 shrink-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #c83434 0 10px, #fbf7ee 10px 15px, #142b4a 15px 25px, #fbf7ee 25px 30px)'
          }}
        />
        <div className="px-2.5 py-2 flex-1 min-h-0 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between border-b border-dashed border-[#142b4a]/20 pb-1 shrink-0">
            <div>
              <span className="block font-mono text-[6.5px] font-bold text-[#c83434] tracking-widest">
                PASS 01
              </span>
              <span className="block font-headline text-[10px] font-black text-[#142b4a] leading-none">
                SNAP EXPRESS
              </span>
            </div>
            <div className="w-6 h-6 rounded-full border border-[#c83434]/80 text-[#c83434] flex items-center justify-center font-mono text-[5px] font-bold -rotate-12">
              VIP
            </div>
          </div>
          {renderFrames('rounded bg-[#e7eeff] overflow-hidden border border-[#142b4a]/10')}
          <div className="pt-1 border-t border-dashed border-[#142b4a]/25 flex flex-col items-center shrink-0">
            <div className="h-2.5 w-24 bg-[repeating-linear-gradient(90deg,#142b4a_0,#142b4a_2px,transparent_2px,transparent_4px,#142b4a_4px,#142b4a_6px,transparent_6px,transparent_8px)] opacity-85" />
            <span className="font-mono text-[6.5px] tracking-widest text-[#516070] font-bold mt-0.5">
              #TK-9284 · ADMIT ONE
            </span>
          </div>
        </div>
        <div
          className="w-full h-2 shrink-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #142b4a 0 10px, #fbf7ee 10px 15px, #c83434 15px 25px, #fbf7ee 25px 30px)'
          }}
        />
      </div>
    );
  }

  // 2. AIRMAIL POSTCARD: Full diagonal aerogramme frame + postage stamp + sepia footer
  if (pattern === 'airmail') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl overflow-hidden flex flex-col justify-between p-1.5 shadow-inner`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #1e4b8f 0 8px, #ffffff 8px 12px, #c93838 12px 20px, #ffffff 20px 24px)'
        }}
      >
        {renderSelectedBadge()}
        <div className="w-full flex-1 min-h-0 rounded-lg bg-[#f4efe2] p-2 flex flex-col justify-between gap-1.5 border border-[#d6ccb4]">
          <div className="flex items-start justify-between shrink-0">
            <div className="text-left">
              <span className="font-serif italic text-[11px] font-bold text-[#1e4b8f] leading-none block">
                Par Avion
              </span>
              <span className="font-mono text-[6px] tracking-widest text-[#7c6a52] uppercase">
                Aerogramme · 1994
              </span>
            </div>
            <div className="w-7 h-8 bg-[#fdfaf2] border border-dashed border-[#8a7659] flex flex-col items-center justify-center rotate-3 shadow-xs">
              <span className="font-mono text-[6px] font-bold text-[#c93838]">20¢</span>
              <span className="font-mono text-[4.5px] text-[#1e4b8f]">POST</span>
            </div>
          </div>

          {renderFrames('rounded-xs bg-white overflow-hidden border border-[#d6ccb4] shadow-xs')}

          <div className="pt-1 flex items-center justify-between border-t border-[#d6ccb4] text-[#5e4d37] shrink-0">
            <span className="font-serif italic text-[8px] font-semibold">Via Air Mail</span>
            <span className="font-mono text-[6px] tracking-wider uppercase">SPECIAL POST</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. LOVE IS BLOOMING: Soft blush paper + double rose frame + serif script
  if (pattern === 'love-blooming') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#fdf2f5] border-2 border-[#f4a9be] p-2 flex flex-col justify-between shadow-inner overflow-hidden`}>
        {renderSelectedBadge()}
        <div className="w-full flex-1 min-h-0 rounded-lg border border-[#e884a3]/60 p-2 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[#b8325a] shrink-0">
            <span className="font-serif italic text-[10px] font-bold">Love is Blooming</span>
            <svg className="w-3.5 h-3.5 text-[#e85d87]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          {renderFrames('rounded-md bg-white overflow-hidden ring-2 ring-[#f7cad8]')}
          <div className="text-center font-serif italic text-[8.5px] text-[#9e2b4e] shrink-0">
            blooming memories · forever
          </div>
        </div>
      </div>
    );
  }

  // 4. CINEMA THEATER TICKET: Burgundy velvet + gold border + scalloped notches
  if (pattern === 'cinema-ticket') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#54151b] border-2 border-[#d9b671] p-2 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#f7e7c0]`}>
        {renderSelectedBadge()}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-[#d9b671] z-10" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-[#d9b671] z-10" />

        <div className="text-center border-b border-dashed border-[#d9b671]/60 pb-1 shrink-0">
          <span className="block font-mono text-[6px] tracking-[0.2em] text-[#d9b671]">
            ROW B2 · SHOW 02
          </span>
          <span className="font-serif text-[10px] font-bold tracking-wide text-[#fff4d6]">
            THEATER SHOW
          </span>
        </div>

        {renderFrames('rounded-xs bg-black overflow-hidden border border-[#d9b671]/50')}

        <div className="pt-1 border-t border-dashed border-[#d9b671]/60 flex items-center justify-between font-mono text-[6.5px] text-[#d9b671] shrink-0">
          <span>20:00 WIB</span>
          <span className="font-bold tracking-widest">ADMIT ONE</span>
        </div>
      </div>
    );
  }

  // 5. Y2K COMIC BLUE: Electric blue + comic speech tag + pixel sparkles
  if (pattern === 'y2k-comic-blue') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden`}
        style={{
          backgroundColor: '#1d4ed8',
          backgroundImage:
            'radial-gradient(circle at 85% 12%, rgba(147, 197, 253, 0.45) 0 18%, transparent 19%), radial-gradient(circle at 12% 88%, rgba(191, 219, 254, 0.35) 0 14%, transparent 15%)'
        }}
      >
        {renderSelectedBadge()}
        <div className="flex items-center justify-between shrink-0">
          <span className="bg-white text-[#1d4ed8] font-headline text-[8px] font-black px-2 py-0.5 rounded-md shadow-xs -rotate-2">
            TAKE A PIC!
          </span>
          <span className="text-[#fde047] text-[12px] leading-none">✦</span>
        </div>

        {renderFrames('rounded-lg bg-white overflow-hidden ring-2 ring-white')}

        <div className="flex items-center justify-between text-white shrink-0">
          <span className="font-mono text-[7px] font-bold tracking-wider bg-black/25 px-1.5 py-0.5 rounded">
            CLUB Y2K
          </span>
          <span className="font-headline text-[8px] font-black tracking-wide text-[#bfdbfe]">
            00s POP!
          </span>
        </div>
      </div>
    );
  }

  // 6. SPOOKY NIGHT HALLOWEEN
  if (pattern === 'spooky-night') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#1f1230] border-2 border-dashed border-[#f97316] p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden`}>
        {renderSelectedBadge()}
        <div className="flex items-center justify-between text-[#fdba74] shrink-0">
          <span className="font-headline text-[9px] font-black tracking-wider text-[#f97316]">
            SPOOKY NIGHT
          </span>
          <svg className="w-3.5 h-3.5 text-[#fde047]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
        {renderFrames('rounded bg-[#12091d] overflow-hidden border border-[#f97316]/60')}
        <div className="flex items-center justify-between font-mono text-[6.5px] text-[#fed7aa] shrink-0">
          <span>OCT 31</span>
          <span className="text-[#f97316] font-bold">TRICK OR SNAP</span>
        </div>
      </div>
    );
  }

  // 7. BARCODE 90s FILM STRIP
  if (pattern === 'barcode-film') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#1a181d] border border-white/15 p-2 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-white`}>
        {renderSelectedBadge()}
        <div className="flex flex-col items-center pb-1 border-b border-white/10 shrink-0">
          <div className="h-2.5 w-24 bg-[repeating-linear-gradient(90deg,#ffffff_0,#ffffff_2px,transparent_2px,transparent_4px,#ffffff_4px,#ffffff_5px,transparent_5px,transparent_8px)] opacity-85" />
          <span className="font-mono text-[6px] tracking-[0.25em] text-amber-300 mt-0.5">
            90s FILM ROLL · 01
          </span>
        </div>
        {renderFrames('rounded-xs bg-black overflow-hidden border border-white/20')}
        <div className="flex items-center justify-between font-mono text-[6.5px] text-white/75 pt-0.5 shrink-0">
          <span>SPECIAL DAY</span>
          <span className="text-amber-300">ISO 400</span>
        </div>
      </div>
    );
  }

  // 8. DARK ROMANCE SCRAPBOOK
  if (pattern === 'dark-romance') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#fce7ea]`}
        style={{
          backgroundColor: '#320b14',
          backgroundImage: 'radial-gradient(circle at center, #521322 0%, #20050b 100%)'
        }}
      >
        {renderSelectedBadge()}
        <div className="flex items-center justify-between shrink-0">
          <span className="font-serif italic text-[10px] font-bold text-[#fda4af]">Story of Love</span>
          <div className="w-4 h-4 rounded-full bg-[#be123c] border border-[#fda4af]/60 flex items-center justify-center text-[7px]">
            ♥
          </div>
        </div>
        {renderFrames('rounded-xs bg-black overflow-hidden border border-[#fda4af]/35')}
        <div className="flex items-center justify-between font-serif italic text-[7.5px] text-[#fecdd3] shrink-0">
          <span>always & forever</span>
          <span className="font-mono not-italic text-[6px] text-[#fda4af]">NO. 21</span>
        </div>
      </div>
    );
  }

  // 9. METALLIC STARS / HARAJUKU NEON
  if (pattern === 'metallic-stars') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden border border-slate-300/30`}
        style={{
          backgroundColor: '#161320',
          backgroundImage: 'radial-gradient(ellipse at 50% 15%, #342b52 0%, #161320 80%)'
        }}
      >
        {renderSelectedBadge()}
        <div className="flex items-center justify-between text-slate-200 shrink-0">
          <span className="font-mono text-[7px] font-bold tracking-[0.2em]">✦ CHROME ✦</span>
          <span className="text-slate-300 text-[10px]">★</span>
        </div>
        {renderFrames('rounded bg-black overflow-hidden ring-1 ring-slate-300/50')}
        <div className="flex items-center justify-between font-mono text-[6.5px] text-slate-300 shrink-0">
          <span>STAR EDITION</span>
          <span>2000s</span>
        </div>
      </div>
    );
  }

  // 10. RETRO POLKA DOTS
  if (pattern === 'polka') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden border border-[#142b4a]/10`}
        style={{
          backgroundColor: base.hex,
          backgroundImage: 'radial-gradient(rgba(20, 43, 74, 0.22) 22%, transparent 23%)',
          backgroundSize: '12px 12px'
        }}
      >
        {renderSelectedBadge()}
        <div className="bg-white/90 rounded px-2 py-0.5 self-center shadow-xs shrink-0">
          <span className="font-headline text-[8px] font-black tracking-wider text-[#142b4a]">
            POLKA CLUB
          </span>
        </div>
        {renderFrames('rounded-md bg-white overflow-hidden ring-2 ring-white shadow-xs')}
        <div className="bg-white/90 rounded px-2 py-0.5 self-center shadow-xs shrink-0">
          <span className="font-mono text-[6.5px] font-bold text-[#142b4a]">SEOUL BOOTH</span>
        </div>
      </div>
    );
  }

  // 11. CHECKERBOARD (Squad Party Grid 6)
  if (pattern === 'checker') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden border border-[#142b4a]/15`}
        style={{
          backgroundColor: base.hex,
          backgroundImage:
            'linear-gradient(45deg, rgba(20, 43, 74, 0.14) 25%, transparent 25%), linear-gradient(-45deg, rgba(20, 43, 74, 0.14) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(20, 43, 74, 0.14) 75%), linear-gradient(-45deg, transparent 75%, rgba(20, 43, 74, 0.14) 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0'
        }}
      >
        {renderSelectedBadge()}
        <div className="bg-[#142b4a] text-white px-2 py-0.5 rounded self-start font-mono text-[6.5px] font-bold shrink-0">
          PARTY GRID
        </div>
        {renderFrames('rounded bg-white overflow-hidden ring-2 ring-white shadow-xs')}
        <div className="bg-white/95 px-2 py-0.5 rounded self-end font-mono text-[6px] font-bold text-[#142b4a] shrink-0">
          SQUAD · 06
        </div>
      </div>
    );
  }

  // 12. POLAROID RIBBON (Solo Classic Polaroid - bottom-weighted instant print)
  if (pattern === 'polaroid-ribbon') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#fcfaf4] border border-[#e5dfd0] p-3 pb-6 flex flex-col justify-between gap-3 shadow-inner overflow-hidden`}>
        {renderSelectedBadge()}
        {renderFrames('rounded-xs bg-white overflow-hidden border border-[#e2dccb]')}
        <div className="pt-2 text-center border-t border-dashed border-[#e5dfd0] shrink-0">
          <span className="font-serif italic text-[11px] text-[#3f382e] block">
            Pure Instant Memory
          </span>
          <span className="font-mono text-[6.5px] tracking-widest text-[#8c8172] uppercase">
            SINGLE SHOT · STUDIO
          </span>
        </div>
      </div>
    );
  }

  // 13. FILM SPROCKET (35mm Darkroom Strip: Film Noir Duo & Cinematic Story 6-Cut)
  if (pattern === 'film-sprocket') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#111318] px-3.5 py-2 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-white`}>
        {renderSelectedBadge()}
        <div className="absolute left-1 top-2 bottom-2 w-1.5 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="w-1.5 h-2.5 rounded-[1px] bg-white/80 block" />
          ))}
        </div>
        <div className="absolute right-1 top-2 bottom-2 w-1.5 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="w-1.5 h-2.5 rounded-[1px] bg-white/80 block" />
          ))}
        </div>

        <div className="flex items-center justify-between font-mono text-[6.5px] text-amber-400 px-0.5 shrink-0">
          <span>35MM</span>
          <span>SAFETY FILM</span>
        </div>
        {renderFrames('rounded-[2px] bg-black overflow-hidden border border-white/15')}
        <div className="flex items-center justify-between font-mono text-[6px] text-white/70 px-0.5 shrink-0">
          <span>KODAK TRI-X</span>
          <span>400TX</span>
        </div>
      </div>
    );
  }

  // 14. VINTAGE KRAFT
  if (pattern === 'vintage-kraft') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#e7dcc0] border border-[#c7b58b] p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#423522]`}>
        {renderSelectedBadge()}
        <div className="flex items-center justify-between font-mono text-[6.5px] border-b border-[#b9a579] pb-1 shrink-0">
          <span className="font-bold">ARCHIVE · NO.08</span>
          <span>1998</span>
        </div>
        {renderFrames('rounded-xs bg-[#f7f2e4] overflow-hidden border border-[#b9a579]')}
        <div className="text-center font-serif italic text-[8.5px] text-[#5c492d] shrink-0">
          warm analog keepsake
        </div>
      </div>
    );
  }

  // 15. HEARTS (Sweet Romance 3-Cut)
  if (pattern === 'hearts') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#fde4e8] border border-[#f5b7c2] p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#9f2341]`}>
        {renderSelectedBadge()}
        <div className="flex items-center justify-between text-[8px] font-bold tracking-wider shrink-0">
          <span>♥ SWEET DATE</span>
          <span>♥</span>
        </div>
        {renderFrames('rounded-md bg-white overflow-hidden ring-1 ring-[#f5b7c2]')}
        <div className="text-center font-serif italic text-[8.5px] shrink-0">be mine · 3 cuts</div>
      </div>
    );
  }

  // 16. STARS (Pastel Dream 3-Cut)
  if (pattern === 'stars') {
    return (
      <div className={`relative w-full ${heightClass} rounded-xl bg-[#e8e2fb] border border-[#c7b9f5] p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#2a1f5c]`}>
        {renderSelectedBadge()}
        <div className="flex items-center justify-between font-mono text-[6.5px] font-bold shrink-0">
          <span>✦ PASTEL DREAM</span>
          <span>✦</span>
        </div>
        {renderFrames('rounded-md bg-white overflow-hidden ring-1 ring-white shadow-xs')}
        <div className="text-center font-headline text-[8px] font-bold tracking-wider text-[#4c3a8a] shrink-0">
          LAVENDER HOUR
        </div>
      </div>
    );
  }

  // 17. GRADIENT AURORA (Y2K Pastel Duo)
  if (pattern === 'gradient-aurora') {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden text-[#142b4a]`}
        style={{
          background: 'linear-gradient(145deg, #e0d6ff 0%, #d1e5ff 50%, #ffe6db 100%)'
        }}
      >
        {renderSelectedBadge()}
        <div className="font-headline text-[8px] font-black tracking-widest uppercase text-[#142b4a]/80 shrink-0">
          AURORA DUO
        </div>
        {renderFrames('rounded-lg bg-white overflow-hidden ring-2 ring-white/80 shadow-xs')}
        <div className="font-mono text-[6.5px] font-bold text-[#142b4a]/70 text-right shrink-0">
          02 WIDE SHOTS
        </div>
      </div>
    );
  }

  // 18. CLEAN ARCHITECTURAL / SWISS MAT (Minimalist Navy, Collage Grid 4, Studio Editorial 4-Cut)
  return (
    <div
      style={{ backgroundColor: base.hex }}
      className={`relative w-full ${heightClass} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-inner overflow-hidden border ${
        base.isDark ? 'border-white/10 text-white' : 'border-[#142b4a]/10 text-[#001632]'
      }`}
    >
      {renderSelectedBadge()}
      <div className="flex items-center justify-between font-mono text-[6.5px] tracking-widest uppercase opacity-75 shrink-0">
        <span>{template.type === 'grid' ? 'GRID 2×2' : 'STUDIO'}</span>
        <span>{template.shots} CUTS</span>
      </div>
      {renderFrames(
        `rounded-xs overflow-hidden ${
          base.isDark ? 'bg-black ring-1 ring-white/15' : 'bg-white ring-1 ring-black/5'
        }`
      )}
      <div className="flex items-center justify-between border-t pt-1 border-current/15 shrink-0">
        <span className="font-headline text-[8px] font-extrabold tracking-wider uppercase">
          POSARA
        </span>
        <span className="font-mono text-[6px] opacity-70">EDITION</span>
      </div>
    </div>
  );
};
