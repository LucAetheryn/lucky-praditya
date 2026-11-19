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
  main.js             # routing & boot (dimuat TERAKHIR)
assets/               # aset statis (kosong untuk saat ini)
```

## Aturan penting

- **Urutan `<script>` di `index.html` tidak boleh diubah.** Semua file adalah skrip klasik yang berbagi satu scope global.
- `main.js` harus terakhir: Live Preview mengambil salinan halaman (`SRC`) setelah semua tag skrip ada.
- Control Center: buka `index.html#admin`.
- Untuk dijalankan lokal, gunakan server statis (mis. `python3 -m http.server`) atau buka `index.html` langsung.

## Status

Tahap 1 — pemisahan file dari `Lucky_Praditya.html`. Belum ada Supabase, perubahan autentikasi, atau deployment.
