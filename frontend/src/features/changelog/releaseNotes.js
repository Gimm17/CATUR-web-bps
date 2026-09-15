export const CHANGELOG_VERSION = '2026-09-15-task-029';
export const SHOW_CHANGELOG_AFTER_LOGIN_KEY = 'catur:show-changelog-after-login';
export const DISMISSED_CHANGELOG_VERSION_KEY = 'catur:changelog:dismissed-version';
export const DISMISSED_CHANGELOG_COOKIE = 'catur_changelog_dismissed';

export const RELEASE_NOTES = [
  {
    category: 'Surat tugas',
    title: 'Surat tugas multi-tujuan',
    summary: 'Satu surat tugas dapat memuat beberapa kota tujuan dengan periode masing-masing.',
    before: 'Sistem hanya mengandalkan satu lokasi pada header surat sehingga perjalanan berantai mudah terbaca sebagai tujuan terakhir.',
    logic: 'Setiap tujuan disimpan berurutan. Rentang tanggal tidak boleh tumpang tindih atau memiliki hari kosong, lalu tanggal surat mengikuti keseluruhan rangkaian tujuan.',
    impact: 'Admin cukup membuat satu surat untuk perjalanan berantai dan pegawai melihat seluruh kota dalam urutan yang benar.',
    tone: 'blue',
  },
  {
    category: 'Waktu & lokasi',
    title: 'Tujuan aktif mengikuti tanggal WITA',
    summary: 'Kota presensi dipilih dari jadwal tujuan yang berlaku pada hari berjalan.',
    before: 'Pemilihan record terakhir dapat mengarahkan pegawai ke surat atau kota yang salah.',
    logic: 'Backend mencari tujuan dengan tanggal mulai ≤ tanggal WITA hari ini ≤ tanggal selesai. Jika lebih dari satu surat aktif ditemukan, sistem melaporkan konflik dan tidak menebak salah satunya.',
    impact: 'Pergantian kota terjadi otomatis sesuai jadwal tanpa memilih lokasi secara manual.',
    tone: 'green',
  },
  {
    category: 'Presensi',
    title: 'Validasi lokasi dan foto presensi',
    summary: 'Posisi langsung dari perangkat diperiksa kembali sebelum presensi diterima.',
    before: 'Validasi di tampilan saja dapat berbeda dari hasil yang diterima server.',
    logic: 'Aplikasi meminta izin GPS dan mengirim koordinat bersama tujuan aktif. Backend memvalidasi polygon GeoJSON atau radius wilayah sebelum menyimpan foto presensi.',
    impact: 'Foto presensi tidak diterima ketika koordinat berada di luar wilayah tujuan yang sah.',
    tone: 'amber',
  },
  {
    category: 'Laporan',
    title: 'Laporan selesai tetap dapat dibuka dan diedit',
    summary: 'Berakhirnya perjalanan tidak langsung menutup akses ke halaman laporan.',
    before: 'Surat selesai dapat terlihat seperti tidak memiliki akses laporan atau langsung diarahkan ke PDF.',
    logic: 'Batas edit dihitung sampai tujuh hari kalender WITA setelah tanggal selesai tujuan terakhir. Status draft dan dikirim masih dapat diperbaiki; mulai status dicek_keuangan laporan dikunci.',
    impact: 'Pegawai memiliki waktu koreksi yang jelas, sementara dokumen yang sedang diproses keuangan tetap konsisten.',
    tone: 'violet',
  },
  {
    category: 'Dokumen',
    title: 'Editor dan unduhan PDF dipisahkan',
    summary: 'Membuka laporan tidak lagi memiliki arti yang sama dengan mengunduh hasil final.',
    before: 'Tombol Lihat Laporan membuka PDF ketika file tersedia sehingga halaman laporan tidak dapat dicapai dari detail surat.',
    logic: 'Buka Laporan selalu menuju /laporan/:suratId. File final tersedia melalui tombol Download Laporan PDF yang terpisah di bawah unduhan surat tugas.',
    impact: 'Pengguna dapat kembali ke detail laporan tanpa kehilangan akses ke dokumen PDF final.',
    tone: 'blue',
  },
  {
    category: 'Progres',
    title: 'Timeline persetujuan lebih lengkap',
    summary: 'Popup detail dan halaman laporan memakai alur proses yang konsisten.',
    before: 'Detail surat hanya memperlihatkan empat status sehingga proses yang sedang berjalan sulit diketahui.',
    logic: 'Sembilan tahap dihitung dari data presensi, tanda tangan, nota, status laporan, persetujuan, dan pembayaran. Setiap tahap ditandai selesai, berjalan, opsional, atau menunggu.',
    impact: 'Pegawai dapat mengetahui posisi laporan dan tindakan berikutnya tanpa menebak.',
    tone: 'green',
  },
  {
    category: 'Kompatibilitas',
    title: 'Kompatibilitas data lama',
    summary: 'Data surat dan laporan sebelum fitur multi-tujuan tetap dapat digunakan.',
    before: 'Struktur lama hanya menyimpan tujuan pada header surat dan belum memiliki relasi tujuan terpisah.',
    logic: 'Migration mengisi tabel tujuan dari data lama. Jika child tujuan belum tersedia, backend tetap memakai kolom lokasi dan tanggal pada header surat sebagai fallback legacy.',
    impact: 'Riwayat, presensi, dan laporan lama tidak perlu dibuat ulang setelah pembaruan.',
    tone: 'amber',
  },
  {
    category: 'Status surat',
    title: 'Konteks surat saat tidak ada tugas aktif',
    summary: 'Tidak adanya surat aktif dibedakan dari tidak adanya riwayat surat.',
    before: 'Respons 404 surat aktif membuat banner tugas berakhir dan halaman laporan kehilangan konteks.',
    logic: 'Frontend memakai riwayat hanya sebagai fallback tampilan: surat mendatang terdekat atau surat selesai terbaru. Fallback tidak pernah mengaktifkan tombol presensi pada surat yang sudah berakhir.',
    impact: 'Peringatan tugas berakhir dan laporan terakhir tetap dapat diakses tanpa membuka peluang presensi yang tidak sah.',
    tone: 'violet',
  },
];
