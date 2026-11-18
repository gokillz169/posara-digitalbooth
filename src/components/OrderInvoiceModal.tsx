import React, { useState } from 'react';
import { OrderInvoiceData, formatInvoiceSummaryText } from '../utils/invoice';

interface OrderInvoiceModalProps {
  invoice: OrderInvoiceData | null;
  onClose: () => void;
}

async function downloadInvoiceAsPng(invoice: OrderInvoiceData): Promise<void> {
  const width = 900;
  const height = 1160;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean paper backdrop
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Main white invoice sheet
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(48, 48, width - 96, height - 96);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  // Brand navy header band
  ctx.fillStyle = '#001632';
  ctx.fillRect(48, 48, width - 96, 152);

  ctx.fillStyle = '#d5e4f8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ORDER INVOICE RESMI', 88, 96);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(invoice.merchantName, 88, 140);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px monospace';
  ctx.fillText(`NMID: ${invoice.merchantNmid} · DEPOK`, 88, 172);

  // Invoice number & status block
  ctx.fillStyle = '#001632';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('NOMOR INVOICE', 88, 252);
  ctx.font = 'bold 26px monospace';
  ctx.fillText(invoice.invoiceNumber, 88, 286);

  ctx.fillStyle = '#516070';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Kode Ref QRIS: ${invoice.referenceCode}`, 88, 316);
  ctx.fillText(`Diterbitkan: ${invoice.issuedAtLabel}`, 88, 342);

  // Status badge on top-right of details
  const statusBg =
    invoice.status === 'approved'
      ? '#dcfce7'
      : invoice.status === 'rejected'
      ? '#fee2e2'
      : '#fef3c7';
  const statusFg =
    invoice.status === 'approved'
      ? '#166534'
      : invoice.status === 'rejected'
      ? '#991b1b'
      : '#92400e';
  ctx.fillStyle = statusBg;
  ctx.fillRect(520, 236, 292, 46);
  ctx.fillStyle = statusFg;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(invoice.statusLabel, 536, 265);

  // Hairline divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(88, 376);
  ctx.lineTo(width - 88, 376);
  ctx.stroke();

  // Customer Details
  ctx.fillStyle = '#516070';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('DITAGIHKAN KEPADA', 88, 418);
  ctx.fillStyle = '#001632';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(invoice.customerName, 88, 450);
  ctx.fillStyle = '#516070';
  ctx.font = '18px sans-serif';
  ctx.fillText(invoice.customerEmail, 88, 480);

  // Item Table Box
  ctx.fillStyle = '#f0f3ff';
  ctx.fillRect(88, 520, width - 176, 52);
  ctx.fillStyle = '#142b4a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('DESKRIPSI PAKET', 108, 552);
  ctx.fillText('TOTAL', width - 210, 552);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(88, 572, width - 176, 130);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(88, 572, width - 176, 130);

  ctx.fillStyle = '#001632';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`1× ${invoice.planLabel}`, 108, 614);
  ctx.fillStyle = '#516070';
  ctx.font = '16px sans-serif';
  ctx.fillText(invoice.billingLabel, 108, 642);
  ctx.fillText(invoice.planBenefitsLabel, 108, 670);

  ctx.fillStyle = '#001632';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`Rp ${invoice.totalIdr.toLocaleString('id-ID')}`, width - 250, 622);

  // Totals
  ctx.fillStyle = '#516070';
  ctx.font = '18px sans-serif';
  ctx.fillText('Subtotal Paket', 470, 756);
  ctx.fillText(`Rp ${invoice.subtotalIdr.toLocaleString('id-ID')}`, 680, 756);
  ctx.fillText('Biaya Layanan QRIS', 470, 790);
  ctx.fillText('Rp 0', 680, 790);

  ctx.fillStyle = '#001632';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('TOTAL TAGIHAN', 470, 842);
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`Rp ${invoice.totalIdr.toLocaleString('id-ID')}`, 665, 842);

  // Payment metadata box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(88, 888, width - 176, 138);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(88, 888, width - 176, 138);

  ctx.fillStyle = '#142b4a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('INFORMASI PEMBAYARAN & VERIFIKASI', 108, 922);
  ctx.fillStyle = '#516070';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Metode: ${invoice.paymentMethod}`, 108, 952);
  ctx.fillText(`Catatan Pengirim: ${invoice.paymentNote.slice(0, 64)}`, 108, 980);
  if (invoice.reviewedByEmail) {
    ctx.fillText(`Diverifikasi oleh: ${invoice.reviewedByEmail}`, 108, 1008);
  }

  // Footer
  ctx.fillStyle = '#74777e';
  ctx.font = '14px sans-serif';
  ctx.fillText(
    'Dokumen ini adalah bukti Order Invoice resmi transaksi digital POSARA Booth.',
    88,
    1078
  );

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${invoice.invoiceNumber}.png`;
  link.click();
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({ invoice, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!invoice) return null;

  const statusTone =
    invoice.status === 'approved'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : invoice.status === 'rejected'
      ? 'bg-red-50 text-red-900 border-red-200'
      : 'bg-amber-50 text-amber-950 border-amber-200';

  const statusIcon =
    invoice.status === 'approved'
      ? 'check_circle'
      : invoice.status === 'rejected'
      ? 'cancel'
      : 'schedule';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatInvoiceSummaryText(invoice));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      await downloadInvoiceAsPng(invoice);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#001632]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-invoice-title"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="bg-[#001632] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold tracking-wider uppercase text-[#d5e4f8]">
              Order Invoice Transaksi
            </p>
            <h3
              id="order-invoice-title"
              className="font-mono text-[18px] font-black tracking-tight mt-0.5 tabular-nums"
            >
              {invoice.invoiceNumber}
            </h3>
            <p className="text-[11px] text-[#cbd5e1] mt-0.5">{invoice.issuedAtLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup order invoice"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-[12px]">
          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center gap-2 font-bold ${statusTone}`}>
            <span className="material-symbols-outlined text-[18px] shrink-0">{statusIcon}</span>
            <span className="text-[11.5px] tracking-wide">{invoice.statusLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#e2e8f0]">
            <div>
              <p className="text-[10.5px] font-bold text-[#74777e] uppercase tracking-wider">
                Ditagihkan Kepada
              </p>
              <p className="font-bold text-[#001632] mt-0.5 truncate">{invoice.customerName}</p>
              <p className="text-[11px] text-[#516070] truncate">{invoice.customerEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-bold text-[#74777e] uppercase tracking-wider">
                Penerima Merchant
              </p>
              <p className="font-bold text-[#001632] mt-0.5">{invoice.merchantName}</p>
              <p className="text-[11px] font-mono text-[#142b4a]">NMID {invoice.merchantNmid}</p>
            </div>
          </div>

          {/* Itemized Line */}
          <div className="rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <div className="bg-[#f0f3ff] px-3.5 py-2 flex items-center justify-between text-[10.5px] font-bold text-[#142b4a] uppercase tracking-wider">
              <span>Rincian Paket</span>
              <span>Jumlah</span>
            </div>
            <div className="p-3.5 bg-white flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-bold text-[#001632] text-[13px]">1× {invoice.planLabel}</p>
                <p className="text-[11px] text-[#516070]">{invoice.billingLabel}</p>
                <p className="text-[11px] text-[#516070]">{invoice.planBenefitsLabel}</p>
              </div>
              <span className="font-mono font-bold text-[#001632] tabular-nums shrink-0">
                Rp {invoice.subtotalIdr.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="px-3.5 py-2.5 bg-[#f8fafc] border-t border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#516070]">
                <span>Biaya Layanan QRIS</span>
                <span className="font-mono tabular-nums">Rp 0</span>
              </div>
              <div className="flex items-center justify-between text-[14px] font-black text-[#001632] pt-1 border-t border-[#e2e8f0]">
                <span>Total Tagihan</span>
                <span className="font-mono tabular-nums">
                  Rp {invoice.totalIdr.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Reference Metadata */}
          <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5 text-[11.5px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#516070]">Kode Referensi QRIS</span>
              <span className="font-mono font-bold text-[#142b4a]">{invoice.referenceCode}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#516070]">Metode Pembayaran</span>
              <span className="font-semibold text-[#001632]">{invoice.paymentMethod}</span>
            </div>
            {invoice.paymentNote !== '-' && (
              <div className="pt-1 border-t border-[#e2e8f0]">
                <span className="text-[#516070] block">Catatan Pengirim</span>
                <span className="font-semibold text-[#001632]">{invoice.paymentNote}</span>
              </div>
            )}
            {invoice.reviewedByEmail && (
              <div className="pt-1 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                <span className="text-[#516070]">Diverifikasi Oleh</span>
                <span className="font-semibold text-[#001632] truncate">
                  {invoice.reviewedByEmail}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-xl bg-white border border-[#e2e8f0] hover:bg-[#f0f3ff] text-[#142b4a] font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Tersalin' : 'Salin Invoice'}</span>
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPng}
            className="py-2.5 px-3 rounded-xl bg-[#142b4a] hover:bg-[#001632] text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>{downloading ? 'Menyiapkan...' : 'Unduh Struk PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
