import JSZip from 'jszip';
import { CapturedFrame, FilterType, TemplateType } from '../types/photobooth';
import { getCssFilterString } from './photobooth';

export interface RenderStripOptions {
  frames: CapturedFrame[];
  templateType: TemplateType;
  frameColorHex: string;
  isDarkBg: boolean;
  framePattern?: string;
  frameCorner?: 'rounded' | 'sharp' | 'pill';
  frameInnerBorder?: 'none' | 'white' | 'double' | 'dashed';
  caption: string;
  timestamp: string;
  showTimestamp: boolean;
  filter: FilterType;
  stickers: string[];
  exportScale?: number;
  eventBrandText?: string;
}

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create a fallback colored placeholder canvas if remote image fails
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 400;
      fallbackCanvas.height = 300;
      const ctx = fallbackCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#cfdaf1';
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = '#142b4a';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POSARA PHOTO', 200, 150);
      }
      const fallbackImg = new Image();
      fallbackImg.src = fallbackCanvas.toDataURL();
      fallbackImg.onload = () => resolve(fallbackImg);
    };
    img.src = src;
  });
}

// Helper to draw a 5-pointed star
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

/**
 * Draw background pattern or texture onto canvas
 */
function drawFramePattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pattern: string,
  baseColorHex: string
) {
  // 1. Gradients & Textures
  if (pattern === 'gradient-aurora') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#e6dffb');
    grad.addColorStop(0.5, '#d5e4f8');
    grad.addColorStop(1, '#ffe8d8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (pattern === 'gradient-sunset') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#ffd3b6');
    grad.addColorStop(0.5, '#ffaaa5');
    grad.addColorStop(1, '#dee9ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (pattern === 'vintage-kraft') {
    ctx.fillStyle = '#e8dec5';
    ctx.fillRect(0, 0, width, height);
    // Subtle kraft paper fibers
    ctx.fillStyle = 'rgba(120, 80, 40, 0.05)';
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, Math.random() * 5 + 1, Math.random() * 2 + 1);
    }
    return;
  }

  // 2. Airmail Vintage Pos
  if (pattern === 'airmail') {
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(0, 0, width, height);

    // Diagonal chevron border along the perimeter (22px width)
    const stripeW = 22;
    ctx.save();
    // Top border
    for (let x = -stripeW; x < width + stripeW; x += 28) {
      ctx.fillStyle = (Math.floor(x / 28) % 2 === 0) ? '#224b88' : '#c83434';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 16, 0);
      ctx.lineTo(x + 6, stripeW);
      ctx.lineTo(x - 10, stripeW);
      ctx.closePath();
      ctx.fill();
    }
    // Bottom border
    for (let x = -stripeW; x < width + stripeW; x += 28) {
      ctx.fillStyle = (Math.floor(x / 28) % 2 === 0) ? '#224b88' : '#c83434';
      ctx.beginPath();
      ctx.moveTo(x, height - stripeW);
      ctx.lineTo(x + 16, height - stripeW);
      ctx.lineTo(x + 6, height);
      ctx.lineTo(x - 10, height);
      ctx.closePath();
      ctx.fill();
    }
    // Left border
    for (let y = stripeW; y < height - stripeW; y += 28) {
      ctx.fillStyle = (Math.floor(y / 28) % 2 === 0) ? '#224b88' : '#c83434';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(stripeW, y + 10);
      ctx.lineTo(stripeW, y + 26);
      ctx.lineTo(0, y + 16);
      ctx.closePath();
      ctx.fill();
    }
    // Right border
    for (let y = stripeW; y < height - stripeW; y += 28) {
      ctx.fillStyle = (Math.floor(y / 28) % 2 === 0) ? '#224b88' : '#c83434';
      ctx.beginPath();
      ctx.moveTo(width - stripeW, y);
      ctx.lineTo(width, y + 10);
      ctx.lineTo(width, y + 26);
      ctx.lineTo(width - stripeW, y + 16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Inner subtle dashed border
    ctx.strokeStyle = 'rgba(0, 22, 50, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(stripeW + 6, stripeW + 6, width - (stripeW + 6) * 2, height - (stripeW + 6) * 2);
    ctx.setLineDash([]);
    return;
  }

  // 3. Cinema Ticket Retro
  if (pattern === 'cinema-ticket') {
    ctx.fillStyle = '#54151b'; // rich theater maroon
    ctx.fillRect(0, 0, width, height);

    // Golden inner double border
    ctx.strokeStyle = '#d9b671';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.strokeStyle = 'rgba(217, 182, 113, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, width - 44, height - 44);

    // Scalloped cutouts on sides
    const notchRadius = 14;
    ctx.fillStyle = '#f0f3ff';
    const notchYPositions = [height * 0.28, height * 0.52, height * 0.76];
    for (const ny of notchYPositions) {
      ctx.beginPath();
      ctx.arc(0, ny, notchRadius, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width, ny, notchRadius, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.fill();
    }
    return;
  }

  // 4. Barcode 90s Film
  if (pattern === 'barcode-film') {
    ctx.fillStyle = '#1e1a22';
    ctx.fillRect(0, 0, width, height);

    // Subtle edge framing
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    return;
  }

  // 5. Y2K Cobalt Waves
  if (pattern === 'y2k-comic-blue') {
    ctx.fillStyle = '#1d4ed8'; // Cobalt blue
    ctx.fillRect(0, 0, width, height);

    // Bold psychedelic wavy ribbons
    ctx.save();
    ctx.fillStyle = '#2563eb';
    for (let y = 0; y < height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.33, y + 40, width * 0.66, y - 40, width, y);
      ctx.lineTo(width, y + 60);
      ctx.bezierCurveTo(width * 0.66, y + 20, width * 0.33, y + 100, 0, y + 60);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let y = 60; y < height; y += 160) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.4, y - 50, width * 0.7, y + 50, width, y);
      ctx.lineTo(width, y + 25);
      ctx.bezierCurveTo(width * 0.7, y + 75, width * 0.4, y - 25, 0, y + 25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 6. Dark Romance Scrapbook
  if (pattern === 'dark-romance') {
    ctx.fillStyle = '#320b14';
    ctx.fillRect(0, 0, width, height);
    // Subtle romantic floral vignette
    ctx.fillStyle = 'rgba(200, 40, 70, 0.08)';
    ctx.fillRect(12, 12, width - 24, height - 24);
    return;
  }

  // 7. Y2K Metallic Stars
  if (pattern === 'metallic-stars') {
    ctx.fillStyle = '#161320';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // 8. Coquette Red Ribbon Polaroid
  if (pattern === 'polaroid-ribbon') {
    ctx.fillStyle = '#fdfbf6';
    ctx.fillRect(0, 0, width, height);
    // Polaroid card frame line
    ctx.strokeStyle = '#eae3d5';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    return;
  }

  // 9. Scallop Emerald Lace
  if (pattern === 'vintage-lace') {
    ctx.fillStyle = '#0d3427';
    ctx.fillRect(0, 0, width, height);

    // Delicate gold/lace border
    ctx.strokeStyle = 'rgba(235, 215, 175, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    // Scalloped dots along border
    ctx.fillStyle = '#ebd7af';
    for (let x = 24; x < width - 24; x += 16) {
      ctx.beginPath();
      ctx.arc(x, 18, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, height - 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = 24; y < height - 24; y += 16) {
      ctx.beginPath();
      ctx.arc(18, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width - 18, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // 9b. The Snap Express Ticket
  if (pattern === 'snap-express') {
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, width, height);

    // Top & bottom tri-color chevron stripe (red, cream, navy)
    const stripeH = 18;
    const segW = 24;
    for (let x = -segW; x < width + segW; x += segW) {
      const idx = Math.floor((x + segW) / segW) % 3;
      ctx.fillStyle = idx === 0 ? '#c83434' : idx === 1 ? '#fbf7ee' : '#142b4a';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + segW, 0);
      ctx.lineTo(x + segW - 8, stripeH);
      ctx.lineTo(x - 8, stripeH);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, height - stripeH);
      ctx.lineTo(x + segW, height - stripeH);
      ctx.lineTo(x + segW - 8, height);
      ctx.lineTo(x - 8, height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(20, 43, 74, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, stripeH + 6, width - 28, height - (stripeH + 6) * 2);
    return;
  }

  // 9c. Love is Blooming
  if (pattern === 'love-blooming') {
    ctx.fillStyle = '#fdf2f5';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#f4a9be';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, width - 28, height - 28);
    ctx.strokeStyle = 'rgba(244, 169, 190, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    return;
  }

  // 9d. Spooky Night Halloween
  if (pattern === 'spooky-night') {
    ctx.fillStyle = '#1f1230';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(14, 14, width - 28, height - 28);
    ctx.setLineDash([]);
    return;
  }

  // Solid base color default
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, width, height);

  // 10. Polka Dots
  if (pattern === 'polka') {
    const spacing = 40;
    ctx.fillStyle = 'rgba(0, 22, 50, 0.12)';
    for (let x = 20; x < width; x += spacing) {
      for (let y = 20; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'checker') {
    const size = 32;
    ctx.fillStyle = 'rgba(0, 22, 50, 0.08)';
    for (let x = 0; x < width; x += size) {
      for (let y = 0; y < height; y += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  } else if (pattern === 'hearts') {
    const spacing = 52;
    ctx.fillStyle = 'rgba(230, 80, 120, 0.2)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 26; x < width; x += spacing) {
      for (let y = 26; y < height; y += spacing) {
        ctx.fillText('❤', x, y);
      }
    }
  } else if (pattern === 'stars') {
    const spacing = 56;
    ctx.fillStyle = 'rgba(240, 180, 40, 0.3)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 28; x < width; x += spacing) {
      for (let y = 28; y < height; y += spacing) {
        ctx.fillText('✦', x, y);
      }
    }
  } else if (pattern === 'film-sprocket') {
    const gutterW = 22;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, gutterW, height);
    ctx.fillRect(width - gutterW, 0, gutterW, height);

    ctx.fillStyle = '#ffffff';
    const holeH = 14;
    const holeW = 10;
    const holeSpacing = 28;
    for (let y = 16; y < height - 16; y += holeSpacing) {
      ctx.beginPath();
      ctx.roundRect(6, y, holeW, holeH, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(width - gutterW + 6, y, holeW, holeH, 3);
      ctx.fill();
    }
  }
}

/**
 * Draw graphic theme overlays (stamps, ribbons, barcodes, stars) on top of the rendered strip
 */
function drawThemeOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pattern: string
) {
  ctx.save();
  ctx.filter = 'none';

  // Airmail Stamps & Postal cancellation
  if (pattern === 'airmail') {
    // Top right postage stamp
    const stampX = width - 110;
    const stampY = 28;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(stampX, stampY, 70, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAR AVION', stampX + 35, stampY + 22);
    ctx.fillText('1.50 POSARA', stampX + 35, stampY + 38);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(stampX + 4, stampY + 4, 62, 42);

    // Postmark circle stamp
    ctx.strokeStyle = '#224b88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(stampX - 25, stampY + 25, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '9px monospace';
    ctx.fillStyle = '#224b88';
    ctx.fillText('POSARA POST', stampX - 25, stampY + 22);
    ctx.fillText('AIR MAIL', stampX - 25, stampY + 32);

    // Corner black bow
    ctx.font = '28px sans-serif';
    ctx.fillText('🎀', 48, 48);
  }

  // Cinema Ticket Header & Bottom Stub
  else if (pattern === 'cinema-ticket') {
    // Header
    ctx.fillStyle = '#fce5b5';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ ★ ★ THEATER SHOW ★ ★ ★', width / 2, 26);

    // Perforation line above bottom
    ctx.strokeStyle = 'rgba(252, 229, 181, 0.4)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, height - 120);
    ctx.lineTo(width - 25, height - 120);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stub text
    ctx.fillStyle = '#fce5b5';
    ctx.font = '11px monospace';
    ctx.fillText('kafastudio • ADMIT ONE • ROW B2 SHOW 02', width / 2, height - 100);
  }

  // Barcode 90s Film Strip
  else if (pattern === 'barcode-film') {
    // Top Barcode
    const drawBarcode = (bx: number, by: number, bw: number, bh: number, label: string) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#000000';
      let currX = bx + 8;
      const widths = [3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4];
      let widx = 0;
      while (currX < bx + bw - 12) {
        const barW = widths[widx % widths.length];
        ctx.fillRect(currX, by + 4, barW, bh - 18);
        currX += barW + 2;
        widx++;
      }
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + bw / 2, by + bh - 4);
    };

    drawBarcode(width / 2 - 80, 10, 160, 36, '* 89012480192 *');
    drawBarcode(width / 2 - 90, height - 52, 180, 40, '* POSARA BOOTH 2025 *');

    // Cursive "Special Day"
    ctx.font = 'italic bold 18px Georgia, serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Special Day 📸', width - 85, height - 85);
  }

  // Y2K Cobalt Waves Cartoon Doodles
  else if (pattern === 'y2k-comic-blue') {
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐰', 42, 42);
    ctx.fillText('💬', width - 42, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('WE LOOK COOL!', width - 50, 70);

    ctx.font = '20px sans-serif';
    ctx.fillText('📸', 44, height - 90);
    ctx.fillText('✨', width - 44, height - 90);
  }

  // Dark Romance Scrapbook
  else if (pattern === 'dark-romance') {
    // Kiss mark
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💋', width - 55, 50);

    // Tape banner "i love you"
    ctx.save();
    ctx.translate(50, 36);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-45, -12, 90, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('i love you', 0, 4);
    ctx.restore();

    // Broken heart & pin
    ctx.font = '24px sans-serif';
    ctx.fillText('💔', 46, height - 95);
    ctx.fillText('⏳', width - 46, height - 95);
  }

  // Y2K Metallic Stars border
  else if (pattern === 'metallic-stars') {
    const starCoords = [
      { x: 30, y: 30, r: 14, color: '#e2e8f0' },
      { x: width - 30, y: 30, r: 16, color: '#f59e0b' },
      { x: 22, y: height / 3, r: 12, color: '#94a3b8' },
      { x: width - 22, y: height / 3, r: 13, color: '#e2e8f0' },
      { x: 22, y: (height * 2) / 3, r: 14, color: '#f59e0b' },
      { x: width - 22, y: (height * 2) / 3, r: 12, color: '#94a3b8' },
      { x: 34, y: height - 50, r: 16, color: '#e2e8f0' },
      { x: width - 34, y: height - 50, r: 15, color: '#f59e0b' }
    ];

    for (const s of starCoords) {
      ctx.fillStyle = s.color;
      drawStar(ctx, s.x, s.y, 5, s.r, s.r / 2.2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Polaroid Red Ribbon Bow
  else if (pattern === 'polaroid-ribbon') {
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎀', width / 2, 42);
    ctx.font = '22px sans-serif';
    ctx.fillText('🌸', 42, height - 85);
  }

  // The Snap Express Ticket Overlays
  else if (pattern === 'snap-express') {
    ctx.fillStyle = '#142b4a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE SNAP EXPRESS • PASS 01', width / 2, 40);

    // Verified Memories circle stamp
    ctx.save();
    ctx.translate(width - 60, 56);
    ctx.rotate(-0.2);
    ctx.strokeStyle = '#c83434';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c83434';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('VERIFIED', 0, -2);
    ctx.fillText('MEMORIES', 0, 8);
    ctx.restore();

    // Perforation line + ticket code
    ctx.strokeStyle = 'rgba(20, 43, 74, 0.3)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(24, height - 64);
    ctx.lineTo(width - 24, height - 64);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#142b4a';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('#TK-9284 ROW 04 • SEAT A1', width / 2, height - 46);
  }

  // Love is Blooming Overlays
  else if (pattern === 'love-blooming') {
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌸', 42, 44);
    ctx.fillText('🌹', width - 42, 44);
    ctx.fillStyle = '#9d174d';
    ctx.font = 'italic bold 15px Georgia, serif';
    ctx.fillText('Love is Blooming', width / 2, 34);
    ctx.font = '22px sans-serif';
    ctx.fillText('💌', 44, height - 86);
    ctx.fillText('🌷', width - 44, height - 86);
  }

  // Spooky Night Halloween Overlays
  else if (pattern === 'spooky-night') {
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎃', 42, 44);
    ctx.fillText('👻', width - 42, 44);
    ctx.fillStyle = '#fdba74';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('★ SPOOKY NIGHT ★', width / 2, 34);
    ctx.font = '22px sans-serif';
    ctx.fillText('🕸️', 44, height - 86);
    ctx.fillText('🦇', width - 44, height - 86);
  }

  ctx.restore();
}

/**
 * Render complete 300 DPI Photo Strip to a high-res Canvas
 */
export async function renderPhotoStripCanvas(options: RenderStripOptions): Promise<HTMLCanvasElement> {
  const {
    frames,
    templateType,
    frameColorHex,
    isDarkBg,
    framePattern = 'none',
    frameCorner = 'rounded',
    frameInnerBorder = 'none',
    caption,
    timestamp,
    showTimestamp,
    filter,
    stickers,
    exportScale = 1,
    eventBrandText = ''
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Dimensions based on template (High Res 300 DPI standard)
  const isGrid = templateType === 'grid';
  const width = isGrid ? 1200 : 800;
  
  // Calculate height depending on frame count and layout
  const framePadding = 28;
  const bottomBrandingHeight = 180;
  const topPadding = 32;

  let frameW = width - (framePadding * 2);
  let frameH = Math.round(frameW * 0.75); // 4:3 default

  if (frames.length === 1) {
    frameH = frameW; // 1:1 square for solo polaroid
  } else if (templateType === '6-cut' || frames.length >= 6) {
    frameH = Math.round(frameW * 0.58); // Compact 16:9 cinematic roll
  }

  if (isGrid) {
    frameW = (width - (framePadding * 3)) / 2;
    frameH = frames.length > 4 ? Math.round(frameW * 0.8) : frameW;
    const rows = Math.ceil(frames.length / 2);
    canvas.width = width;
    canvas.height = topPadding + (rows * frameH) + ((rows - 1) * framePadding) + bottomBrandingHeight;
  } else {
    canvas.width = width;
    canvas.height = topPadding + (frames.length * frameH) + ((frames.length - 1) * framePadding) + bottomBrandingHeight;
  }

  // Draw background color and texture/pattern
  drawFramePattern(ctx, canvas.width, canvas.height, framePattern, frameColorHex);

  // Corner radius calculation
  const cornerRadius = frameCorner === 'sharp' ? 0 : frameCorner === 'pill' ? 36 : 18;

  // Apply CSS Filter onto context if needed
  const filterString = getCssFilterString(filter);
  if (filterString !== 'none') {
    ctx.filter = filterString;
  }

  // Load and render each frame
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    let x = framePadding;
    let y = topPadding + i * (frameH + framePadding);

    if (isGrid) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      x = framePadding + col * (frameW + framePadding);
      y = topPadding + row * (frameH + framePadding);
    }

    try {
      const img = await loadImage(frame.dataUrl);

      // Clip image with corner radius
      ctx.save();
      ctx.beginPath();
      if (cornerRadius > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, frameW, frameH, cornerRadius);
      } else {
        ctx.rect(x, y, frameW, frameH);
      }
      ctx.clip();

      // Draw image
      ctx.drawImage(img, x, y, frameW, frameH);
      ctx.restore();

      // Draw inner border styles if requested
      if (frameInnerBorder !== 'none') {
        ctx.save();
        ctx.filter = 'none';
        ctx.lineWidth = 6;
        if (frameInnerBorder === 'white') {
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          if (cornerRadius > 0 && typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, frameW, frameH, cornerRadius);
          } else {
            ctx.rect(x, y, frameW, frameH);
          }
          ctx.stroke();
        } else if (frameInnerBorder === 'double') {
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x, y, frameW, frameH, cornerRadius);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(0, 22, 50, 0.35)';
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, frameW - 8, frameH - 8, Math.max(0, cornerRadius - 4));
          ctx.stroke();
        } else if (frameInnerBorder === 'dashed') {
          ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 22, 50, 0.45)';
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 3, frameW - 6, frameH - 6, cornerRadius);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Frame index stamp (#01, #02...)
      ctx.save();
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0, 22, 50, 0.55)';
      ctx.beginPath();
      ctx.roundRect(x + frameW - 74, y + 14, 60, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#0${i + 1}`, x + frameW - 44, y + 28);
      ctx.restore();

      if (filterString !== 'none') {
        ctx.filter = filterString;
      }
    } catch {
      // Draw placeholder if failed
      ctx.fillStyle = '#e7eeff';
      ctx.fillRect(x, y, frameW, frameH);
    }
  }

  // Reset filter for branding and typography
  ctx.filter = 'none';

  // Bottom Branding Area
  const brandY = canvas.height - bottomBrandingHeight + 35;
  const textPrimary = isDarkBg ? '#ffffff' : '#001632';
  const textSecondary = isDarkBg ? '#d5e4f8' : '#516070';
  const textMuted = isDarkBg ? '#7d93b7' : '#74777e';

  // POSARA BOOTH Brand Name
  ctx.fillStyle = textPrimary;
  ctx.font = '800 28px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const stickerPrefix = stickers.length > 0 ? stickers[0] + ' ' : '✨ ';
  const stickerSuffix = stickers.length > 1 ? ' ' + stickers[1] : ' ✨';
  ctx.fillText(`${stickerPrefix}POSARA BOOTH${stickerSuffix}`, canvas.width / 2, brandY);

  // Custom Caption
  if (caption) {
    ctx.fillStyle = textSecondary;
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(caption, canvas.width / 2, brandY + 36);
  }

  // Date and location timestamp
  if (showTimestamp && timestamp) {
    ctx.fillStyle = textMuted;
    ctx.font = '500 16px monospace';
    ctx.fillText(timestamp, canvas.width / 2, brandY + (caption ? 66 : 42));
  }

  // Optional Studio / Event Custom Footer Branding (subtle footer label, never on faces)
  const cleanEventBrand = eventBrandText.trim();
  if (cleanEventBrand) {
    ctx.fillStyle = textSecondary;
    ctx.font = '700 14px "Inter", sans-serif';
    const eventBrandY = brandY + (caption ? 94 : showTimestamp && timestamp ? 72 : 44);
    ctx.fillText(cleanEventBrand, canvas.width / 2, eventBrandY);
  }

  // Authentic bottom perforation / dots
  const dotY = canvas.height - 20;
  ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 22, 50, 0.15)';
  const dotCount = 12;
  const dotSpacing = (canvas.width - 80) / (dotCount - 1);
  for (let d = 0; d < dotCount; d++) {
    ctx.beginPath();
    ctx.arc(40 + d * dotSpacing, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw theme overlays (airmail stamps, ticket notches, barcodes, stickers)
  drawThemeOverlays(ctx, canvas.width, canvas.height, framePattern);

  // Rescale for Free (72 DPI < 1) or Studio Pro (600 DPI > 1)
  if (exportScale > 0 && exportScale !== 1) {
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.max(1, Math.round(canvas.width * exportScale));
    scaledCanvas.height = Math.max(1, Math.round(canvas.height * exportScale));
    const sCtx = scaledCanvas.getContext('2d');
    if (sCtx) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      return scaledCanvas;
    }
  }

  return canvas;
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Bundle all single frame photos into a ZIP file and trigger download
 */
export async function downloadFramesZip(frames: CapturedFrame[], baseName = 'posara_session'): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(baseName) || zip;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    let imageBlob: Blob | null = null;

    if (frame.dataUrl.startsWith('data:')) {
      const res = await fetch(frame.dataUrl);
      imageBlob = await res.blob();
    } else {
      // Remote image url: draw to canvas and get blob
      const img = await loadImage(frame.dataUrl);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth || 800;
      tempCanvas.height = img.naturalHeight || 600;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(img, 0, 0);
        imageBlob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.95));
      }
    }

    if (imageBlob) {
      folder.file(`frame_0${i + 1}.jpg`, imageBlob);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  downloadFile(zipContent, `${baseName}_single_photos.zip`);
}
