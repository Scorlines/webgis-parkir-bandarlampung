# WebGIS Parkir Bandar Lampung

Aplikasi WebGIS (Sistem Informasi Geografis berbasis Web) untuk pemetaan, pencarian, dan pengelolaan data lokasi parkir publik di wilayah Kota Bandar Lampung.

---

## 🎯 Tujuan Proyek
Proyek ini dibuat untuk mengatasi kendala pencarian tempat parkir serta mengelola data spasial lokasi parkir secara dinamis di Kota Bandar Lampung. Tujuan utamanya meliputi:
1. **Aksesibilitas Informasi Spasial**: Memudahkan masyarakat dalam memvisualisasikan dan mencari lokasi parkir terdekat dari titik koordinat mereka secara real-time.
2. **Detail Informasi & Transparansi**: Menyediakan detail penting dari setiap titik parkir seperti:
   * Jenis kendaraan yang didukung (mobil, motor, atau keduanya).
   * Tarif parkir per jam.
   * Kapasitas total dan kapasitas yang sedang tersedia.
   * Jam operasional (jam buka dan tutup).
   * Fasilitas pendukung (CCTV, Atap/Kanopi, Toilet, Penjaga).
3. **Pengelolaan Data Terpusat (Admin)**: Memberikan platform bagi pihak pengelola atau dinas terkait untuk memperbarui data parkir secara langsung melalui antarmuka admin yang dilindungi oleh autentikasi JWT.

---

## 🛠️ Tech Stack & Arsitektur
Aplikasi ini dibangun menggunakan arsitektur *decoupled* (pemisahan frontend dan backend) dengan komponen-komponen berikut:

### 1. Frontend (Client-side)
Terletak pada folder `[parkir-frontend](file:///c:/Kuliah/Semster 6/Tubes SIG/parkir-frontend)`:
* **React (v18.3.1)**: Library JavaScript utama untuk membangun antarmuka pengguna berbasis komponen yang reaktif dan interaktif.
* **Vite (v5.3.1)**: Tool build modern berkepatan tinggi untuk kemudahan development dan optimasi bundel produksi.
* **Leaflet (v1.9.4) & React Leaflet (v4.2.1)**: Library pemetaan interaktif yang digunakan untuk merender peta dasar, menampilkan marker lokasi parkir, pop-up informasi, serta menangani aksi pemilihan koordinat di peta.
* **Axios (v1.7.2)**: Library HTTP Client untuk melakukan komunikasi data (API request) ke backend FastAPI.
* **Vanilla CSS**: Digunakan untuk kustomisasi penuh pada desain antarmuka dashboard, panel pencarian, komponen filter, kartu informasi ([ParkirCard](file:///c:/Kuliah/Semster 6/Tubes SIG/parkir-frontend/src/components/ParkirCard.jsx)), sidebar admin, serta form manajemen parkir.

### 2. Backend (Server-side)
Terletak pada folder `[backend](file:///c:/Kuliah/Semster 6/Tubes SIG/backend)`:
* **FastAPI (v0.111.0)**: Framework backend Python modern dan berkinerja sangat tinggi yang digunakan untuk merancang RESTful API lengkap dengan dokumentasi otomatis Swagger.
* **SQLAlchemy (>=2.0.36)**: Object Relational Mapper (ORM) untuk menghubungkan kode Python dengan database PostgreSQL menggunakan model berorientasi objek.
* **GeoAlchemy2 (v0.15.1)**: Ekstensi SQLAlchemy untuk mendukung pengolahan tipe data spasial (Geometry/Geography) dan integrasi fungsi spasial PostgreSQL/PostGIS.
* **Shapely (>=2.0)**: Library Python untuk komputasi, manipulasi, dan analisis geometri spasial.
* **Uvicorn (v0.30.1)**: Web server ASGI untuk menjalankan aplikasi FastAPI.
* **Keamanan & Autentikasi**: Menggunakan **python-jose** untuk token JWT (JSON Web Tokens) dan **passlib[bcrypt]** untuk proses hashing password admin.

### 3. Database & Ekstensi Spasial
* **PostgreSQL**: DBMS Relasional untuk penyimpanan data terstruktur.
* **PostGIS Extension**: Ekstensi wajib PostgreSQL untuk mengaktifkan objek spasial, indeks spasial GiST (untuk mempercepat query koordinat), dan fungsi kalkulasi geografis (jarak, radius, GeoJSON).

---

## 📊 Dataset & Sumber Data
Data yang digunakan dalam aplikasi ini bersumber dari:
1. **OpenStreetMap (OSM) via Overpass Turbo**:
   * Data parkir diunduh dari OpenStreetMap dalam format GeoJSON (`[export.geojson(overpass-turbo).geojson](file:///c:/Kuliah/Semster 6/Tubes SIG/Dataset/export.geojson(overpass-turbo).geojson)`).
   * Data mentah berupa koordinat titik (*node*) maupun poligon area (*way*). Poligon area diproses dan dikonversi menjadi titik tengah (*centroid*) agar sesuai dengan format penyimpanan kolom geometri `POINT` di database.
   * Data mentah ini di-enrich (diperkaya) secara acak namun realistis dengan atribut tambahan seperti kapasitas, tarif, jam operasional, status, dan fasilitas untuk simulasi fungsionalitas penuh.
2. **Ina-Geoportal**:
   * Peta batas administrasi Kota Bandar Lampung disimpan pada folder `[KotaBandarLampung(ina-Geoportal)](file:///c:/Kuliah/Semster 6/Tubes SIG/Dataset/KotaBandarLampung(ina-Geoportal))` sebagai referensi spasial wilayah kerja.

---

## 💾 Fitur CRUD & API Spasial Database
Database dirancang dengan skema relasional yang efisien, terdiri dari tabel `parkir` untuk data spasial lokasi parkir, dan tabel `admin_users` untuk kredensial admin.

Sistem mengimplementasikan fungsionalitas CRUD secara menyeluruh dengan pembagian hak akses:

### A. Endpoint Publik (Akses Terbuka)
Masyarakat umum dapat mencari dan melihat data parkir tanpa perlu login:
1. **Daftar Parkir (JSON & GeoJSON)**:
   * `GET /api/parkir`: Menampilkan daftar seluruh tempat parkir. Mendukung query filter tipe kendaraan (`jenis`) dan tarif (`tarif`).
   * `GET /api/parkir/geojson`: Menampilkan seluruh data dalam format standar GeoJSON FeatureCollection untuk dirender langsung di peta Leaflet.
2. **Detail Parkir**:
   * `GET /api/parkir/{parkir_id}`: Mengambil data lengkap satu tempat parkir berdasarkan ID.
3. **Pencarian Spasial Terdekat (Nearby Search)**:
   * `GET /api/parkir/terdekat`: Menggunakan parameter `lat` (latitude), `lon` (longitude), dan `radius` (dalam meter).
   * Backend memproses query menggunakan fungsi spasial PostGIS:
     * `ST_DWithin`: Memfilter lokasi parkir yang berada di dalam radius pencarian dari posisi pengguna.
     * `ST_Distance`: Menghitung jarak geometris presisi dari titik pengguna ke lokasi parkir.
     * `ORDER BY distance ASC`: Mengurutkan hasil dari tempat parkir yang paling dekat ke paling jauh.
4. **Statistik Real-time**:
   * `GET /api/stats`: Mengembalikan jumlah total lokasi parkir, parkir yang tersedia, dan parkir yang sedang penuh.

### B. Endpoint Admin (Memerlukan JWT Token)
Digunakan oleh administrator untuk pengelolaan data (CRUD):
1. **Autentikasi**:
   * `POST /api/auth/login`: Memverifikasi username dan password admin, lalu mengembalikan token akses JWT jika berhasil.
   * `GET /api/auth/me`: Mengecek keaslian token JWT dan mengembalikan informasi profil admin saat ini.
2. **Create (Tambah Data)**:
   * `POST /api/parkir`: Menyimpan lokasi parkir baru. Koordinat input dari frontend diubah secara spasial menggunakan fungsi database `ST_GeomFromGeoJSON` ke dalam Spatial Reference System ID (SRID) 4326.
3. **Update (Perbarui Data)**:
   * `PUT /api/parkir/{parkir_id}`: Memperbarui data detail lokasi parkir, status ketersediaan slot, tarif, fasilitas, maupun mengubah titik koordinat di peta.
4. **Delete (Hapus Data)**:
   * `DELETE /api/parkir/{parkir_id}`: Menghapus data parkir dari database secara permanen.

---

## 📁 Struktur Folder Proyek
```text
Tubes SIG/
├── Dataset/                                 # Folder penyimpanan dataset mentah
│   ├── KotaBandarLampung(ina-Geoportal)/    # File batas wilayah spasial Bandar Lampung
│   └── export.geojson(overpass-turbo).geojson # Data mentah parkir dari OpenStreetMap
├── backend/                                 # Folder Backend (FastAPI + SQLAlchemy)
│   ├── sql/                                 # Skrip inisialisasi SQL
│   │   ├── 01_create_database.sql           # Pembuatan database PostgreSQL
│   │   ├── 02_setup_table.sql               # Pembuatan struktur tabel dan indeks spasial
│   │   └── 03_insert_data.sql               # Data seed awal hasil konversi GeoJSON
│   ├── auth_utils.py                        # Utilitas enkripsi password & token JWT
│   ├── crud.py                              # Query manipulasi data (SQLAlchemy & PostGIS)
│   ├── database.py                          # Inisialisasi koneksi & sesi database
│   ├── generate_sql.py                      # Skrip parser GeoJSON ke skrip SQL Insert
│   ├── main.py                              # Server API, konfigurasi CORS, dan Routing
│   ├── models.py                            # Representasi tabel database (ORM)
│   ├── schemas.py                           # Validasi struktur data API (Pydantic)
│   ├── seed_db.py                           # Seeder database langsung lewat Python
│   └── requirements.txt                     # Dependensi pustaka Python
├── parkir-frontend/                         # Folder Frontend (React + Vite + Leaflet)
│   ├── src/
│   │   ├── components/                      # Komponen antarmuka (Map, Sidebar, Login, dll)
│   │   ├── App.jsx                          # Komponen utama aplikasi
│   │   ├── api.js                           # Konfigurasi komunikasi Axios ke backend
│   │   └── index.css                        # Style CSS global
│   ├── package.json                         # Dependensi NPM & skrip jalankan aplikasi
│   └── vite.config.js                       # Konfigurasi build Vite
└── patch_sqlalchemy.py                      # Skrip utilitas penyesuaian dependensi
```

---

## 🚀 Panduan Instalasi dan Menjalankan Aplikasi

### 1. Inisialisasi Database (PostgreSQL + PostGIS)
1. Buka PostgreSQL (melalui pgAdmin 4 atau terminal psql).
2. Jalankan perintah pembuatan database:
   ```sql
   CREATE DATABASE parkir_bandar_lampung;
   ```
3. Sambungkan ke database baru tersebut, aktifkan ekstensi PostGIS dan buat tabel dengan mengeksekusi isi file `[02_setup_table.sql](file:///c:/Kuliah/Semster 6/Tubes SIG/backend/sql/02_setup_table.sql)`.
4. Impor data parkir awal dengan mengeksekusi isi file `[03_insert_data.sql](file:///c:/Kuliah/Semster 6/Tubes SIG/backend/sql/03_insert_data.sql)`.

### 2. Konfigurasi & Menjalankan Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat file `.env` dan sesuaikan URL koneksi database PostgreSQL Anda:
   ```env
   DATABASE_URL=postgresql://postgres:password_anda@localhost:5432/parkir_bandar_lampung
   SECRET_KEY=kunci_rahasia_jwt_anda
   CORS_ORIGINS=http://localhost:5173
   ```
3. Buat dan aktifkan Virtual Environment Python:
   ```bash
   python -m venv venv
   # Aktifkan di Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   ```
4. Install semua dependensi pustaka:
   ```bash
   pip install -r requirements.txt
   ```
5. Jalankan backend:
   ```bash
   python main.py
   # atau menggunakan uvicorn langsung
   uvicorn main:app --reload --port 8000
   ```
   *Catatan:* Saat pertama kali berjalan, sistem otomatis membuat akun admin default **username: `admin`** dan **password: `admin123`**.

### 3. Menjalankan Frontend
1. Buka terminal baru dan arahkan ke folder frontend:
   ```bash
   cd parkir-frontend
   ```
2. Instal seluruh paket npm:
   ```bash
   npm install
   ```
3. Jalankan server lokal:
   ```bash
   npm run dev
   ```
4. Buka tautan `http://localhost:5173` di browser Anda.
