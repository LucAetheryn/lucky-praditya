# Integrasi Supabase — Lucky Praditya

## 1. Arsitektur

- Konfigurasi kanonis disimpan di `public.site_settings` dengan key `site_config` (JSONB).
- Tabel relasional `profile`, `connections`, `highlights`, dan `now` tidak dijadikan sumber konfigurasi baru.
- Frontend menggunakan Supabase URL dan publishable key. Service-role key dan secret key tidak boleh dimasukkan ke source frontend.
- Autentikasi admin menggunakan email/password, verifikasi pengguna melalui `getUser()`, pemeriksaan `is_admin()`, dan TOTP MFA.
- Penulisan konfigurasi dan media admin memerlukan sesi dengan assurance level AAL2.
- Storage bucket `site-media` digunakan untuk thumbnail dan media.
- Upload media dilakukan saat penyimpanan. Pembersihan objek yang tidak lagi digunakan bukan proses otomatis.
- Live Preview tidak membuat Supabase client dan tidak memuat SDK di dalam iframe.
- Mode lokal tersedia melalui `file:` atau `localhost` dengan parameter `?local`.

## 2. Kontrak database production

Migrasi berikut telah diterapkan pada Supabase production pada 2026-11-20:

- `supabase/migrations/0001_private_config_public_view.sql`
- `supabase/migrations/0002_require_aal2_for_writes.sql`

### Konfigurasi publik dan privat

- `site_config` merupakan konfigurasi kanonis lengkap dan harus tetap `is_public=false`.
- `site_config_public` berisi proyeksi konfigurasi yang diizinkan melalui allowlist di sisi database.
- Key yang tidak termasuk allowlist tidak disalin ke proyeksi publik.
- Kebijakan SELECT publik hanya mengizinkan baris `site_config_public` yang `is_public=true`.
- Fungsi `get_public_site_config()` membaca proyeksi publik, bukan konfigurasi kanonis privat.

### RPC penyimpanan

RPC penyimpanan menggunakan signature:

`save_site_config(p_config jsonb, p_expected_updated_at timestamptz)`

RPC melakukan pemeriksaan admin dan AAL2, validasi struktur dan ukuran JSON, penguncian baris kanonis dengan `FOR UPDATE`, serta pemeriksaan timestamp yang diharapkan sebelum memperbarui konfigurasi kanonis dan proyeksi publik.

Frontend harus mengirim expected timestamp yang diperoleh dari versi konfigurasi server. Jika versi server berubah, penyimpanan versi lama harus ditolak agar perubahan tidak saling menimpa tanpa terdeteksi.

Jangan mengembalikan signature RPC lama satu parameter tanpa meninjau ulang frontend dan kebijakan keamanan.

## 3. Frontend dan cache

- Cache publik menggunakan key `lp_pub_cache_v2` dengan masa berlaku 24 jam.
- Cache versi lama tidak digunakan.
- Proyeksi konfigurasi frontend menerapkan allowlist sebelum cache ditulis.
- Production tidak menggunakan `site-config.json` mentah sebagai fallback konfigurasi.
- Pemindaian media menggunakan pagination.
- Upload thumbnail mengubah data URI menjadi Blob tanpa menggunakan `fetch(dataURI)`.

## 4. Status keamanan

- TOTP MFA admin telah didaftarkan dan diverifikasi.
- Sesi Control Center telah dikonfirmasi menggunakan AAL2.
- Kebijakan AAL2 membatasi operasi tulis pada tabel terkait dan media di bucket `site-media`.
- Security Advisor terakhir menunjukkan dua peringatan:
  1. `public.is_admin()` menggunakan SECURITY DEFINER dan dapat dipanggil oleh role authenticated. Fungsi ini digunakan oleh kebijakan RLS; jangan mencabut EXECUTE atau mengubah mode ke invoker tanpa merancang ulang kebijakan terkait.
  2. Leaked Password Protection belum aktif. Fitur ini memerlukan paket Supabase Pro pada konfigurasi proyek saat ini.
- Tidak ada Error yang dilaporkan pada pemeriksaan Security Advisor terakhir.
- CSP dasar telah ditambahkan ke `index.html`. Kebijakan masih mengizinkan inline style dan frame same-origin sesuai kebutuhan aplikasi.
- SRI untuk SDK CDN belum ditambahkan karena hash SHA-384 yang valid belum tersedia. Jangan menebak hash.
- Custom domain dapat dipertimbangkan untuk isolasi origin GitHub Pages dan sesi admin.

## 5. Status pengujian

Sudah dikonfirmasi secara manual:

- Penyimpanan konten melalui Control Center berhasil dan menampilkan `Saved and verified`.
- Thumbnail berhasil disimpan.
- Konten dan thumbnail tampil pada halaman publik setelah pemuatan ulang.
- Tab dan fungsi Control Center telah diperiksa secara manual.

Belum selesai atau belum diverifikasi secara otomatis:

- Browser test harness dengan 34 assertion belum dijalankan. Jangan menganggap pengujian tersebut lulus.
- RLS checks pada `supabase/tests/rls_checks.sql` belum memiliki hasil eksekusi otomatis yang terdokumentasi setelah migrasi.
- Pengujian SQL parser/PostgreSQL terpisah belum dilakukan dari lingkungan kerja ini.
- SRI SDK CDN belum diterapkan.

## 6. Pemeliharaan

- Jangan menjalankan ulang migrasi production hanya untuk memperbarui dokumentasi.
- Perubahan skema atau kebijakan RLS harus ditinjau terhadap kondisi database live terlebih dahulu.
- Jangan memasukkan service-role key, secret key, password, token, atau database connection string ke repository.
- File backup berekstensi `.bak` merupakan arsip lokal dan tidak termasuk publikasi.
- Sebelum publikasi file, tinjau staged diff dan pastikan hanya file yang memang dimaksudkan yang masuk commit.
