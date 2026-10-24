# Jelajah Budaya Sleman — struktur awal

Proyek ini adalah pemisahan dari prototipe HTML yang diberikan menjadi HTML, CSS, dan JavaScript terpisah. Konsep animasi Merapi → candi/panel → peta tetap dipertahankan.

## Struktur folder

```text
jelajah-budaya-sleman/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
└── assets/
    ├── langit.svg
    ├── GnMerapi.svg
    ├── candi.svg
    ├── logo.svg
    └── petaSleman.svg
```

## Penting: salin aset visual

File HTML awal merujuk ke lima aset SVG, tetapi file SVG tersebut tidak ikut terunggah bersama `index.html`. Salin aset aslimu ke folder `assets/` dengan nama persis berikut:

- `langit.svg`
- `GnMerapi.svg`
- `candi.svg`
- `logo.svg`
- `petaSleman.svg`

Nama file dan huruf besar-kecilnya harus cocok dengan yang dirujuk di HTML.

## Cara menjalankan

1. Buka folder proyek ini di Visual Studio Code.
2. Salin kelima SVG ke folder `assets/`.
3. Jalankan `index.html` dengan ekstensi Live Server agar pengembangan lebih nyaman.
4. Uji scroll dari atas ke bawah dan gerakkan pointer untuk menguji parallax.

## Tahap pengembangan berikutnya

1. Jadikan setiap kapanewon pada peta sebagai area SVG yang memiliki ID unik.
2. Ubah peta dari SVG yang dimuat dengan tag `<img>` menjadi inline SVG bila perlu mengakses dan menangani klik tiap wilayah dari JavaScript.
3. Rancang tabel Supabase untuk `kapanewon`, `sanggar`, dan `media_sanggar`.
4. Bangun autentikasi dan dashboard admin, lalu terapkan Row Level Security (RLS) pada tabel dan Storage.
5. Hubungkan halaman publik ke data Supabase setelah skema tabel dan kebijakan akses siap.

## Catatan Supabase

Belum ada koneksi database di versi ini karena URL proyek, kunci publik, skema tabel, dan kebijakan akses belum disiapkan. Jangan pernah menaruh `service_role` key atau secret key di JavaScript frontend.
