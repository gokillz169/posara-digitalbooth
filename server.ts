import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { PLAN_META, getCurrentCycleKey, getPlanPriceInfo } from './src/utils/subscription.ts';
import type { BillingCycle, PlanTier } from './src/utils/subscription.ts';
import {
  POSARA_DEFAULT_QRIS_STATIC,
  POSARA_OFFICIAL_MERCHANT,
  buildDynamicQrisPayload,
  validateQrisPayload
} from './src/utils/qris.ts';
import {
  SlidingWindowRateLimiter,
  TtlLruCache,
  extractClientIp
} from './src/utils/rateLimit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;

// Anti-DoS per-IP rate limiters (calibrated for shared venue Wi-Fi + viral spikes)
const apiGlobalLimiter = new SlidingWindowRateLimiter({
  maxRequests: 300,
  windowMs: 60_000,
  maxEntries: 5000
});
const qrisGenerateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 45,
  windowMs: 60_000,
  maxEntries: 5000
});
const qrisValidateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60_000,
  maxEntries: 5000
});
const qrCodeCache = new TtlLruCache<{
  dynamicPayload: string;
  qrDataUrl: string;
}>({ maxEntries: 600, ttlMs: 15 * 60_000 });

function isPaidTier(tier: unknown): tier is Exclude<PlanTier, 'free'> {
  return tier === 'weekend' || tier === 'creator' || tier === 'studio';
}

function isValidBillingCycle(cycle: unknown): cycle is BillingCycle {
  return cycle === 'once' || cycle === 'monthly' || cycle === 'yearly';
}

function resolveAuthoritativeMerchantQris(): string {
  const envQris = (process.env.POSARA_QRIS_STATIC || '').trim();
  if (envQris && validateQrisPayload(envQris).valid) {
    return envQris;
  }
  return POSARA_DEFAULT_QRIS_STATIC;
}

const AUTHORITATIVE_MERCHANT_QRIS = resolveAuthoritativeMerchantQris();
const AUTHORITATIVE_MERCHANT_VALIDATION = validateQrisPayload(AUTHORITATIVE_MERCHANT_QRIS);

let cachedPlansCycleKey = '';
let cachedPlansPayloadJson = '';

function getSerializedPlansPayload(): string {
  const cycleKey = getCurrentCycleKey();
  if (cachedPlansCycleKey !== cycleKey || !cachedPlansPayloadJson) {
    cachedPlansCycleKey = cycleKey;
    cachedPlansPayloadJson = JSON.stringify({
      plans: PLAN_META,
      pricingMatrix: {
        weekendOnce: getPlanPriceInfo('weekend', 'monthly'),
        creatorMonthly: getPlanPriceInfo('creator', 'monthly'),
        creatorYearly: getPlanPriceInfo('creator', 'yearly'),
        studioMonthly: getPlanPriceInfo('studio', 'monthly'),
        studioYearly: getPlanPriceInfo('studio', 'yearly')
      },
      serverCycleKey: cycleKey
    });
  }
  return cachedPlansPayloadJson;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(compression());

  // Security headers (preserve iFrame embeddability inside studio preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
    next();
  });

  // Strict tight payload cap (16kb) + rate limit across all /api routes to block DoS / billing spikes
  app.use('/api', express.json({ limit: '16kb' }), (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientIp = extractClientIp(req.headers['x-forwarded-for'], req.socket.remoteAddress);
    const verdict = apiGlobalLimiter.consume(clientIp);
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds));
      res.status(429).json({
        error: `Terlalu banyak permintaan dari IP Anda. Coba lagi dalam ${verdict.retryAfterSeconds} detik.`
      });
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'posara-backend',
      timestamp: new Date().toISOString(),
      serverCycleKey: getCurrentCycleKey(),
      qrisReady: AUTHORITATIVE_MERCHANT_VALIDATION.valid,
      merchant: {
        name: AUTHORITATIVE_MERCHANT_VALIDATION.merchantName || POSARA_OFFICIAL_MERCHANT.name,
        city: AUTHORITATIVE_MERCHANT_VALIDATION.merchantCity || POSARA_OFFICIAL_MERCHANT.city,
        nmid: AUTHORITATIVE_MERCHANT_VALIDATION.nmid || POSARA_OFFICIAL_MERCHANT.nmid
      }
    });
  });

  app.get('/api/plans', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(getSerializedPlansPayload());
  });

  app.post('/api/qris/validate', (req, res) => {
    const clientIp = extractClientIp(req.headers['x-forwarded-for'], req.socket.remoteAddress);
    const verdict = qrisValidateLimiter.consume(clientIp);
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds));
      res.status(429).json({
        valid: false,
        error: `Terlalu banyak validasi. Tunggu ${verdict.retryAfterSeconds} detik.`
      });
      return;
    }

    const qrisString = typeof req.body?.qrisString === 'string' ? req.body.qrisString : '';
    const validation = validateQrisPayload(qrisString);
    if (!validation.valid) {
      res.status(400).json(validation);
      return;
    }
    res.json(validation);
  });

  app.post('/api/qris/generate', async (req, res) => {
    const clientIp = extractClientIp(req.headers['x-forwarded-for'], req.socket.remoteAddress);
    const verdict = qrisGenerateLimiter.consume(clientIp);
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds));
      res.status(429).json({
        configured: false,
        error: `Terlalu sering membuat kode QRIS. Tunggu ${verdict.retryAfterSeconds} detik.`
      });
      return;
    }

    const { tier, billingCycle, referenceCode } = req.body ?? {};

    if (!isPaidTier(tier)) {
      res.status(400).json({ error: 'Paket langganan tidak valid.' });
      return;
    }
    if (!isValidBillingCycle(billingCycle)) {
      res.status(400).json({ error: 'Siklus tagihan tidak valid.' });
      return;
    }
    if (
      (tier === 'weekend' && billingCycle !== 'once') ||
      (tier !== 'weekend' && billingCycle === 'once')
    ) {
      res.status(400).json({ error: 'Kombinasi paket dan siklus tagihan tidak valid.' });
      return;
    }

    const cycleInput = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const priceInfo = getPlanPriceInfo(tier, cycleInput);

    const safeRef =
      typeof referenceCode === 'string'
        ? referenceCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 25)
        : '';

    // Server-authoritative merchant QRIS prevents client-side merchant swapping (quishing defense)
    if (!AUTHORITATIVE_MERCHANT_VALIDATION.valid) {
      res.status(500).json({
        configured: false,
        error: 'Konfigurasi QRIS merchant bermasalah.'
      });
      return;
    }

    try {
      const cacheKey = `${tier}:${priceInfo.billingCycle}:${safeRef}:${AUTHORITATIVE_MERCHANT_QRIS.slice(-12)}`;
      let cached = qrCodeCache.get(cacheKey);
      if (!cached) {
        const dynamicPayload = buildDynamicQrisPayload(
          AUTHORITATIVE_MERCHANT_QRIS,
          priceInfo.amountIdr,
          safeRef
        );
        const svgMarkup = await QRCode.toString(dynamicPayload, {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#001632',
            light: '#ffffff'
          }
        });
        const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgMarkup, 'utf8').toString('base64')}`;
        cached = { dynamicPayload, qrDataUrl };
        qrCodeCache.set(cacheKey, cached);
      }

      res.json({
        configured: true,
        tier,
        billingCycle: priceInfo.billingCycle,
        amountIdr: priceInfo.amountIdr,
        referenceCode: safeRef,
        merchantName: AUTHORITATIVE_MERCHANT_VALIDATION.merchantName || POSARA_OFFICIAL_MERCHANT.name,
        merchantCity: AUTHORITATIVE_MERCHANT_VALIDATION.merchantCity || POSARA_OFFICIAL_MERCHANT.city,
        nmid: AUTHORITATIVE_MERCHANT_VALIDATION.nmid || POSARA_OFFICIAL_MERCHANT.nmid,
        acquirerDomain:
          AUTHORITATIVE_MERCHANT_VALIDATION.acquirerDomain || POSARA_OFFICIAL_MERCHANT.acquirerDomain,
        dynamicPayload: cached.dynamicPayload,
        qrDataUrl: cached.qrDataUrl
      });
    } catch {
      res.status(500).json({
        configured: false,
        error: 'Gagal membuat QRIS dinamis. Silakan ulangi beberapa saat lagi.'
      });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  app.use(
    '/api',
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 400;
      if (status === 413) {
        res.status(413).json({ error: 'Ukuran payload melebihi batas aman (maksimal 16KB).' });
        return;
      }
      res.status(status >= 400 && status < 600 ? status : 400).json({
        error: 'Format permintaan JSON tidak valid.'
      });
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: 'spa'
    });

    // Prevent Vite 8's client script from attempting an unused HMR WebSocket connection in Cloud Run / iframe preview
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (!transformed) {
          next();
          return;
        }
        const safeClientCode = transformed.code
          .replace('console.debug("[vite] connecting...");', '/* [vite] HMR disabled */')
          .replace('transport.connect(createHMRHandler(handleMessage));', '/* [vite] HMR WebSocket disabled */')
          .replace('setupForwardConsoleHandler(transport, forwardConsole);', '/* [vite] console forwarding disabled */');

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(safeClientCode);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distDir, 'index.html');
    const cachedIndexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : null;

    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`) && /\.[a-f0-9]{8}\./i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      })
    );

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      if (cachedIndexHtml) {
        res.type('html').send(cachedIndexHtml);
        return;
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`POSARA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start POSARA server:', err);
  process.exit(1);
});
