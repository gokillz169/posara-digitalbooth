import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderInvoiceData,
  deriveFallbackInvoiceNumber,
  formatInvoiceSummaryText,
  generateOrderInvoiceNumber
} from './invoice.ts';

test('generateOrderInvoiceNumber creates rule-safe uppercase alphanumeric invoice numbers', () => {
  const date = new Date('2026-11-16T10:30:00Z');
  for (const tier of ['weekend', 'creator', 'studio'] as const) {
    const inv = generateOrderInvoiceNumber(tier, date);
    assert.match(inv, /^INV-(WKD|CRT|STD)-261116-[A-Z0-9]{4}$/);
    assert.ok(inv.length >= 6 && inv.length <= 32);
  }
});

test('deriveFallbackInvoiceNumber derives deterministic invoice codes for legacy orders', () => {
  assert.equal(deriveFallbackInvoiceNumber('PSR-CRT-1116-ABCD', 'req_123'), 'INV-CRT-1116-ABCD');
  assert.equal(deriveFallbackInvoiceNumber('', 'req_u1_99887766'), 'INV-PSR-99887766');
});

test('buildOrderInvoiceData computes complete itemized breakdown and status labels', () => {
  const inv = buildOrderInvoiceData({
    invoiceNumber: 'INV-CRT-261116-9A2B',
    referenceCode: 'PSR-CRT-1116-9A2B',
    createdAtMs: Date.UTC(2026, 10, 16, 12, 15),
    customerName: 'Siti Rahma',
    customerEmail: 'siti@example.com',
    requestedPlan: 'creator',
    billingCycle: 'monthly',
    amountIdr: 15000,
    paymentNote: 'ShopeePay a.n. Siti',
    reviewedByEmail: 'mutawakkils16@gmail.com',
    status: 'approved'
  });

  assert.equal(inv.invoiceNumber, 'INV-CRT-261116-9A2B');
  assert.equal(inv.totalIdr, 15000);
  assert.equal(inv.adminFeeIdr, 0);
  assert.equal(inv.statusLabel, 'LUNAS · PAKET AKTIF');
  assert.equal(inv.merchantName, 'POSARA DIGITAL BOOTH');
  assert.match(inv.issuedAtLabel, /WIB$/);

  const summary = formatInvoiceSummaryText(inv);
  assert.ok(summary.includes('INV-CRT-261116-9A2B'));
  assert.ok(summary.includes('Rp 15.000'));
  assert.ok(summary.includes('LUNAS · PAKET AKTIF'));
});
