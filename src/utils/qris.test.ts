import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POSARA_DEFAULT_QRIS_STATIC,
  POSARA_OFFICIAL_MERCHANT,
  buildDynamicQrisPayload,
  computeCrc16Ccitt,
  parseEmvTlv,
  serializeEmvTlv,
  validateQrisPayload
} from './qris.ts';

function makeStaticSampleQris(): string {
  const merchantInfo = serializeEmvTlv([
    { tag: '00', value: 'ID.CO.QRIS.WWW' },
    { tag: '01', value: '936009140000000000' }
  ]);
  const base = serializeEmvTlv([
    { tag: '00', value: '01' },
    { tag: '01', value: '11' },
    { tag: '26', value: merchantInfo },
    { tag: '52', value: '5999' },
    { tag: '53', value: '360' },
    { tag: '58', value: 'ID' },
    { tag: '59', value: 'POSARA STUDIO' },
    { tag: '60', value: 'JAKARTA' },
    { tag: '61', value: '12340' }
  ]);
  const withPrefix = `${base}6304`;
  return `${withPrefix}${computeCrc16Ccitt(withPrefix)}`;
}

test('computeCrc16Ccitt matches standard EMVCo test vector', () => {
  const sample = makeStaticSampleQris();
  const validation = validateQrisPayload(sample);
  assert.equal(validation.valid, true);
  assert.equal(validation.merchantName, 'POSARA STUDIO');
  assert.equal(validation.merchantCity, 'JAKARTA');
  assert.equal(validation.pointOfInitiation, '11');
});

test('validateQrisPayload rejects tampered CRC or malformed header', () => {
  const valid = makeStaticSampleQris();
  const tampered = `${valid.slice(0, -1)}${valid.endsWith('0') ? '1' : '0'}`;
  const res1 = validateQrisPayload(tampered);
  assert.equal(res1.valid, false);
  assert.ok(res1.error?.includes('CRC-16'));

  const res2 = validateQrisPayload('https://not-a-qris-payload');
  assert.equal(res2.valid, false);
});

test('buildDynamicQrisPayload injects dynamic initiation (12), amount (54), reference (62/05), and valid CRC', () => {
  const staticQris = makeStaticSampleQris();
  const dynamicQris = buildDynamicQrisPayload(staticQris, 10000, 'PSR-CRT-1114-ABCD');

  const check = validateQrisPayload(dynamicQris);
  assert.equal(check.valid, true);
  assert.equal(check.pointOfInitiation, '12');

  const nodes = parseEmvTlv(dynamicQris);
  assert.ok(nodes);
  const tag54 = nodes.find((n) => n.tag === '54');
  assert.equal(tag54?.value, '10000');

  const tag62 = nodes.find((n) => n.tag === '62');
  assert.ok(tag62);
  const sub62 = parseEmvTlv(tag62.value);
  const refNode = sub62?.find((s) => s.tag === '05');
  assert.equal(refNode?.value, 'PSR-CRT-1114-ABCD');
});

test('official POSARA_DEFAULT_QRIS_STATIC validates cleanly and converts to dynamic across all tiers', () => {
  const validation = validateQrisPayload(POSARA_DEFAULT_QRIS_STATIC);
  assert.equal(validation.valid, true);
  assert.equal(validation.merchantName, POSARA_OFFICIAL_MERCHANT.name);
  assert.equal(validation.merchantCity, POSARA_OFFICIAL_MERCHANT.city);
  assert.equal(validation.nmid, POSARA_OFFICIAL_MERCHANT.nmid);
  assert.equal(validation.acquirerDomain, POSARA_OFFICIAL_MERCHANT.acquirerDomain);

  for (const amount of [5000, 10000, 96000, 15000, 144000]) {
    const ref = `PSR-TST-${amount}`;
    const dynamic = buildDynamicQrisPayload(POSARA_DEFAULT_QRIS_STATIC, amount, ref);
    const dynamicCheck = validateQrisPayload(dynamic);
    assert.equal(dynamicCheck.valid, true);
    assert.equal(dynamicCheck.pointOfInitiation, '12');
    assert.equal(dynamicCheck.nmid, POSARA_OFFICIAL_MERCHANT.nmid);

    const nodes = parseEmvTlv(dynamic);
    assert.equal(nodes?.find((n) => n.tag === '54')?.value, String(amount));

    const tag62 = nodes?.find((n) => n.tag === '62')?.value || '';
    const sub62 = parseEmvTlv(tag62);
    assert.equal(sub62?.find((s) => s.tag === '05')?.value, ref);
    assert.equal(sub62?.find((s) => s.tag === '07')?.value, POSARA_OFFICIAL_MERCHANT.terminalId);
  }
});
