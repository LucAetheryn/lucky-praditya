# Laporan pekerjaan — Stage 2 hardening

## Dikerjakan langsung pada source

- SQL public projection diubah dari menyalin seluruh objek menjadi allowlist untuk root config, sections, stack categories, connections, highlights, dan now.
- Baris kanonis `site_config` dipaksa `is_public=false`. Kebijakan SELECT anon/authenticated dibatasi hanya ke `site_config_public`.
- RPC lama `save_site_config(jsonb)` diganti menjadi `save_site_config(jsonb, timestamptz)`. Pemeriksaan versi dilakukan setelah `SELECT ... FOR UPDATE`, dalam transaksi yang sama dengan update canonical row dan public projection.
- Validasi SQL mencakup tipe kontainer, tipe field, jumlah item, dan batas 1 MiB.
- Migrasi AAL2 dibuat idempotent dengan drop/create policy names yang sama.
- Frontend mengirim expected timestamp ke RPC, menghindari save bila versi server tidak diketahui, dan membersihkan upload baru jika save gagal.
- Cache publik lama diabaikan (`lp_pub_cache_v2`, TTL 24 jam). Proyeksi frontend juga menerapkan allowlist sebelum cache ditulis. Fallback produksi ke `site-config.json` mentah dihapus.
- Pemindaian media menggunakan pagination.
- CSP baseline ditambahkan; README/docs dan RLS checks diselaraskan dengan signature RPC baru.
- Mock test harness diperbarui agar RPC memeriksa expected timestamp dan mengembalikan versi baru.

## Pemeriksaan yang berhasil

- `node --check` untuk seluruh file JavaScript: lulus.
- `python3 -m py_compile tools/mock-supabase-tests.py`: lulus.
- Secret scan untuk service-role key, secret key, dan database connection string: tidak ditemukan. (String `password` yang ditemukan hanya parameter login normal.)
- Pemeriksaan statis SQL: allowlist, filter visibilitas, private canonical row, public SELECT policy, row lock, expected timestamp, AAL2 check, size cap, dan signature lama dihapus: semua ditemukan.

## Status penerapan dan verifikasi

- Migrasi `0001_private_config_public_view.sql` telah diterapkan pada Supabase production pada 2026-11-20.
- Migrasi `0002_require_aal2_for_writes.sql` telah diterapkan pada Supabase production pada 2026-11-20, setelah TOTP MFA admin diverifikasi.
- Frontend Stage 2 telah dipublikasikan ke branch `main` GitHub. Commit terkait perbaikan upload thumbnail: `adb6bb1`.
- Penyimpanan konten dan thumbnail telah dikonfirmasi berhasil melalui Control Center dengan status `Saved and verified`.
- Tampilan konten dan thumbnail pada halaman publik juga telah dikonfirmasi.

## Pemeriksaan yang belum selesai

- Browser test harness berisi 34 assertion belum dijalankan. Playwright dan Chromium tidak tersedia di lingkungan Termux ini; jangan menganggap pengujian lulus.
- Belum ada hasil pengujian otomatis terpisah menggunakan SQL parser atau rangkaian RLS checks setelah penerapan.
- SRI untuk SDK CDN belum ditambahkan karena hash yang akurat belum tersedia.

## Catatan keamanan dan pemeliharaan

- Jangan menjalankan ulang migrasi production hanya untuk memperbarui dokumentasi.
- RPC penyimpanan menggunakan signature `save_site_config(jsonb, timestamptz)`. Frontend harus tetap mengirim expected timestamp.
- `site_config` merupakan konfigurasi kanonis privat; `site_config_public` merupakan proyeksi yang diizinkan untuk publik.
- Penulisan konfigurasi dan media admin memerlukan sesi MFA AAL2.
- File backup berekstensi `.bak` bukan bagian dari publikasi dokumentasi.
