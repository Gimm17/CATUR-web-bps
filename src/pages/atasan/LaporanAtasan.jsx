import { useEffect, useState } from 'react';
import { getLaporanAtasan, approveLaporanAtasan } from '../../services/laporanAtasan.service';
import AtasanLayout from '../../layouts/AtasanLayout';
import {
  FaFilePdf,
  FaFileWord,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaSpinner,
  FaSignature,
  FaPrint,
  FaEye,
  FaClock,
  FaMoneyBillWave
} from 'react-icons/fa';
import { toPublicFileUrl } from '../../utils/fileUrl';
import { confirmAction, showToast } from '../../utils/alerts';

const ProgresPegawai = () => {
  const [laporan, setLaporan] = useState([]);
  const [selectedTTD, setSelectedTTD] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [atasanInfo, setAtasanInfo] = useState({
    nama_atasan: 'DARYANTO',
    jabatan_atasan: 'Kepala BPS Sulawesi Tengah',
    nip_atasan: '196707041986031001'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getLaporanAtasan();
      console.log('Data laporan atasan:', data);
      setLaporan(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Gagal mengambil data laporan: ' + (err.message || 'Unknown error'));
    }
  };

  const approve = async (id) => {
    if (!selectedTTD) {
      alert('Upload tanda tangan terlebih dahulu');
      return;
    }

    // Validasi file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedTTD.type)) {
      alert('Format file tidak didukung. Gunakan PNG atau JPEG');
      return;
    }

    if (selectedTTD.size > 5 * 1024 * 1024) {
      alert('Ukuran file terlalu besar, maksimal 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('nama_atasan', atasanInfo.nama_atasan);
    formData.append('jabatan_atasan', atasanInfo.jabatan_atasan);
    formData.append('nip_atasan', atasanInfo.nip_atasan);
    formData.append('ttd', selectedTTD);

    const confirmed = await confirmAction(
      'Apakah Anda yakin ingin menyetujui dan menandatangani laporan ini?',
      { title: "Konfirmasi Persetujuan", confirmText: "Setujui", cancelText: "Batal", icon: "question" }
    );
    if (!confirmed) return;

    try {
      setProcessingId(id);
      await approveLaporanAtasan(id, formData);
      showToast('Laporan berhasil disetujui dan ditandatangani', { icon: 'success' });
      loadData();
      setSelectedTTD(null); // Reset TTD setelah berhasil
    } catch (err) {
      console.error('Error approving laporan:', err);
      showToast('Gagal menyetujui laporan: ' + (err.response?.data?.message || err.message), { icon: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  // Format status untuk ditampilkan
  const formatStatus = (status) => {
    const statusMap = {
      'dikirim': '📤 Dikirim Pegawai',
      'dicek_keuangan': '🔍 Dicek Keuangan',
      'disetujui_keuangan': '✅ Disetujui Keuangan',
      'ditandatangani': '✅ Ditandatangani',
      'pencairan_dana': '💰 Pencairan Dana',
      'dana_turun': '💰 Dana Turun'
    };
    return statusMap[status] || status;
  };

  // Dapatkan warna badge berdasarkan status
  const getStatusColor = (status) => {
    switch(status) {
      case 'disetujui_keuangan':
        return 'bg-success';
      case 'ditandatangani':
        return 'bg-primary';
      case 'dicek_keuangan':
        return 'bg-warning';
      case 'dana_turun':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  // Filter laporan berdasarkan status
  const laporanDisetujuiKeuangan = laporan.filter(l => l.status === 'disetujui_keuangan');
  const laporanDitandatangani = laporan.filter(l => l.status === 'ditandatangani');
  const semuaLaporan = laporan;

  const [activeTab, setActiveTab] = useState('disetujui_keuangan');

  return (
    <AtasanLayout>
      <div className="container-fluid py-4">
        {/* HEADER */}
        <div className="card border-0 shadow-lg mb-4" 
             style={{ 
               background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
               borderRadius: '15px'
             }}>
          <div className="card-body text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1">Persetujuan & Tanda Tangan Laporan</h4>
                <p className="mb-0 opacity-75">CATUR - Verifikasi dan Penandatanganan</p>
              </div>
              <div className="bg-white p-3 rounded-circle">
                <FaSignature size={32} style={{ color: '#667eea' }} />
              </div>
            </div>
          </div>
        </div>

        {/* FORM UPLOAD TANDA TANGAN */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-4" style={{ color: '#667eea' }}>
              <FaSignature className="me-2" />
              Informasi & Tanda Tangan Digital
            </h5>
            
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label fw-semibold">Nama Atasan *</label>
                <input
                  type="text"
                  className="form-control"
                  value={atasanInfo.nama_atasan}
                  onChange={(e) => setAtasanInfo({...atasanInfo, nama_atasan: e.target.value})}
                  placeholder="Masukkan nama atasan"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label fw-semibold">Jabatan *</label>
                <input
                  type="text"
                  className="form-control"
                  value={atasanInfo.jabatan_atasan}
                  onChange={(e) => setAtasanInfo({...atasanInfo, jabatan_atasan: e.target.value})}
                  placeholder="Masukkan jabatan"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label fw-semibold">NIP Atasan *</label>
                <input
                  type="text"
                  className="form-control"
                  value={atasanInfo.nip_atasan}
                  onChange={(e) => setAtasanInfo({...atasanInfo, nip_atasan: e.target.value})}
                  placeholder="Masukkan NIP atasan"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Upload Tanda Tangan Digital *</label>
              <div className="input-group">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="form-control"
                  onChange={(e) => setSelectedTTD(e.target.files[0])}
                />
              </div>
              <div className="form-text">
                Format: PNG atau JPEG, maksimal 5MB. Tanda tangan akan ditambahkan ke PDF laporan.
              </div>
              
              {selectedTTD && (
                <div className="mt-3">
                  <div className="alert alert-success d-flex align-items-center">
                    <FaCheckCircle className="me-2" />
                    <div>
                      <strong>File terpilih:</strong> {selectedTTD.name}
                      <br />
                      <small>Ukuran: {(selectedTTD.size / 1024).toFixed(2)} KB</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="mb-4">
          <div className="nav nav-tabs">
            <button
              className={`nav-link ${activeTab === 'disetujui_keuangan' ? 'active' : ''}`}
              onClick={() => setActiveTab('disetujui_keuangan')}
            >
              <FaCheckCircle className="me-2" />
              Menunggu TTD ({laporanDisetujuiKeuangan.length})
            </button>
            <button
              className={`nav-link ${activeTab === 'ditandatangani' ? 'active' : ''}`}
              onClick={() => setActiveTab('ditandatangani')}
            >
              <FaSignature className="me-2" />
              Sudah TTD ({laporanDitandatangani.length})
            </button>
            <button
              className={`nav-link ${activeTab === 'semua' ? 'active' : ''}`}
              onClick={() => setActiveTab('semua')}
            >
              <FaEye className="me-2" />
              Semua ({semuaLaporan.length})
            </button>
          </div>
        </div>

        {/* TABEL LAPORAN */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h5 className="fw-bold mb-4" style={{ color: '#667eea' }}>
              {activeTab === 'disetujui_keuangan' ? (
                <>📋 Laporan Siap Ditandatangani</>
              ) : activeTab === 'ditandatangani' ? (
                <>✅ Laporan Telah Ditandatangani</>
              ) : (
                <>📊 Semua Laporan Perjalanan</>
              )}
            </h5>

            {laporan.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <FaFilePdf size={48} className="text-muted opacity-50" />
                </div>
                <h6 className="text-muted">Belum ada laporan</h6>
                <p className="text-muted small">Tidak ada laporan yang perlu diproses</p>
                <button className="btn btn-sm btn-outline-primary" onClick={loadData}>
                  <FaSpinner className="me-2" />
                  Refresh Data
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th>No</th>
                      <th>Pegawai</th>
                      <th>Lokasi</th>
                      <th>Periode</th>
                      <th>Status</th>
                      <th>Nominal</th>
                      <th>Dokumen</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'disetujui_keuangan' 
                      ? laporanDisetujuiKeuangan 
                      : activeTab === 'ditandatangani' 
                      ? laporanDitandatangani 
                      : semuaLaporan
                    ).map((l, index) => (
                      <tr key={l.id}>
                        <td className="fw-semibold">{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="bg-light rounded-circle p-2 me-2">
                              <FaUser style={{ color: '#667eea' }} />
                            </div>
                            <div>
                              <div className="fw-semibold">{l.user?.nama || '-'}</div>
                              <small className="text-muted">{l.user?.nip || 'N/A'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaMapMarkerAlt className="me-2 text-muted" />
                            <span>{l.surat_tugas?.daerah_tujuan || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaCalendarAlt className="me-2 text-muted" />
                            <span>
                              {l.surat_tugas?.tanggal_mulai ? 
                                new Date(l.surat_tugas.tanggal_mulai).toLocaleDateString('id-ID') : '-'}
                              <br />
                              <small>
                                {l.surat_tugas?.tanggal_selesai ? 
                                  new Date(l.surat_tugas.tanggal_selesai).toLocaleDateString('id-ID') : '-'}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusColor(l.status)}`}>
                            {formatStatus(l.status)}
                          </span>
                          {l.tanggal_acc && (
                            <div className="text-muted small mt-1">
                              <FaClock className="me-1" size={10} />
                              {new Date(l.tanggal_acc).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </td>
                        <td>
                          {l.nominal_dana ? (
                            <div className="fw-bold" style={{ color: '#28a745' }}>
                              <FaMoneyBillWave className="me-1" />
                              Rp {l.nominal_dana.toLocaleString('id-ID')}
                            </div>
                          ) : (
                            <span className="text-muted">Belum ditetapkan</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group">
                            {l.file_pdf && (
                              <a
                                href={toPublicFileUrl(l.file_pdf, { legacyDir: "uploads/pdf" })}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-primary"
                                title="Lihat Laporan PDF"
                              >
                                <FaFilePdf className="me-1" />
                                PDF
                              </a>
                            )}
                            {l.file_word && (
                              <a
                                href={toPublicFileUrl(l.file_word, { legacyDir: "uploads/word" })}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-secondary"
                                title="Lihat Laporan Word"
                              >
                                <FaFileWord className="me-1" />
                                Word
                              </a>
                            )}
                            {l.file_pdf_signed && (
                              <a
                                href={toPublicFileUrl(l.file_pdf_signed, { legacyDir: "uploads/pdf" })}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-success"
                                title="Lihat Laporan TTD"
                              >
                                <FaSignature className="me-1" />
                                TTD
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          {l.status === 'disetujui_keuangan' ? (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-success btn-sm"
                                disabled={processingId === l.id || !selectedTTD}
                                onClick={() => approve(l.id)}
                                title="Setujui dan tanda tangani laporan"
                              >
                                {processingId === l.id ? (
                                  <>
                                    <FaSpinner className="spinner-border spinner-border-sm me-1" />
                                    Memproses...
                                  </>
                                ) : (
                                  <>
                                    <FaSignature className="me-1" />
                                    Setujui
                                  </>
                                )}
                              </button>
                              <button
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                  // Preview laporan
                                  window.open(toPublicFileUrl(l.file_pdf, { legacyDir: "uploads/pdf" }), '_blank');
                                }}
                              >
                                <FaEye className="me-1" />
                                Preview
                              </button>
                            </div>
                          ) : l.status === 'ditandatangani' ? (
                            <div className="d-flex flex-column">
                              <span className="badge bg-success mb-1">
                                <FaCheckCircle className="me-1" />
                                Sudah TTD
                              </span>
                              {l.tanggal_ttd && (
                                <small className="text-muted">
                                  {new Date(l.tanggal_ttd).toLocaleDateString('id-ID')}
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">
                              Menunggu proses sebelumnya
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* STATISTIK */}
            <div className="row mt-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <h3 className="fw-bold text-primary">{laporanDisetujuiKeuangan.length}</h3>
                    <p className="text-muted mb-0">Menunggu TTD</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <h3 className="fw-bold text-success">{laporanDitandatangani.length}</h3>
                    <p className="text-muted mb-0">Sudah TTD</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <h3 className="fw-bold text-warning">
                      {laporan.filter(l => l.status === 'dicek_keuangan').length}
                    </h3>
                    <p className="text-muted mb-0">Dicek Keuangan</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <h3 className="fw-bold text-info">
                      {laporan.filter(l => l.status === 'dana_turun').length}
                    </h3>
                    <p className="text-muted mb-0">Dana Turun</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSTRUKSI */}
        <div className="alert alert-info border-0 shadow-sm mt-4">
          <div className="d-flex">
            <FaCheckCircle className="me-3 mt-1" size={20} />
            <div>
              <h6 className="alert-heading fw-bold">Instruksi Penandatanganan:</h6>
              <ol className="mb-0">
                <li>Upload tanda tangan digital Anda di form atas</li>
                <li>Pastikan data atasan sudah benar</li>
                <li>Klik "Setujui" pada laporan yang ingin ditandatangani</li>
                <li>Tanda tangan akan otomatis ditambahkan ke PDF laporan</li>
                <li>Laporan yang sudah TTD akan diteruskan ke keuangan untuk pencairan dana</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AtasanLayout>
  );
};

export default ProgresPegawai;
