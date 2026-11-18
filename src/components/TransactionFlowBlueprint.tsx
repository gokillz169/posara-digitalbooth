import React, { useState } from 'react';

interface EntityRelationNode {
  step: string;
  leftEntity: string;
  rightEntity: string;
  tag: string;
  arrowLabel: string;
  detailText: string;
}

const ENTITY_NODES: EntityRelationNode[] = [
  {
    step: '01',
    leftEntity: 'Katalog Paket (1)',
    rightEntity: '(N) Booth Config',
    tag: 'KATALOG',
    arrowLabel: 'Admin Atur Paket & QRIS Resmi',
    detailText:
      'Owner menyiapkan daftar paket (Free, Weekend Rp 5.000, Creator Rp 10.000, Studio Rp 15.000) dan mengikat QRIS resmi POSARA DIGITAL BOOTH.'
  },
  {
    step: '02',
    leftEntity: 'Paket Dipilih (1)',
    rightEntity: '(N) Checkout QRIS',
    tag: 'PILIH PAKET',
    arrowLabel: 'Customer Checkout',
    detailText:
      'Pelanggan memilih tier serta siklus bayar; server langsung mengunci nominal resmi dan membentuk QRIS dinamis beserta nomor Order Invoice unik.'
  },
  {
    step: '03',
    leftEntity: 'Order Invoice',
    rightEntity: 'UpgradeRequest (Bukti)',
    tag: 'TRANSAKSI',
    arrowLabel: 'Bayar QRIS & Verifikasi Admin',
    detailText:
      'Pesanan beserta Nomor Invoice (#INV-...) dan catatan pengirim masuk ke database dengan aturan anti-spam jeda 60 detik per transaksi.'
  },
  {
    step: '04',
    leftEntity: 'Order Invoice (1)',
    rightEntity: '(1) Status Lunas',
    tag: 'STATUS',
    arrowLabel: '',
    detailText:
      'Setelah Owner mengecek mutasi QRIS masuk dan menekan Konfirmasi Lunas, status Order Invoice berubah menjadi Lunas dan kuota kredit aktif otomatis.'
  }
];

interface BusinessFlowStep {
  step: string;
  actor: 'Admin' | 'Customer';
  text: string;
}

const BUSINESS_STEPS: BusinessFlowStep[] = [
  {
    step: '01',
    actor: 'Admin',
    text: 'Menyiapkan daftar paket langganan, kuota kredit HD, & QRIS resmi POSARA.'
  },
  {
    step: '02',
    actor: 'Customer',
    text: 'Melihat perbandingan Free vs Berlangganan dan memilih paket yang dibutuhkan.'
  },
  {
    step: '03',
    actor: 'Customer',
    text: 'Masuk dengan akun Google terverifikasi agar paket & riwayat invoice tersimpan aman.'
  },
  {
    step: '04',
    actor: 'Customer',
    text: 'Menerima Order Invoice (#INV-...) & kode QRIS Dinamis dengan nominal terkunci.'
  },
  {
    step: '05',
    actor: 'Customer',
    text: 'Melakukan pembayaran QRIS lewat GoPay, DANA, ShopeePay, OVO, atau Mobile Banking.'
  },
  {
    step: '06',
    actor: 'Customer',
    text: 'Mengisi nama pengirim transfer lalu menekan tombol "Kirim Konfirmasi Pembayaran".'
  },
  {
    step: '07',
    actor: 'Admin',
    text: 'Memeriksa mutasi masuk sesuai nomor Invoice & menekan "Konfirmasi Lunas".'
  }
];

interface TransactionFlowBlueprintProps {
  compact?: boolean;
}

export const TransactionFlowBlueprint: React.FC<TransactionFlowBlueprintProps> = ({
  compact = false
}) => {
  const [selectedStep, setSelectedStep] = useState<string>('02');
  const activeNode = ENTITY_NODES.find((node) => node.step === selectedStep) || ENTITY_NODES[1];

  return (
    <section
      aria-label="Alur Entitas dan 7 Tahap Transaksi POSARA"
      className={`w-full mx-auto ${compact ? 'my-2' : 'my-3'}`}
    >
      <div className="mb-3 space-y-1">
        <span className="text-[11px] font-bold text-[#142b4a] tracking-wide">
          Relasi Entitas & Alur Transaksi
        </span>
        <h2 className="font-headline text-[19px] sm:text-[22px] font-black text-[#001632] leading-snug text-balance">
          Alur lengkap dari{' '}
          <span className="bg-[#d5e4f8] px-1.5 py-0.5 rounded-md">pilih paket</span> sampai{' '}
          <span className="bg-amber-100 px-1.5 py-0.5 rounded-md">
            konfirmasi pembayaran lunas
          </span>
          .
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
        {/* Left Card: Relasi Antar Entitas */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-xs flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-[#516070]">
                Relasi Antar Entitas
              </p>
              <h3 className="font-headline text-[16px] font-bold text-[#001632]">
                Alur Perpindahan Data
              </h3>
            </div>
            <span className="text-[10.5px] text-[#74777e] whitespace-nowrap">
              Klik blok untuk detail
            </span>
          </div>

          <div className="space-y-1.5">
            {ENTITY_NODES.map((node) => {
              const isSelected = node.step === selectedStep;
              return (
                <React.Fragment key={node.step}>
                  <button
                    type="button"
                    onClick={() => setSelectedStep(node.step)}
                    aria-pressed={isSelected}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#f0f7ff] border-[#142b4a] shadow-xs'
                        : 'bg-[#f8fafc] border-[#e2e8f0] hover:bg-[#f0f3ff]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 text-[12px] font-bold text-[#001632]">
                      <span className="font-mono text-[#516070] tabular-nums shrink-0">
                        {node.step} ·
                      </span>
                      <span className="truncate">{node.leftEntity}</span>
                      <span aria-hidden="true" className="text-[#74777e] shrink-0">
                        —
                      </span>
                      <span className="truncate font-semibold text-[#142b4a]">
                        {node.rightEntity}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold tracking-wide shrink-0 ${
                        isSelected ? 'text-[#142b4a]' : 'text-[#74777e]'
                      }`}
                    >
                      {node.tag}
                    </span>
                  </button>

                  {node.arrowLabel && (
                    <div className="text-center py-0.5 text-[10.5px] font-semibold text-[#516070]">
                      ↓ {node.arrowLabel}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-auto p-3 rounded-2xl bg-[#f0f7ff] border border-[#bfd7f5] text-[11.5px] text-[#001632] leading-relaxed">
            {activeNode.detailText}
          </div>
        </div>

        {/* Right Card: 7 Tahap Transaksi POSARA */}
        <div className="bg-[#f4f6fb] rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] flex flex-col justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold tracking-wider uppercase text-[#142b4a]">
              End-to-End Business Flow
            </p>
            <h3 className="font-headline text-[16px] font-bold text-[#001632]">
              7 Tahap Transaksi POSARA
            </h3>
          </div>

          <ol className="space-y-2 flex-1">
            {BUSINESS_STEPS.map((item) => {
              const isAdminStep = item.actor === 'Admin';
              return (
                <li
                  key={item.step}
                  className="bg-white rounded-2xl px-3 py-2.5 border border-[#e2e8f0] flex items-center gap-2.5 text-[12px]"
                >
                  <span className="font-mono text-[11px] font-bold text-[#74777e] tabular-nums shrink-0 w-5">
                    {item.step}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                      isAdminStep
                        ? 'bg-[#e6f4fa] text-[#0e4f6e]'
                        : 'bg-[#fef6df] text-[#6d4c00]'
                    }`}
                  >
                    {item.actor}
                  </span>
                  <span className="text-[#111c2c] font-medium leading-snug">{item.text}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
