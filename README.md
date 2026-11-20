# Lucky Praditya

Personal Connection Hub — situs identitas personal Lucky Praditya.

## Struktur

```
index.html            # kerangka HTML (meta, favicon/logo, urutan pemuatan skrip)
css/styles.css        # seluruh gaya situs publik + Control Center
js/
  state.js            # state runtime bersama
  icons.js            # data ikon teknologi & platform
  stack.js            # bagian Technology Stack
  connections.js      # platform, Highlights, impor/migrasi, form admin terkait
  star-chaser.js      # animasi pembuka Star Chaser
  config.js           # konten default, penyimpanan lokal, helper
  site.js             # render situs publik, overlay, event
  control-center.js   # Control Center + Live Preview
  supabase.js         # konfigurasi (URL + publishable key), client hanya di luar preview
  auth.js             # login, verifikasi admin, TOTP MFA, sesi
  storage.js          # upload gambar ke Supabase Storage
  database.js         # baca publik, baca admin, simpan via RPC
  migration.js        # backup, perbandingan sumber, keamanan, media (tab Backup)
  main.js             # route guard & boot (dimuat TERAKHIR)
supabase/             # SQL USULAN (belum dijalankan) dan uji RLS
docs/SUPABASE.md      # ringkasan arsitektur integrasi
tools/                # uji browser dengan Supabase tiruan (Playwright)
assets/               # aset statis (kosong untuk saat ini)
```

## Aturan penting

- **Urutan `<script>` di `index.html` tidak boleh diubah.** Semua file adalah skrip klasik yang berbagi satu scope global.
- `main.js` harus terakhir: Live Preview mengambil salinan halaman (`SRC`) setelah semua tag skrip ada.
- Control Center: buka `index.html#admin`.
- Untuk dijalankan lokal, gunakan server statis (mis. `python3 -m http.server`) atau buka `index.html` langsung.

## Status

Tahap 2 — integrasi Supabase (kode). Belum ada commit/deployment. Lihat `docs/SUPABASE.md`.


## Laporan implementasi

Lihat `IMPLEMENTATION-REPORT.md` untuk perubahan hardening Stage 2, pemeriksaan yang berhasil, dan batas pengujian yang belum dapat dilakukan. SQL di `supabase/migrations/` tetap proposal dan belum dijalankan.
