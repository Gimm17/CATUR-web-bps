
import { useEffect, useState } from 'react';
import { getPegawai } from '../../services/pegawaiService';
import { getDaerah } from '../../services/daerahService';
import {
  createSuratTugas,
  getAllSuratTugas,
  deleteSuratTugas,
  updateSuratTugas,
} from '../../services/suratTugas.service';
import AdminLayout from '../../layouts/AdminLayout';
import TujuanScheduleEditor from '../../features/surat-tugas/TujuanScheduleEditor';
import {
  createEmptyTujuan,
  getTujuanScheduleErrors,
  hasTujuanScheduleErrors,
  serializeTujuan,
} from '../../features/surat-tugas/tujuanSchedule';
import '../../css/surat.tugas.css';

const toEditorTujuan = (surat) => {
  const rows = Array.isArray(surat.tujuan) && surat.tujuan.length > 0
    ? [...surat.tujuan].sort((a, b) => a.urutan - b.urutan)
    : [{
        daerah_id: surat.daerah_id,
        tanggal_mulai: surat.tanggal_mulai,
        tanggal_selesai: surat.tanggal_selesai,
      }];

  return rows.map((row, index) => ({
    key: `edit-${surat.id}-${row.id || index}`,
    daerah_id: String(row.daerah_id || ''),
    tanggal_mulai: String(row.tanggal_mulai || '').slice(0, 10),
    tanggal_selesai: String(row.tanggal_selesai || '').slice(0, 10),
  }));
};

const getDisplayTujuan = (surat) => {
  if (Array.isArray(surat.tujuan) && surat.tujuan.length > 0) {
    return [...surat.tujuan].sort((a, b) => a.urutan - b.urutan);
  }
  return [{
    daerah: surat.daerah,
    daerah_tujuan: surat.daerah?.nama_daerah,
    tanggal_mulai: surat.tanggal_mulai,
    tanggal_selesai: surat.tanggal_selesai,
  }];
};

const SuratTugasCreate = () => {
  const [pegawai, setPegawai] = useState([]);
  const [daerah, setDaerah] = useState([]);
  const [suratTugas, setSuratTugas] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tujuanRows, setTujuanRows] = useState([createEmptyTujuan()]);
  const [showTujuanErrors, setShowTujuanErrors] = useState(false);

  // Tambah kolom baru dengan input biasa
  const [form, setForm] = useState({
    nomor_surat: '',
    user_id: '',
    nama_kegiatan: '', // Kolom baru
    pembebanan_biaya: '', // Kolom baru - INPUT BIASA
    tujuan_kegiatan: '', // Kolom baru - INPUT BIASA
  });

  const [file, setFile] = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [pegawaiData, daerahData, suratData] = await Promise.all([
        getPegawai(),
        getDaerah(),
        getAllSuratTugas()
      ]);
      setPegawai(pegawaiData);
      setDaerah(daerahData);
      setSuratTugas(suratData);
    } catch (error) {
      console.error(error);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuratTugas = async () => {
    const data = await getAllSuratTugas();
    setSuratTugas(data);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  /* ================= EDIT ================= */
  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({
      nomor_surat: s.nomor_surat,
      user_id: s.user_id,
      nama_kegiatan: s.nama_kegiatan || '',
      pembebanan_biaya: s.pembebanan_biaya || '',
      tujuan_kegiatan: s.tujuan_kegiatan || '',
    });
    setTujuanRows(toEditorTujuan(s));
    setShowTujuanErrors(false);
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId(null);
    setForm({
      nomor_surat: '',
      user_id: '',
      nama_kegiatan: '',
      pembebanan_biaya: '',
      tujuan_kegiatan: '',
    });
    setTujuanRows([createEmptyTujuan()]);
    setShowTujuanErrors(false);
    setFile(null);
    setError('');
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const tujuanErrors = getTujuanScheduleErrors(tujuanRows);
    setShowTujuanErrors(true);
    if (hasTujuanScheduleErrors(tujuanErrors)) {
      const firstMessage = Object.values(tujuanErrors)[0];
      setError(Object.values(firstMessage)[0]);
      return;
    }

    // Validasi nama kegiatan
    if (!form.nama_kegiatan || form.nama_kegiatan.trim().length < 5) {
      setError('Nama kegiatan harus diisi minimal 5 karakter');
      return;
    }

    // Validasi pembebanan biaya
    if (!form.pembebanan_biaya || form.pembebanan_biaya.trim().length < 3) {
      setError('Pembebanan biaya harus diisi minimal 3 karakter');
      return;
    }

    // Validasi tujuan kegiatan
    if (!form.tujuan_kegiatan || form.tujuan_kegiatan.trim().length < 3) {
      setError('Tujuan kegiatan harus diisi minimal 3 karakter');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editId) {
        await updateSuratTugas(editId, {
          ...form,
          tujuan: JSON.parse(serializeTujuan(tujuanRows)),
        });
        setSuccessMessage('Surat tugas berhasil diperbarui');
      } else {
        if (!file && !import.meta.env.DEV) {
          setError('File surat wajib diupload');
          return;
        }

        const formData = new FormData();
        Object.keys(form).forEach((k) => formData.append(k, form[k]));
        formData.append('tujuan', serializeTujuan(tujuanRows));
        if (file) formData.append('file_surat', file);

        await createSuratTugas(formData);
        setSuccessMessage('Surat tugas berhasil dibuat');
      }

      fetchSuratTugas();
      resetForm();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteSuratTugas(showDeleteConfirm);
      fetchSuratTugas();
      setShowDeleteConfirm(null);
      setSuccessMessage('Surat tugas berhasil dihapus');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Filter surat tugas
  const filteredSuratTugas = suratTugas.filter(s => {
    const destinationNames = getDisplayTujuan(s)
      .map((item) => item.daerah?.nama_daerah || item.daerah_tujuan || '')
      .join(' ')
      .toLowerCase();
    return s.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    destinationNames.includes(searchTerm.toLowerCase()) ||
    (s.nama_kegiatan && s.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.pembebanan_biaya && s.pembebanan_biaya.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.tujuan_kegiatan && s.tujuan_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Format tanggal Indonesia
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Hitung durasi tugas
  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} hari`;
  };

  const formatShortDate = (dateString) => new Date(`${String(dateString).slice(0, 10)}T00:00:00Z`)
    .toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const tujuanErrors = getTujuanScheduleErrors(tujuanRows);

  // Generate nomor surat otomatis
  const generateNomorSurat = () => {
    const count = suratTugas.length + 1;
    const paddedCount = count.toString().padStart(3, '0');
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    return `ST/${year}/${month}/${paddedCount}`;
  };

  return (
    <AdminLayout>
      <style jsx>{`
        /* Warna Tema Sensus Ekonomi 2026 */
        :root {
          --se-blue: #0056a6;
          --se-dark-blue: #003d75;
          --se-light-blue: #e6f0ff;
          --se-green: #00a86b;
          --se-yellow: #ffc107;
          --se-orange: #fd7e14;
          --se-white: #ffffff;
          --se-gray: #f8f9fa;
          --se-border: #dee2e6;
        }
        
        .se-container {
          background-color: #f5f7fa;
          min-height: calc(100vh - 60px);
          padding: 20px;
        }
        
        /* Header dengan tema SE2026 */
        .se-header {
          background: linear-gradient(135deg, var(--se-dark-blue) 0%, var(--se-blue) 100%);
          color: white;
          border-radius: 12px;
          padding: 25px 30px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
        }
        
        .se-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3Cpath d='M30,30 L70,70 M70,30 L30,70' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3C/svg%3E");
          opacity: 0.3;
        }
        
        .se-badge {
          display: inline-block;
          background: var(--se-orange);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-left: 10px;
        }
        
        /* Card Modern */
        .se-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 86, 166, 0.08);
          border: 1px solid var(--se-border);
          margin-bottom: 25px;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .se-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 86, 166, 0.12);
        }
        
        .se-card-header {
          background: linear-gradient(to right, var(--se-light-blue), #f0f7ff);
          border-bottom: 2px solid var(--se-blue);
          padding: 18px 25px;
          color: var(--se-dark-blue);
        }
        
        .se-card-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
        }
        
        .se-card-title i {
          margin-right: 10px;
          color: var(--se-blue);
        }
        
        .se-card-body {
          padding: 25px;
        }
        
        /* Form Styles */
        .se-form-group {
          margin-bottom: 20px;
        }
        
        .se-form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--se-dark-blue);
          font-size: 14px;
        }
        
        .se-form-label i {
          margin-right: 6px;
          color: var(--se-blue);
        }
        
        .se-form-control {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid var(--se-border);
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: white;
        }
        
        .se-form-control:focus {
          outline: none;
          border-color: var(--se-blue);
          box-shadow: 0 0 0 3px rgba(0, 86, 166, 0.1);
        }
        
        .se-form-control::placeholder {
          color: #adb5bd;
        }
        
        .se-textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        /* Form Info Box */
        .se-form-info {
          background: var(--se-light-blue);
          border-left: 4px solid var(--se-blue);
          padding: 10px 15px;
          margin: 10px 0;
          border-radius: 4px;
          font-size: 13px;
          color: var(--se-dark-blue);
        }
        
        .se-form-info i {
          margin-right: 5px;
        }
        
        /* Example List */
        .example-list {
          margin-top: 5px;
          padding-left: 20px;
        }
        
        .example-list li {
          font-size: 13px;
          color: #6c757d;
          margin-bottom: 3px;
        }
        
        .example-list li:before {
          content: "*";
          color: var(--se-blue);
          margin-right: 8px;
        }
        
        /* Table Badge Styles */
        .table-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          background: #e3f2fd;
          color: #1565c0;
          border: 1px solid #bbdefb;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .se-card-body {
            padding: 20px;
          }
          
          .se-header {
            padding: 20px;
          }
          
          .se-row {
            flex-direction: column;
          }
          
          .se-col-md-6 {
            flex: 0 0 100%;
            max-width: 100%;
          }
        }
      `}</style>

      <div className="se-container">
        {/* Header dengan tema SE2026 */}
        <div className="se-header">
          <div className="se-row">
            <div className="se-col-12">
              <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '10px' }}>
                <i className="bi bi-file-earmark-text-fill me-2"></i>
                SURAT TUGAS PEGAWAI BPS PROVINSI SULAWESI TENGAH
                <span className="se-badge">SE2026</span>
              </h1>
              <p style={{ opacity: '0.9', marginBottom: '20px' }}>
                Sistem Pengelolaan Surat Tugas Pegawai BPS Provinsi Sulawesi Tengah
              </p>
              
              <div className="se-row" style={{ marginTop: '25px' }}>
                <div className="se-col-md-6">
                  <div className="se-stats-card">
                    <div className="se-stats-number">{suratTugas.length}</div>
                    <div className="se-stats-label">Total Surat Tugas</div>
                  </div>
                </div>
                <div className="se-col-md-6">
                  <div className="se-stats-card">
                    <div className="se-stats-number">{pegawai.length}</div>
                    <div className="se-stats-label">Pegawai Terdaftar</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Surat Tugas */}
        <div className="se-card">
          <div className="se-card-header">
            <h2 className="se-card-title">
              <i className="bi bi-pencil-square"></i>
              {editId ? 'EDIT SURAT TUGAS' : 'BUAT SURAT TUGAS BARU'}
            </h2>
            <div style={{ fontSize: '13px', opacity: '0.8', marginTop: '5px' }}>
              {editId ? 'Perbarui data surat tugas yang telah dibuat' : 'Buat surat tugas baru untuk pegawai'}
            </div>
          </div>
          
          <div className="se-card-body">
            {/* Alert Messages */}
            {successMessage && (
              <div className="se-alert se-alert-success">
                <i className="bi bi-check-circle-fill"></i>
                {successMessage}
              </div>
            )}
            
            {error && (
              <div className="se-alert se-alert-error">
                <i className="bi bi-exclamation-triangle-fill"></i>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="se-row">
                {/* Nomor Surat */}
                <div className="se-col-12">
                  <div className="se-form-group">
                    <label className="se-form-label">
                      <i className="bi bi-hash"></i>
                      NOMOR SURAT
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        name="nomor_surat"
                        className="se-form-control"
                        placeholder="ST/SE2026/001"
                        value={form.nomor_surat || generateNomorSurat()}
                        onChange={handleChange}
                        required
                        style={{ flex: '1' }}
                      />
                      <button 
                        type="button" 
                        className="se-btn se-btn-outline"
                        onClick={() => setForm({...form, nomor_surat: generateNomorSurat()})}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Nama Kegiatan */}
                <div className="se-col-12">
                  <div className="se-form-group">
                    <label className="se-form-label">
                      <i className="bi bi-journal-text"></i>
                      NAMA KEGIATAN
                    </label>
                    <input
                      type="text"
                      name="nama_kegiatan"
                      className="se-form-control"
                      placeholder="Contoh: Kegiatan
Ground Check Pra-prelist SBR SE2026"
                      value={form.nama_kegiatan}
                      onChange={handleChange}
                      required
                    />
                    <div className="se-form-info">
                      <i className="bi bi-info-circle"></i> 
                      Masukkan nama kegiatan sesuai dengan Rencana Kerja dan Anggaran (RKA)
                    </div>
                  </div>
                </div>
                {/* Tujuan Kegiatan - INPUT BIASA */}
                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label className="se-form-label">
                      <i className="bi bi-bullseye"></i>
                      TUJUAN KEGIATAN
                    </label>
                    <input
                      type="text"
                      name="tujuan_kegiatan"
                      className="se-form-control"
                      placeholder="Contoh: Supervisi Ground Check SBR di Kabupaten Parigi Moutong "
                      value={form.tujuan_kegiatan}
                      onChange={handleChange}
                      required
                    />
                    <div className="se-form-info">
                      <i className="bi bi-lightbulb"></i> 
                      Contoh tujuan kegiatan:
                      <ul className="example-list">
                        <li>Supervisi Ground Check SBR di Kabupaten Sigi </li>
                        <li>Supervisi Ground Check SBR di Kabupaten Parigi Moutong</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Pembebanan Biaya - INPUT BIASA */}
                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label className="se-form-label">
                      <i className="bi bi-currency-dollar"></i>
                      PEMBEBANAN BIAYA
                    </label>
                    <input
                      type="text"
                      name="pembebanan_biaya"
                      className="se-form-control"
                      placeholder="Contoh: APBN, APBD, Dana Hibah, dll"
                      value={form.pembebanan_biaya}
                      onChange={handleChange}
                      required
                    />
                    <div className="se-form-info">
                      <i className="bi bi-lightbulb"></i> 
                      Contoh sumber pembiayaan:
                      <ul className="example-list">
                        <li>GG 2902 BMA 006 529 A 524111 1</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Pegawai */}
                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label className="se-form-label">
                      <i className="bi bi-person-badge"></i>
                      PEGAWAI BPS
                    </label>
                    <select
                      name="user_id"
                      className="se-form-control"
                      value={form.user_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Pilih Pegawai --</option>
                      {pegawai.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} - {p.nip || 'Tanpa NIP'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="se-col-12">
                  <TujuanScheduleEditor
                    value={tujuanRows}
                    daerah={daerah}
                    onChange={(nextRows) => {
                      setTujuanRows(nextRows);
                      if (error) setError('');
                    }}
                    errors={showTujuanErrors ? tujuanErrors : {}}
                  />
                </div>
                
                {/* File Upload (hanya untuk create) */}
                {!editId && (
                  <div className="se-col-12">
                    <div className="se-form-group">
                      <label className="se-form-label">
                        <i className="bi bi-paperclip"></i>
                        DOKUMEN SURAT (PDF)
                        {import.meta.env.DEV ? ' — OPSIONAL DI LOCAL' : ''}
                      </label>
                      <div 
                        className="se-file-upload" 
                        onClick={() => document.getElementById('fileInput').click()}
                      >
                        <i className="bi bi-cloud-arrow-up "  style={{ fontSize: '50px' }} ></i>
                        <div style={{ marginBottom: '10px', fontWeight: '600', color: 'var(--se-dark-blue)' }}>
                          KLIK UNTUK MENGUPLOAD FILE
                        </div>
                        <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '5px' }}>
                          Format file: PDF (maks. 5MB)
                        </div>
                        <input
                          id="fileInput"
                          type="file"
                          accept="application/pdf"
                          className="d-none"
                          onChange={(e) => setFile(e.target.files[0])}
                          required={!import.meta.env.DEV}
                        />
                        {file && (
                          <div style={{ marginTop: '15px' }}>
                            <span className="se-badge-status se-badge-berjalan">
                              <i className="bi bi-check-circle me-1"></i>
                              {file.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginTop: '30px', 
                paddingTop: '20px', 
                borderTop: '1px solid var(--se-border)',
                flexWrap: 'wrap' 
              }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="se-btn se-btn-primary"
                  style={{ minWidth: '150px' }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="bi bi-hourglass-split"></i>
                      MENYIMPAN...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save"></i>
                      {editId ? 'UPDATE SURAT' : 'SIMPAN SURAT'}
                    </>
                  )}
                </button>
                
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="se-btn se-btn-outline"
                  >
                    <i className="bi bi-x-circle"></i>
                    BATAL
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      nama_kegiatan: 'Kegiatan Ground Check Pra-prelist SBR SE2026',
                      tujuan_kegiatan: 'Melakukan supervisi dan ground check Sensus Ekonomi 2026 di wilayah Kabupaten Parigi Moutong',
                      pembebanan_biaya: 'GG 2902 BMA 006 529 A 524111 1',
                      nomor_surat: generateNomorSurat()
                    });
                    const today = new Date().toISOString().split('T')[0];
                    const finish = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                      .toISOString().split('T')[0];
                    setTujuanRows([{
                      ...createEmptyTujuan(),
                      daerah_id: tujuanRows[0]?.daerah_id || '',
                      tanggal_mulai: today,
                      tanggal_selesai: finish,
                    }]);
                    setShowTujuanErrors(false);
                  }}
                  className="se-btn se-btn-outline"
                  title="Isi contoh data"
                >
                  <i className="bi bi-magic"></i>
                  CONTOH DATA
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Daftar Surat Tugas */}
        <div className="se-card">
          <div className="se-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="se-card-title">
                <i className="bi bi-list-check"></i>
                DAFTAR SURAT TUGAS
              </h2>
              <div style={{ fontSize: '13px', opacity: '0.8', marginTop: '5px' }}>
                Total: {filteredSuratTugas.length} dari {suratTugas.length} surat tugas
              </div>
            </div>
            
            <div className="se-search-box">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Cari surat tugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="se-card-body" style={{ padding: '0' }}>
            {loading ? (
              <div className="se-loading">
                <div className="se-spinner"></div>
                <div>Memuat data surat tugas...</div>
              </div>
            ) : filteredSuratTugas.length === 0 ? (
              <div className="se-empty-state">
                <i className="bi bi-file-earmark-excel"></i>
                <h4 style={{ marginBottom: '10px', color: 'var(--se-dark-blue)' }}>
                  {searchTerm ? 'DATA TIDAK DITEMUKAN' : 'BELUM ADA SURAT TUGAS'}
                </h4>
                <p style={{ fontSize: '14px' }}>
                  {searchTerm ? 'Coba dengan kata kunci lain' : 'Buat surat tugas baru untuk memulai'}
                </p>
              </div>
            ) : (
              <div className="se-table-container">
                <div style={{ overflowX: 'auto' }}>
                  <table className="se-table">
                    <thead>
                      <tr>
                        <th>NO. SURAT</th>
                        <th>KEGIATAN</th>
                        <th>PEGAWAI</th>
                        <th>TUJUAN</th>
                        <th>BIAYA</th>
                        <th>WILAYAH</th>
                        <th>PERIODE</th>
                        <th style={{ textAlign: 'center' }}>AKSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuratTugas.map((s) => {
                        const displayTujuan = getDisplayTujuan(s);
                        return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: '600', color: 'var(--se-dark-blue)' }}>
                              {s.nomor_surat}
                            </td>
                            <td style={{ maxWidth: '150px' }}>
                              <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                                {s.nama_kegiatan || '-'}
                              </div>
                              {s.nama_kegiatan && s.nama_kegiatan.length > 40 ? (
                                <small style={{ color: '#6c757d' }}>
                                  {s.nama_kegiatan.substring(0, 40)}...
                                </small>
                              ) : null}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  background: 'linear-gradient(135deg, var(--se-blue), var(--se-green))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {s.user?.nama?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '500' }}>{s.user?.nama}</div>
                                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                    {s.user?.nip || 'Tanpa NIP'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {s.tujuan_kegiatan ? (
                                <span className="table-badge">
                                  {s.tujuan_kegiatan}
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              {s.pembebanan_biaya ? (
                                <span className="table-badge">
                                  {s.pembebanan_biaya}
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <i className="bi bi-geo-alt" style={{ color: 'var(--se-blue)' }}></i>
                                <div>
                                  {displayTujuan.map((item, index) => (
                                    <div key={item.id || `${s.id}-${index}`}>
                                      {index > 0 && (
                                        <span aria-hidden="true" style={{ color: '#6c757d', marginRight: '6px' }}>
                                          →
                                        </span>
                                      )}
                                      <span>{item.daerah?.nama_daerah || item.daerah_tujuan || '-'}</span>
                                      <small style={{ color: '#6c757d', marginLeft: '6px' }}>
                                        ({formatShortDate(item.tanggal_mulai)}–{formatShortDate(item.tanggal_selesai)})
                                      </small>
                                    </div>
                                  ))}
                                  {displayTujuan.length > 1 && (
                                    <span className="se-badge-status se-badge-berjalan" style={{ marginTop: '6px' }}>
                                      {displayTujuan.length} tujuan
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px' }}>
                                <div style={{ fontWeight: '500' }}>{formatDate(s.tanggal_mulai)}</div>
                                <div style={{ fontSize: '11px', color: '#6c757d' }}>sampai</div>
                                <div style={{ fontWeight: '500' }}>{formatDate(s.tanggal_selesai)}</div>
                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px' }}>
                                  {calculateDuration(s.tanggal_mulai, s.tanggal_selesai)}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleEdit(s)}
                                  className="se-btn se-btn-outline"
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                  title="Edit Surat Tugas"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  className="se-btn se-btn-danger"
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                  title="Hapus Surat Tugas"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="se-modal-overlay">
          <div className="se-modal">
            <div className="se-modal-header">
              <h3 style={{ margin: '0', fontSize: '18px' }}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                KONFIRMASI PENGHAPUSAN
              </h3>
            </div>
            
            <div className="se-modal-body">
              <div style={{ marginBottom: '15px' }}>
                <i className="bi bi-trash-fill" style={{ fontSize: '48px', color: '#dc3545', marginBottom: '15px' }}></i>
                <h4 style={{ marginBottom: '10px', color: 'var(--se-dark-blue)' }}>
                  Hapus Surat Tugas?
                </h4>
                <p style={{ color: '#6c757d', lineHeight: '1.5' }}>
                  Surat tugas yang dihapus tidak dapat dikembalikan. 
                  Pastikan Anda telah mencetak atau menyimpan salinan dokumen ini.
                </p>
              </div>
            </div>
            
            <div className="se-modal-footer">
              <button
                onClick={cancelDelete}
                className="se-btn se-btn-outline"
              >
                <i className="bi bi-x-circle me-1"></i>
                BATAL
              </button>
              <button
                onClick={confirmDelete}
                className="se-btn se-btn-danger"
              >
                <i className="bi bi-trash me-1"></i>
                HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SuratTugasCreate;
