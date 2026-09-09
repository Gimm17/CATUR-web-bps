const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const presensiRoutes = require('./routes/presensi.routes');
const suratTugasRoutes = require('./routes/suratTugas.route');
const app = express();
const daerahRoutes = require("./routes/daerah.route")
const notifikasiRoutes = require('./routes/notifikasi.routes');
const getPegawai = require('./routes/user.routes');
const akun = require('./routes/akun.routes');
const laporanPerjalanan = require('./routes/laporan.route');
const laporanAtasan = require('./routes/laporanAtasan.route');
const keuangan = require('./routes/keuangan.routes')
const fileProxyRoutes = require('./routes/fileProxy.routes');
const driveImageRoutes = require('./routes/driveImage.routes');

app.use(cors());

app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/user', akun);
app.use('/api/getpegawai', getPegawai);
app.use('/api/auth', authRoutes);
app.use('/api/presensi', presensiRoutes);
app.use('/api', laporanPerjalanan);
app.use('/api', laporanAtasan);
app.use('/api', driveImageRoutes);
app.use('/api/keuangan', keuangan);
app.use('/api/files', fileProxyRoutes);
app.use('/api/surat-tugas', suratTugasRoutes);
app.use('/api/daerah', daerahRoutes);
app.use('/api/notifikasi', notifikasiRoutes);


module.exports = app;
