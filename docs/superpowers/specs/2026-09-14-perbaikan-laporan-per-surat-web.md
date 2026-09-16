# Spesifikasi Perbaikan Laporan Per Surat dan Multi-Tujuan Web

**Tanggal:** 14 September 2026  
**Sumber:** Transkrip percakapan dengan ketua tim pada lampiran `08eb6188-1a2b-4998-90cf-39a726898343/pasted-text.txt`  
**Prioritas:** Web terlebih dahulu  
**Status:** Disepakati untuk dibuatkan implementation plan

## 1. Ringkasan Masalah

Sistem saat ini dapat memilih surat tugas atau laporan terakhir secara otomatis ketika pegawai membuka halaman progres. Akibatnya, pegawai tidak selalu dapat membuka kegiatan lama yang belum selesai, dan operasi seperti mengubah laporan harian, mengunggah tanda tangan, mengunggah nota, atau mengirim laporan akhir berisiko diterapkan ke surat tugas yang bukan dipilih pengguna.

Satu perjalanan juga perlu mendukung beberapa tujuan dalam satu surat tugas. Setiap tujuan memiliki tanggal sendiri, tetapi seluruh tujuan tetap menghasilkan satu laporan akhir. Setelah tujuan terakhir selesai, pegawai diberi sepuluh hari kalender untuk menyelesaikan atau memperbaiki laporan.

## 2. Keputusan Bisnis

1. Satu surat tugas dimiliki satu pegawai dan dapat memiliki satu atau lebih tujuan.
2. Setiap tujuan memiliki `urutan`, `daerah_id`, `tanggal_mulai`, dan `tanggal_selesai`.
3. Jadwal tujuan tidak boleh tumpang tindih dan, untuk versi web ini, tidak boleh memiliki hari kosong di antara tujuan.
4. Tujuan aktif ditentukan berdasarkan tanggal WITA (`Asia/Makassar`), bukan berdasarkan urutan insert atau tanggal tujuan paling akhir.
5. Presensi hanya dapat dilakukan pada tujuan yang aktif pada tanggal WITA saat itu.
6. Seluruh presensi harian dari semua tujuan digabungkan ke satu surat tugas.
7. Satu pegawai hanya mempunyai satu record laporan akhir untuk satu surat tugas.
8. Riwayat surat tugas tidak dihapus atau digantikan oleh surat tugas baru.
9. Pengguna harus memilih record berdasarkan `surat_tugas_id`; backend tidak boleh memilih record terbaru sebagai pengganti pilihan pengguna.
10. Batas penyelesaian laporan adalah sepuluh hari kalender setelah tanggal selesai tujuan terakhir.
11. Jika tujuan terakhir selesai 19 September 2026, laporan dapat diubah sampai 26 September 2026 pukul 23:59:59 WITA.
12. Laporan masih dapat diubah ketika belum ada laporan, berstatus `draft`, atau berstatus `dikirim`, selama belum melewati deadline.
13. Laporan berstatus `dikirim` dengan catatan keuangan tetap dapat diperbaiki dan dikirim ulang selama belum melewati deadline.
14. Laporan dikunci ketika berstatus `dicek_keuangan`, `disetujui_keuangan`, `ditandatangani`, `pencairan_dana`, atau `dana_turun`.
15. Backend adalah otoritas final untuk deadline dan izin edit; frontend hanya menampilkan hasil keputusan backend.
16. Implementasi mobile tidak dikerjakan pada fase ini. Endpoint lama dipertahankan sementara agar aplikasi mobile yang ada tidak langsung rusak.

## 3. Flow Pengguna Web

### 3.1 Membuka laporan dari dashboard

1. Pegawai login.
2. Dashboard memuat seluruh surat tugas milik pegawai.
3. Pegawai menekan `Lihat/Lanjutkan Laporan` pada satu surat tugas.
4. Browser membuka `/laporan/{surat_tugas_id}`.
5. Backend memvalidasi bahwa ID tersebut dimiliki pegawai yang login.
6. Backend mengembalikan surat, seluruh tujuan, presensi, laporan akhir, pembayaran, bukti nota, dan status jendela edit.
7. Semua aksi berikutnya tetap menggunakan ID yang sama.

### 3.2 Membuka riwayat

1. Pegawai membuka menu `Riwayat Laporan`.
2. Sistem menampilkan satu baris per surat tugas, termasuk surat yang belum memiliki laporan akhir.
3. Setiap baris memiliki tombol `Lihat Detail` atau `Lanjutkan`.
4. Tombol membuka `/laporan/{surat_tugas_id}`.
5. Surat baru tidak boleh menyembunyikan surat lama.

### 3.3 Menyelesaikan laporan

1. Pegawai mengisi laporan harian pada record presensi.
2. Pegawai dapat mengubah laporan harian hingga deadline selama laporan belum terkunci proses keuangan.
3. Pegawai mengunggah tanda tangan dan bukti nota pada konteks surat yang dipilih.
4. Pegawai mengirim satu laporan akhir untuk seluruh tujuan.
5. Pengiriman ulang memperbarui record laporan yang sama, bukan membuat record kedua.

## 4. Kontrak API Target

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/perjalanan/surat/:suratId` | Mengambil progres lengkap surat yang dipilih |
| `POST` | `/api/perjalanan/surat/:suratId/kirim` | Membuat atau memperbarui laporan akhir |
| `POST` | `/api/perjalanan/surat/:suratId/ttd-pegawai` | Mengunggah TTD untuk laporan surat terpilih |
| `GET` | `/api/perjalanan/surat/:suratId/ttd-pegawai` | Mengambil TTD surat terpilih |
| `POST` | `/api/perjalanan/surat/:suratId/bukti-pembayaran` | Mengunggah nota surat terpilih |
| `GET` | `/api/perjalanan/surat/:suratId/bukti-pembayaran` | Mengambil daftar nota surat terpilih |
| `DELETE` | `/api/perjalanan/surat/:suratId/bukti-pembayaran` | Mereset nota surat terpilih |
| `PUT` | `/api/presensi/:presensiId/laporan` | Mengubah laporan harian milik presensi tertentu |

Respons progres wajib memuat:

```json
{
  "surat_tugas": {},
  "tujuan": [],
  "presensi": [],
  "laporan_akhir": null,
  "pembayaran": null,
  "bukti_pembayaran": [],
  "report_window": {
    "timezone": "Asia/Makassar",
    "trip_end_date": "2026-09-19",
    "deadline_date": "2026-09-29",
    "editable": true,
    "remaining_days": 7,
    "lock_reason": null
  }
}
```

## 5. Aturan Keamanan dan Integritas

1. Semua endpoint memerlukan JWT yang valid.
2. Pegawai hanya dapat membaca dan mengubah surat, presensi, serta laporan miliknya sendiri.
3. ID milik pegawai lain menghasilkan `404` agar tidak membocorkan keberadaan record.
4. `surat_tugas_id` dari body tidak dipercaya jika berbeda dari parameter URL.
5. Satu record laporan dijamin oleh unique index `(surat_tugas_id, pegawai_id)`.
6. File upload ditulis ke manifest berdasarkan pasangan pengguna dan surat tugas.
7. Backend menolak edit setelah deadline atau setelah status memasuki proses keuangan.
8. Credential, `.env`, upload runtime, dan dump database tidak boleh masuk Git.

## 6. Backward Compatibility

Endpoint `/api/perjalanan`, `/api/perjalanan/kirim`, `/api/perjalanan/ttd-pegawai`, dan `/api/perjalanan/bukti-pembayaran` tetap tersedia selama fase web. Endpoint lama hanya boleh memilih surat yang benar-benar aktif pada tanggal WITA. Jika tidak ada tepat satu surat aktif, endpoint mengembalikan error eksplisit dan tidak boleh fallback ke surat terbaru.

## 7. Acceptance Criteria

1. Memilih Surat A selalu menampilkan dan mengubah data Surat A.
2. Memilih Surat B selalu menampilkan dan mengubah data Surat B.
3. Membuka surat lama tidak dialihkan ke surat terbaru.
4. Pengguna tidak dapat membuka surat milik pegawai lain.
5. TTD dan nota tersimpan pada surat yang sedang dibuka.
6. Riwayat tetap menampilkan surat tanpa laporan, draft, terkirim, dan selesai.
7. Satu surat dengan dua tujuan menampilkan kedua tujuan secara berurutan.
8. Tujuan aktif berubah sesuai tanggal WITA.
9. Satu surat multi-tujuan menghasilkan satu laporan akhir.
10. Pengiriman ulang tidak menambah record laporan kedua.
11. Laporan dapat diedit sampai deadline sepuluh hari.
12. Laporan ditolak setelah deadline.
13. Laporan ditolak setelah masuk status proses keuangan.
14. Endpoint lama tidak memilih surat terbaru ketika tidak ada surat aktif.
15. Seluruh unit test, integration test, lint, dan build web lulus.

## 8. Di Luar Scope Fase Ini

- Perubahan UI dan penyimpanan offline Flutter.
- Deployment langsung ke production sebelum QA lokal dan staging selesai.
- Pemulihan data production lama tanpa full database dump dari hosting.
- Perubahan alur persetujuan keuangan dan tanda tangan atasan selain aturan penguncian edit.
- Penghapusan endpoint legacy sebelum mobile dimigrasikan.
