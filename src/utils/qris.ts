export const POSARA_DEFAULT_QRIS_STATIC =
  '00020101021126610016ID.CO.SHOPEE.WWW01189360091800241787470208241787470303UMI51440014ID.CO.QRIS.WWW0215ID10266397055690303UMI5204581753033605802ID5920POSARA DIGITAL BOOTH6005DEPOK61051645562070703A0163046A34';

export const POSARA_OFFICIAL_MERCHANT = {
  name: 'POSARA DIGITAL BOOTH',
  city: 'DEPOK',
  nmid: 'ID1026639705569',
  terminalId: 'A01',
  acquirerDomain: 'ID.CO.SHOPEE.WWW'
} as const;

export interface ParsedTlvNode {
  tag: string;
  value: string;
}

export interface QrisValidationResult {
  valid: boolean;
  error?: string;
  merchantName?: string;
  merchantCity?: string;
  currencyCode?: string;
  pointOfInitiation?: string;
  nmid?: string;
  acquirerDomain?: string;
}

/**
 * Computes ISO/IEC 13239 CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF).
 * Standard checksum algorithm required by EMVCo & Bank Indonesia QRIS Tag 63.
 */
export function computeCrc16Ccitt(payloadWithTag63Prefix: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWithTag63Prefix.length; i++) {
    crc ^= payloadWithTag63Prefix.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseEmvTlv(payload: string): ParsedTlvNode[] | null {
  const nodes: ParsedTlvNode[] = [];
  let cursor = 0;

  while (cursor < payload.length) {
    if (cursor + 4 > payload.length) {
      return null;
    }
    const tag = payload.slice(cursor, cursor + 2);
    const lenStr = payload.slice(cursor + 2, cursor + 4);
    if (!/^[0-9A-Za-z]{2}$/.test(tag) || !/^\d{2}$/.test(lenStr)) {
      return null;
    }
    const len = Number.parseInt(lenStr, 10);
    const valueStart = cursor + 4;
    const valueEnd = valueStart + len;
    if (valueEnd > payload.length) {
      return null;
    }
    const value = payload.slice(valueStart, valueEnd);
    nodes.push({ tag, value });
    cursor = valueEnd;
  }

  return nodes;
}

export function serializeEmvTlv(nodes: ParsedTlvNode[]): string {
  return nodes
    .map((node) => {
      const len = String(node.value.length).padStart(2, '0');
      return `${node.tag}${len}${node.value}`;
    })
    .join('');
}

export function validateQrisPayload(rawPayload: string): QrisValidationResult {
  const clean = rawPayload.trim();
  if (!clean) {
    return { valid: false, error: 'String QRIS kosong.' };
  }
  if (!clean.startsWith('000201')) {
    return { valid: false, error: 'Payload QRIS harus diawali header EMVCo "000201".' };
  }
  if (clean.length < 24 || clean.length > 512) {
    return { valid: false, error: 'Panjang string QRIS tidak valid.' };
  }

  const nodes = parseEmvTlv(clean);
  if (!nodes) {
    return { valid: false, error: 'Struktur TLV EMVCo pada string QRIS rusak atau tidak lengkap.' };
  }

  const crcNode = nodes[nodes.length - 1];
  if (!crcNode || crcNode.tag !== '63' || crcNode.value.length !== 4) {
    return { valid: false, error: 'Tag CRC (6304) harus berada di akhir string QRIS.' };
  }

  const bodyBeforeCrc = clean.slice(0, clean.length - 4);
  const expectedCrc = computeCrc16Ccitt(bodyBeforeCrc);
  if (crcNode.value.toUpperCase() !== expectedCrc) {
    return {
      valid: false,
      error: `Checksum CRC-16 QRIS tidak cocok (diharapkan ${expectedCrc}, terbaca ${crcNode.value}).`
    };
  }

  const tagMap = new Map(nodes.map((n) => [n.tag, n.value]));
  const tag51Sub = tagMap.has('51') ? parseEmvTlv(tagMap.get('51') || '') : null;
  const nmid = tag51Sub?.find((sub) => sub.tag === '02')?.value;
  const tag26Sub = tagMap.has('26') ? parseEmvTlv(tagMap.get('26') || '') : null;
  const acquirerDomain = tag26Sub?.find((sub) => sub.tag === '00')?.value;

  return {
    valid: true,
    merchantName: tagMap.get('59') || 'Merchant QRIS',
    merchantCity: tagMap.get('60') || 'Indonesia',
    currencyCode: tagMap.get('53') || '360',
    pointOfInitiation: tagMap.get('01') || '11',
    nmid,
    acquirerDomain
  };
}

/**
 * Converts a valid static QRIS merchant payload into a dynamic QRIS payload
 * carrying an exact IDR transaction amount (Tag 54) and transaction reference (Tag 62/05).
 */
export function buildDynamicQrisPayload(
  staticQris: string,
  amountIdr: number,
  referenceCode?: string
): string {
  const validation = validateQrisPayload(staticQris);
  if (!validation.valid) {
    throw new Error(validation.error || 'String QRIS merchant tidak valid.');
  }
  if (!Number.isFinite(amountIdr) || amountIdr < 100 || amountIdr > 50_000_000) {
    throw new Error('Nominal transaksi QRIS di luar rentang yang diizinkan.');
  }

  const clean = staticQris.trim();
  const nodes = parseEmvTlv(clean);
  if (!nodes) {
    throw new Error('Gagal membaca node TLV QRIS.');
  }

  const filtered = nodes.filter((n) => n.tag !== '63');
  const upsertTag = (list: ParsedTlvNode[], tag: string, value: string) => {
    const idx = list.findIndex((item) => item.tag === tag);
    if (idx >= 0) {
      list[idx] = { tag, value };
    } else {
      list.push({ tag, value });
    }
  };

  // Tag 01 = '12' marks dynamic QRIS with locked amount
  upsertTag(filtered, '01', '12');

  // Tag 54 = exact integer IDR amount string
  const amountStr = String(Math.round(amountIdr));
  upsertTag(filtered, '54', amountStr);

  // Tag 62 = Additional Data Field Template, sub-tag 05 = Reference Label
  if (referenceCode && referenceCode.trim()) {
    const safeRef = referenceCode.trim().replace(/[^A-Za-z0-9\-]/g, '').slice(0, 25);
    if (safeRef) {
      const existing62 = filtered.find((n) => n.tag === '62');
      const subNodes = existing62 ? parseEmvTlv(existing62.value) || [] : [];
      const refIdx = subNodes.findIndex((s) => s.tag === '05');
      if (refIdx >= 0) {
        subNodes[refIdx] = { tag: '05', value: safeRef };
      } else {
        subNodes.push({ tag: '05', value: safeRef });
      }
      subNodes.sort((a, b) => a.tag.localeCompare(b.tag));
      upsertTag(filtered, '62', serializeEmvTlv(subNodes));
    }
  }

  filtered.sort((a, b) => Number.parseInt(a.tag, 10) - Number.parseInt(b.tag, 10));
  const unsignedPayload = `${serializeEmvTlv(filtered)}6304`;
  const crc = computeCrc16Ccitt(unsignedPayload);
  return `${unsignedPayload}${crc}`;
}
