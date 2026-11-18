// @ts-nocheck
import http from 'k6/http';
import { check, group, sleep } from 'k6';

/**
 * POSARA Digital Booth - Grafana k6 Viral Traffic Load Test
 * Menguji ketahanan website & API saat diakses ratusan pengunjung bersamaan sebelum publish/viral.
 *
 * Cara jalan (lokal/CI):
 *   k6 run tests/loadtest.k6.js
 *   K6_BASE_URL=https://domain-kamu.app k6 run tests/loadtest.k6.js
 */
const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3001';

export const options = {
  stages: [
    { duration: '5s', target: 50 },   // Warm-up: 50 pengunjung bersamaan
    { duration: '10s', target: 150 }, // Normal rame: 150 pengunjung bersamaan
    { duration: '10s', target: 300 }, // Viral spike: 300 pengunjung bersamaan
    { duration: '5s', target: 0 }     // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99']
  }
};

const TIERS = ['weekend', 'creator', 'studio'];

function buildVisitorHeaders(vu, iter) {
  const octet2 = ((vu >> 8) % 200) + 1;
  const octet3 = (vu % 250) + 1;
  const octet4 = (iter % 250) + 1;
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `10.${octet2}.${octet3}.${octet4}`
  };
}

export default function () {
  const headers = buildVisitorHeaders(__VU, __ITER);

  group('01_Landing_&_Static', () => {
    const homeRes = http.get(`${BASE_URL}/`, { headers });
    check(homeRes, {
      'landing status 200': (r) => r.status === 200,
      'landing contains POSARA': (r) => r.body && r.body.includes('POSARA')
    });
  });

  group('02_API_Health_&_Plans', () => {
    const healthRes = http.get(`${BASE_URL}/api/health`, { headers });
    check(healthRes, {
      'health status 200': (r) => r.status === 200,
      'qrisReady true': (r) => r.json('qrisReady') === true
    });

    const plansRes = http.get(`${BASE_URL}/api/plans`, { headers });
    check(plansRes, {
      'plans status 200': (r) => r.status === 200,
      'plans has creator': (r) => Boolean(r.json('plans.creator'))
    });
  });

  // ~25% pengunjung juga membuka modal checkout QRIS Dinamis
  if (__ITER % 4 === 0) {
    group('03_QRIS_Dynamic_Checkout', () => {
      const tier = TIERS[(__VU + __ITER) % TIERS.length];
      const payload = JSON.stringify({
        tier,
        billingCycle: tier === 'weekend' ? 'once' : 'monthly',
        referenceCode: `PSR-K6-${__VU}-${__ITER}`
      });
      const qrisRes = http.post(`${BASE_URL}/api/qris/generate`, payload, { headers });
      check(qrisRes, {
        'qris status 200': (r) => r.status === 200,
        'qris configured true': (r) => r.json('configured') === true,
        'qris data url present': (r) => {
          const url = r.json('qrDataUrl');
          return (
            typeof url === 'string' &&
            (url.startsWith('data:image/svg+xml;base64,') ||
              url.startsWith('data:image/png;base64,'))
          );
        }
      });
    });
  }

  sleep(0.2);
}
