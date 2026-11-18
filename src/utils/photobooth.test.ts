import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhotoboothTimestamp,
  generateSessionCode,
  calculateYearlyDiscount,
  calculateCreditMetrics,
  getCssFilterString,
  getTemplateLayoutConfig,
  resolveStripIsDarkBg
} from './photobooth';

test('formatPhotoboothTimestamp formats correctly with WIB suffix', () => {
  const fixedDate = new Date(2025, 9, 24, 15, 30); // 24 Oct 2025 15:30
  const formatted = formatPhotoboothTimestamp(fixedDate);
  assert.match(formatted, /^24\.10\.2025 • 15:30 WIB$/);
});

test('generateSessionCode outputs standard PS-NNNNA format', () => {
  const code = generateSessionCode();
  assert.match(code, /^PS-\d{4}[A-Z]$/);
});

test('calculateYearlyDiscount calculates 20% discount accurately for Creator Pass & Studio Pro', () => {
  const creator = calculateYearlyDiscount(10000, 20);
  assert.equal(creator.monthlyEquivalent, 8000);
  assert.equal(creator.annualTotal, 8000 * 12);
  assert.equal(creator.totalSaved, (10000 * 12) - (8000 * 12));

  const studio = calculateYearlyDiscount(15000, 20);
  assert.equal(studio.monthlyEquivalent, 12000);
  assert.equal(studio.annualTotal, 12000 * 12);
});

test('calculateCreditMetrics calculates remaining credits and low threshold flag', () => {
  const normalMetrics = calculateCreditMetrics(1000, 150);
  assert.equal(normalMetrics.remaining, 850);
  assert.equal(normalMetrics.percentRemaining, 85);
  assert.equal(normalMetrics.isLow, false);

  const lowMetrics = calculateCreditMetrics(1000, 900);
  assert.equal(lowMetrics.remaining, 100);
  assert.equal(lowMetrics.percentRemaining, 10);
  assert.equal(lowMetrics.isLow, true);
});

test('getCssFilterString returns appropriate CSS filters including seoul-clean', () => {
  assert.equal(getCssFilterString('normal'), 'none');
  assert.match(getCssFilterString('monochrome'), /grayscale/);
  assert.match(getCssFilterString('warm'), /sepia/);
  assert.match(getCssFilterString('cinematic'), /contrast/);
  assert.match(getCssFilterString('kodak-gold'), /saturate/);
  assert.match(getCssFilterString('seoul-clean'), /brightness\(108%\)/);
});

test('getTemplateLayoutConfig assigns correct column count and aspect ratio', () => {
  const gridConfig = getTemplateLayoutConfig('grid', 4);
  assert.equal(gridConfig.columns, 2);
  assert.equal(gridConfig.isGrid, true);

  const stripConfig = getTemplateLayoutConfig('4-cut', 4);
  assert.equal(stripConfig.columns, 1);
  assert.equal(stripConfig.isGrid, false);

  const sixCutConfig = getTemplateLayoutConfig('6-cut', 6);
  assert.equal(sixCutConfig.columns, 1);
  assert.equal(sixCutConfig.aspectRatio, '16/9');
  assert.equal(sixCutConfig.isGrid, false);
});

test('FRAME_COLOR_OPTIONS contains 14 vibrant palettes with hex and text themes', async () => {
  const { FRAME_COLOR_OPTIONS } = await import('../data/mockData.ts');
  assert.equal(FRAME_COLOR_OPTIONS.length, 14);
  for (const color of FRAME_COLOR_OPTIONS) {
    assert.match(color.hex, /^#[0-9a-fA-F]{6}$/);
    assert.ok(color.textTheme === 'light' || color.textTheme === 'dark');
    assert.ok(color.label.length > 0);
  }
});

test('FRAME_PATTERN_OPTIONS contains 20 aesthetic Pinterest, Y2K, seasonal and texture motifs', async () => {
  const { FRAME_PATTERN_OPTIONS } = await import('../data/mockData.ts');
  assert.equal(FRAME_PATTERN_OPTIONS.length, 20);
  const ids = FRAME_PATTERN_OPTIONS.map((p) => p.id);
  assert.ok(ids.includes('none'));
  assert.ok(ids.includes('snap-express'));
  assert.ok(ids.includes('airmail'));
  assert.ok(ids.includes('love-blooming'));
  assert.ok(ids.includes('cinema-ticket'));
  assert.ok(ids.includes('barcode-film'));
  assert.ok(ids.includes('y2k-comic-blue'));
  assert.ok(ids.includes('dark-romance'));
  assert.ok(ids.includes('metallic-stars'));
  assert.ok(ids.includes('spooky-night'));
  assert.ok(ids.includes('polka'));
  assert.ok(ids.includes('polaroid-ribbon'));
  assert.ok(ids.includes('vintage-lace'));
  assert.ok(ids.includes('checker'));
  assert.ok(ids.includes('hearts'));
  assert.ok(ids.includes('stars'));
  assert.ok(ids.includes('film-sprocket'));
  assert.ok(ids.includes('gradient-aurora'));
  assert.ok(ids.includes('gradient-sunset'));
  assert.ok(ids.includes('vintage-kraft'));
});

test('PHOTO_TEMPLATES includes 22 templates across all 6 categories', async () => {
  const { PHOTO_TEMPLATES, SAMPLE_CANDID_PHOTOS } = await import('../data/mockData.ts');
  assert.equal(PHOTO_TEMPLATES.length, 22);
  assert.equal(SAMPLE_CANDID_PHOTOS.length, 22);
  for (const photoPath of SAMPLE_CANDID_PHOTOS) {
    assert.ok(photoPath.startsWith('/assets/'), `Expected local photobooth asset, got ${photoPath}`);
  }

  const templateIds = PHOTO_TEMPLATES.map((t) => t.id);
  assert.ok(templateIds.includes('snap-express-4'));
  assert.ok(templateIds.includes('airmail-vintage-3'));
  assert.ok(templateIds.includes('love-blooming-3'));
  assert.ok(templateIds.includes('cinema-ticket-4'));
  assert.ok(templateIds.includes('spooky-night-4'));
  assert.ok(templateIds.includes('barcode-film-4'));
  assert.ok(templateIds.includes('y2k-comic-blue-3'));
  assert.ok(templateIds.includes('dark-romance-4'));
  assert.ok(templateIds.includes('metallic-stars-4'));
  assert.ok(templateIds.includes('polka-dots-4'));

  const categories = new Set(PHOTO_TEMPLATES.map((t) => t.category));
  for (const expected of ['ticket', 'vintage', 'y2k', 'romantic', 'seasonal', 'film'] as const) {
    assert.ok(categories.has(expected), `Missing category ${expected}`);
  }

  const leadPhotos = new Set(PHOTO_TEMPLATES.map((t) => t.previewImages[0]));
  assert.equal(leadPhotos.size, PHOTO_TEMPLATES.length, 'Every template must have a distinct lead photo');

  const topSixFrames = PHOTO_TEMPLATES.slice(0, 6).flatMap((t) => t.previewImages);
  assert.equal(new Set(topSixFrames).size, topSixFrames.length, 'Top 6 templates must have zero duplicate frames');
});

test('FILTER_OPTIONS contains 17 filters including seoul-clean and kodak-gold', async () => {
  const { FILTER_OPTIONS } = await import('../data/mockData.ts');
  assert.equal(FILTER_OPTIONS.length, 17);
  const filterIds = FILTER_OPTIONS.map((f) => f.id);
  assert.ok(filterIds.includes('normal'));
  assert.ok(filterIds.includes('seoul-clean'));
  assert.ok(filterIds.includes('kodak-gold'));
  assert.ok(filterIds.includes('cyberpunk'));
});

test('FRAME_CORNER_OPTIONS and FRAME_INNER_BORDER_OPTIONS are properly configured', async () => {
  const { FRAME_CORNER_OPTIONS, FRAME_INNER_BORDER_OPTIONS } = await import('../data/mockData.ts');
  assert.equal(FRAME_CORNER_OPTIONS.length, 3);
  assert.equal(FRAME_INNER_BORDER_OPTIONS.length, 4);
});

test('resolveStripIsDarkBg lets overriding patterns take precedence over base frame color', () => {
  // Light-paper patterns on dark base color must still resolve light bg (dark text)
  assert.equal(resolveStripIsDarkBg('bg-primary', 'snap-express', 'light'), false);
  assert.equal(resolveStripIsDarkBg('bg-cherry', 'airmail', 'light'), false);
  assert.equal(resolveStripIsDarkBg('bg-darkplum', 'love-blooming', 'light'), false);
  assert.equal(resolveStripIsDarkBg('bg-primary', 'polaroid-ribbon', 'light'), false);
  assert.equal(resolveStripIsDarkBg('bg-primary', 'gradient-aurora', 'light'), false);

  // Dark patterns on white base color must resolve dark bg (light text)
  assert.equal(resolveStripIsDarkBg('bg-surface-container-lowest', 'cinema-ticket', 'dark'), true);
  assert.equal(resolveStripIsDarkBg('bg-surface-container-lowest', 'barcode-film', 'dark'), true);
  assert.equal(resolveStripIsDarkBg('bg-surface-container-lowest', 'spooky-night', 'dark'), true);

  // Base-preserving patterns follow base paper color (especially film-sprocket)
  assert.equal(resolveStripIsDarkBg('bg-surface-container-lowest', 'film-sprocket', 'dark'), false);
  assert.equal(resolveStripIsDarkBg('bg-primary', 'film-sprocket', 'light'), true);
  assert.equal(resolveStripIsDarkBg('bg-surface-container-lowest', 'polka', 'dark'), false);
  assert.equal(resolveStripIsDarkBg('bg-cherry', 'none', 'light'), true);
});



