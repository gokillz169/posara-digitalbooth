import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_EMAIL,
  isAuthorizedAdminEmail,
  isComplimentaryStudioEmail,
  isAdminEntryUrl,
  isValidKioskPin,
  verifyKioskPin,
  normalizeWatermarkText,
  getActiveEventBranding,
  getCleanVisitorUrl
} from './adminAccess.ts';

test('isAuthorizedAdminEmail strictly allows only verified owner email', () => {
  assert.equal(isAuthorizedAdminEmail(OWNER_EMAIL, true), true);
  assert.equal(isAuthorizedAdminEmail('MUTAWAKKILS16@GMAIL.COM', true), true);
  assert.equal(isAuthorizedAdminEmail('fitriyaninovitasari8@gmail.com', true), false);
  assert.equal(isAuthorizedAdminEmail(OWNER_EMAIL, false), false);
  assert.equal(isAuthorizedAdminEmail(OWNER_EMAIL, undefined), false);
  assert.equal(isAuthorizedAdminEmail('pengunjung@gmail.com', true), false);
  assert.equal(isAuthorizedAdminEmail(null, true), false);
});

test('isComplimentaryStudioEmail grants free lifetime Studio Pro only to verified owner & designated VIP email', () => {
  assert.equal(isComplimentaryStudioEmail(OWNER_EMAIL, true), true);
  assert.equal(isComplimentaryStudioEmail('fitriyaninovitasari8@gmail.com', true), true);
  assert.equal(isComplimentaryStudioEmail(' FITRIYANINOVITASARI8@GMAIL.COM ', true), true);
  assert.equal(isComplimentaryStudioEmail('fitriyaninovitasari8@gmail.com', false), false);
  assert.equal(isComplimentaryStudioEmail('pengunjung@gmail.com', true), false);
  assert.equal(isComplimentaryStudioEmail(null, true), false);
});

test('isAdminEntryUrl detects /admin, #admin, #/admin, and ?admin=1', () => {
  assert.equal(isAdminEntryUrl('/admin', '', ''), true);
  assert.equal(isAdminEntryUrl('/admin/', '', ''), true);
  assert.equal(isAdminEntryUrl('/', '#admin', ''), true);
  assert.equal(isAdminEntryUrl('/', '#/admin', ''), true);
  assert.equal(isAdminEntryUrl('/', '', '?admin=1'), true);
  assert.equal(isAdminEntryUrl('/', '', '?mode=admin'), true);
  assert.equal(isAdminEntryUrl('/', '', ''), false);
  assert.equal(isAdminEntryUrl('/template', '#galeri', '?tab=1'), false);
});

test('isValidKioskPin and verifyKioskPin reject non-numeric or backdoor PINs', () => {
  assert.equal(isValidKioskPin('2025'), true);
  assert.equal(isValidKioskPin('482910'), true);
  assert.equal(isValidKioskPin('123'), false);
  assert.equal(isValidKioskPin('1234567'), false);
  assert.equal(isValidKioskPin('abcd'), false);

  assert.equal(verifyKioskPin('4829', '4829'), true);
  assert.equal(verifyKioskPin('1234', '4829'), false);
  assert.equal(verifyKioskPin('2025', '4829'), false);
});

test('normalizeWatermarkText trims and enforces 80 character limit', () => {
  assert.equal(normalizeWatermarkText('  POSARA Event  '), 'POSARA Event');
  const longText = 'A'.repeat(120);
  assert.equal(normalizeWatermarkText(longText).length, 80);

  assert.equal(
    getActiveEventBranding({ customWatermarkEnabled: false, watermarkText: 'Wedding Dimas' }),
    ''
  );
  assert.equal(
    getActiveEventBranding({ customWatermarkEnabled: true, watermarkText: '  Dimas & Sarah  ' }),
    'Dimas & Sarah'
  );
});

test('getCleanVisitorUrl strips admin path, hash, and query flags', () => {
  assert.equal(getCleanVisitorUrl('https://posara.app/admin?admin=1#admin'), '/');
  assert.equal(
    getCleanVisitorUrl('https://posara.app/?mode=admin&template=classic'),
    '/?template=classic'
  );
});
