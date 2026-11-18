# POSARA Digital Booth

Platform photobooth digital berbasis web dengan koleksi template strip, filter efek instan, motif frame estetik, dukungan kamera perangkat & kamera virtual studio, galeri lokal privat, sistem langganan QRIS Dinamis berstandar EMVCo, Order Invoice per transaksi, serta Dashboard Owner terproteksi.

## Fitur Utama

- **Studio Photobooth Lengkap**: 22 format template strip, 17 filter warna (termasuk *Seoul Clean* & *Kodak Gold*), 14 palet warna kertas, 20 motif frame, stiker, teks/tanggal kustom, serta *Smart Retake* per frame.
- **Kamera Real & Virtual Studio**: Mendukung kamera depan/belakang (`getUserMedia`), *screen flash*, countdown 3/5/10 detik, serta *Mode Virtual* untuk pratinjau cepat.
- **Galeri Lokal Privat**: Hasil strip foto dan paket file ZIP diproses langsung di browser pengguna.
- **Pembayaran QRIS Dinamis & Order Invoice**: Generator QRIS Dinamis EMVCo/CRC-16 di backend Express (`/api/qris/generate` & `/api/qris/validate`) lengkap dengan kode referensi unik dan Order Invoice (`INV-...`) yang dapat disalin atau diunduh sebagai struk PNG.
- **Keamanan & Role Access**:
  - Firebase Authentication (Google OAuth) & Firestore Security Rules terverifikasi.
  - Halaman Admin/Owner (`/?admin=1` atau `/admin`) terisolasi khusus akun Owner untuk konfigurasi kiosk, QRIS, dan konfirmasi pembayaran (`Konfirmasi Lunas`).

## Daftar Paket

| Paket | Harga | Kuota | Fitur Unggulan |
| --- | --- | --- | --- |
| **Gratis / Free** | Rp 0 / bulan | 20 kredit / bulan | Hasil 72 DPI bersih tanpa watermark |
| **Weekend Pass** | Rp 5.000 (sekali bayar) | 50 kredit | Buka seluruh template, filter, motif, ZIP, & 300 DPI |
| **Creator Pass** | Rp 10.000 / bulan | 500 kredit | Buka seluruh fitur premium & 300 DPI |
| **Studio Pro / Unlimited** | Rp 15.000 / bulan | Unlimited | Cetak studio hingga 600 DPI & custom event branding |

*(Pembayaran tahunan untuk Creator Pass & Studio Pro tersedia dengan hemat 20%.)*

## Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, Lucide Icons, JSZip
- **Backend**: Node.js (v22+), Express, `qrcode`, `compression`
- **Database & Auth**: Firebase Authentication (Google) & Cloud Firestore

## Cara Menjalankan di Lokal

1. **Instal dependensi**
   ```bash
   npm install
   ```

2. **Siapkan environment variable**
   Salin `.env.example` menjadi `.env` jika perlu menyesuaikan variabel opsional:
   ```bash
   cp .env.example .env
   ```

3. **Jalankan mode pengembangan** (berjalan pada port `3000`)
   ```bash
   npm run dev
   ```

4. **Build & jalankan mode produksi**
   ```bash
   npm run build
   npm start
   ```

## Pengujian & Pemeriksaan Kualitas

```bash
# Type-check & lint
npm run lint
npx tsc --noEmit --noUnusedLocals
npx eslint firestore.rules

# Unit tests (QRIS TLV/CRC-16, subscription, invoice, rate-limit, admin access)
npx tsx --test src/utils/*.test.ts
```

## Catatan Deploy ke Domain Publik / Custom Domain

Setelah melakukan deploy dari GitHub (misalnya ke Cloud Run, Render, Railway, atau Vercel + Node runtime):
1. Pastikan seluruh domain produksi Anda terdaftar di **Firebase Console -> Authentication -> Settings -> Authorized domains** agar popup **Masuk Google** berjalan lancar.
2. Deploy file `firestore.rules` ke proyek Firebase Anda bila mengubah aturan keamanan.
