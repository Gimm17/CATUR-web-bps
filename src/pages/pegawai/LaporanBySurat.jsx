import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PegawaiLayout from '../../layouts/PegawaiLayout';
import api from '../../api/axios';
import { getSuratTugasById } from '../../services/suratTugas.service';
import { toPublicFileUrl } from '../../utils/fileUrl';
import { 
  FaFileAlt, 
  FaMapMarkerAlt, 
  FaCalendarAlt,
  FaUserCheck,
  FaArrowLeft,
  FaDownload,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSpinner,
  FaInfoCircle,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaCloudDownloadAlt,
  FaPrint,
  FaShare,
  FaFilter,
  FaSearch,
  FaExclamationTriangle
} from 'react-icons/fa';
import '../../css/dashboard.css';

const LaporanBySurat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [surat, setSurat] = useState(null);
  const [laporan, setLaporan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLaporan, setSelectedLaporan] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [searchTerm, setSearchTerm] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load data surat
      const suratResponse = await getSuratTugasById(id);
      console.log('Surat response:', suratResponse);
      
      if (suratResponse && suratResponse.data) {
        setSurat(suratResponse.data);
      } else if (suratResponse && suratResponse.id) {
        setSurat(suratResponse);
      }

      // Load laporan terkait surat ini
      const laporanResponse = await api.get(`/laporan/surat/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log('Laporan response:', laporanResponse);

      const data = laporanResponse.data || laporanResponse;
      if (Array.isArray(data)) {
        setLaporan(data);
      } else if (data.data && Array.isArray(data.data)) {
        setLaporan(data.data);
      } else if (data.laporan && Array.isArray(data.laporan)) {
        setLaporan(data.laporan);
      } else {
        setLaporan([]);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLampiran = (filePath) => {
    if (!filePath) {
      alert('File lampiran tidak tersedia');
      return;
    }
    window.open(toPublicFileUrl(filePath), '_blank');
  };

  const handleViewDetail = (laporan) => {
    setSelectedLaporan(laporan);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedLaporan(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const deriveStatus = (item) => {
    if (!item) return 'pending';
    const status = item.status;
    const hasCatatan = Boolean(item.catatan_keuangan && String(item.catatan_keuangan).trim());
    if (status === 'dikirim' && hasCatatan) return 'ditolak';
    if (status) return status.toLowerCase();
    return 'pending';
  };

  const getStatusBadge = (item) => {
    const statusMap = {
      pending: { class: 'badge-warning', icon: <FaClock />, text: 'Pending' },
      draft: { class: 'badge-secondary', icon: <FaFileAlt />, text: 'Draft' },
      dikirim: { class: 'badge-info', icon: <FaFileAlt />, text: 'Dikirim' },
      ditolak: { class: 'badge-danger', icon: <FaTimesCircle />, text: 'Perlu Perbaikan' },
      dicek_keuangan: { class: 'badge-warning', icon: <FaClock />, text: 'Dicek Keuangan' },
      disetujui_keuangan: { class: 'badge-success', icon: <FaCheckCircle />, text: 'Disetujui Keuangan' },
      ditandatangani: { class: 'badge-success', icon: <FaCheckCircle />, text: 'Ditandatangani' },
      pencairan_dana: { class: 'badge-warning', icon: <FaClock />, text: 'Pencairan Dana' },
      dana_turun: { class: 'badge-success', icon: <FaCheckCircle />, text: 'Dana Turun' },
      selesai: { class: 'badge-success', icon: <FaCheckCircle />, text: 'Selesai' }
    };

    const statusKey = deriveStatus(item);
    const config = statusMap[statusKey] || statusMap.pending;

    return (
      <span className={`badge ${config.class}`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // Filter laporan
  const filteredLaporan = laporan.filter(item => {
    const matchesSearch = 
      (item.judul_laporan?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.jenis_laporan?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = filterStatus === 'semua' || 
      (deriveStatus(item) === filterStatus.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <PegawaiLayout>
        <div className="dashboard-container">
          <div className="text-center py-5">
            <FaSpinner className="spinner spinner-lg mb-3" />
            <h4>Memuat data laporan...</h4>
          </div>
        </div>
      </PegawaiLayout>
    );
  }

  return (
    <PegawaiLayout>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <button 
              className="btn btn-link back-button"
              onClick={() => navigate('/dashboard')}
            >
              <FaArrowLeft className="me-2" />
              Kembali ke Dashboard
            </button>
            <h1 className="dashboard-title">
              <FaFileAlt className="me-3" />
              Laporan Terkait Surat Tugas
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-4">
            <FaExclamationTriangle className="me-2" />
            {error}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {/* Informasi Surat Tugas */}
        {surat && (
          <div className="surat-info-card mb-4">
            <div className="surat-info-header">
              <h3>Informasi Surat Tugas</h3>
              <span className="badge bg-primary">{surat.nomor_surat || 'No. Surat'}</span>
            </div>
            <div className="surat-info-body">
              <div className="row">
                <div className="col-md-8">
                  <h4>{surat.nama_kegiatan || 'Kegiatan tidak tersedia'}</h4>
                  <p className="text-muted mb-2">
                    <FaMapMarkerAlt className="me-2" />
                    {surat.daerah_tujuan || 'Tujuan tidak tersedia'}
                  </p>
                  <p className="text-muted">
                    <FaCalendarAlt className="me-2" />
                    {formatDateShort(surat.tanggal_mulai)} - {formatDateShort(surat.tanggal_selesai)}
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="surat-stats">
                    <div className="stat-item">
                      <label>Total Laporan</label>
                      <span className="stat-value">{laporan.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter dan Search */}
        <div className="dashboard-card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-2 mb-md-0">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari laporan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-center">
                  <FaFilter className="me-2 text-muted" />
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="semua">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="dikirim">Dikirim</option>
                    <option value="ditolak">Perlu Perbaikan</option>
                    <option value="dicek_keuangan">Dicek Keuangan</option>
                    <option value="disetujui_keuangan">Disetujui Keuangan</option>
                    <option value="ditandatangani">Ditandatangani</option>
                    <option value="pencairan_dana">Pencairan Dana</option>
                    <option value="dana_turun">Dana Turun</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Laporan */}
        <div className="dashboard-card">
          <div className="card-header sensus-card-header">
            <h3>Daftar Laporan</h3>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/laporan/buat?surat_id=${id}`)}
            >
              <FaFileAlt className="me-2" />
              Buat Laporan Baru
            </button>
          </div>

          <div className="card-body">
            {filteredLaporan.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaFileAlt />
                </div>
                <h4>Belum Ada Laporan</h4>
                <p>Belum ada laporan yang dibuat untuk surat tugas ini.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/laporan/buat?surat_id=${id}`)}
                >
                  Buat Laporan Pertama
                </button>
              </div>
            ) : (
              <div className="laporan-list">
                {filteredLaporan.map((item, index) => (
                  <div key={item.id} className="laporan-item">
                    <div className="laporan-header">
                      <div className="laporan-title">
                        <h4>{item.judul_laporan || `Laporan ${index + 1}`}</h4>
                        <div className="laporan-meta">
                          <span className="laporan-date">
                            <FaCalendarAlt className="me-1" />
                            {formatDateShort(item.tanggal_laporan || item.created_at)}
                          </span>
                          <span className="laporan-type">
                            {item.jenis_laporan || 'Laporan Kegiatan'}
                          </span>
                        </div>
                      </div>
                      <div className="laporan-status">
                        {getStatusBadge(item)}
                      </div>
                    </div>

                    <div className="laporan-body">
                      <p className="laporan-desc">
                        {item.keterangan || item.deskripsi || 'Tidak ada keterangan'}
                      </p>
                      
                      {item.lampiran && (
                        <div className="lampiran-info">
                          <FaFilePdf className="text-danger me-2" />
                          <span>Lampiran: {item.lampiran}</span>
                          <button
                            className="btn btn-sm btn-link"
                            onClick={() => handleDownloadLampiran(item.lampiran)}
                          >
                            <FaCloudDownloadAlt className="me-1" />
                            Download
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="laporan-footer">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleViewDetail(item)}
                      >
                        <FaEye className="me-1" />
                        Lihat Detail
                      </button>
                      {item.status?.toLowerCase() === 'draft' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => navigate(`/laporan/edit/${item.id}`)}
                        >
                          <FaFileAlt className="me-1" />
                          Lanjutkan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Detail Laporan */}
        {showDetailModal && selectedLaporan && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaFileAlt className="me-2" />
                  Detail Laporan
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}>
                  <FaTimesCircle />
                </button>
              </div>
              <div className="modal-body">
                <div className="laporan-detail">
                  {/* Status */}
                  <div className="detail-status mb-4">
                    {getStatusBadge(selectedLaporan.status)}
                  </div>

                  {/* Informasi Umum */}
                  <div className="detail-section">
                    <h6>Informasi Laporan</h6>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Judul Laporan</label>
                        <p>{selectedLaporan.judul_laporan || '-'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Jenis Laporan</label>
                        <p>{selectedLaporan.jenis_laporan || '-'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Tanggal Laporan</label>
                        <p>{formatDate(selectedLaporan.tanggal_laporan || selectedLaporan.created_at)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Dibuat Oleh</label>
                        <p>{selectedLaporan.user?.nama || selectedLaporan.created_by || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="detail-section">
                    <h6>Keterangan</h6>
                    <p className="keterangan-text">
                      {selectedLaporan.keterangan || selectedLaporan.deskripsi || 'Tidak ada keterangan'}
                    </p>
                  </div>

                  {/* Lampiran */}
                  {selectedLaporan.lampiran && (
                    <div className="detail-section">
                      <h6>Lampiran</h6>
                      <div className="lampiran-box">
                        <FaFilePdf className="text-danger me-3" size={24} />
                        <div className="lampiran-info">
                          <p className="mb-1">{selectedLaporan.lampiran}</p>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleDownloadLampiran(selectedLaporan.lampiran)}
                          >
                            <FaCloudDownloadAlt className="me-2" />
                            Download Lampiran
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informasi Tambahan */}
                  <div className="detail-section">
                    <h6>Informasi Tambahan</h6>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Dibuat Pada</label>
                        <p>{formatDate(selectedLaporan.created_at)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Terakhir Diupdate</label>
                        <p>{formatDate(selectedLaporan.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Tutup
                </button>
                {selectedLaporan.status?.toLowerCase() === 'draft' && (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={() => {
                      handleCloseModal();
                      navigate(`/laporan/edit/${selectedLaporan.id}`);
                    }}
                  >
                    <FaFileAlt className="me-2" />
                    Lanjutkan Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS */}
      <style jsx>{`
        .back-button {
          color: #1A56DB;
          font-weight: 500;
          padding: 0;
          margin-bottom: 1rem;
          text-decoration: none;
        }
        
        .back-button:hover {
          color: #1E429F;
        }
        
        .surat-info-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        
        .surat-info-header {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .surat-info-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
        }
        
        .surat-info-body {
          padding: 1.5rem;
        }
        
        .surat-info-body h4 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }
        
        .surat-stats {
          background: #f7fafc;
          padding: 1rem;
          border-radius: 8px;
          display: inline-block;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-item label {
          font-size: 0.85rem;
          color: #718096;
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1A56DB;
        }
        
        .search-box {
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0aec0;
        }
        
        .search-box input {
          padding-left: 40px;
        }
        
        .laporan-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .laporan-item {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.25rem;
          transition: all 0.2s;
        }
        
        .laporan-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: #cbd5e0;
        }
        
        .laporan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        
        .laporan-title h4 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }
        
        .laporan-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: #718096;
        }
        
        .laporan-type {
          background: #edf2f7;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        
        .laporan-body {
          margin-bottom: 1rem;
        }
        
        .laporan-desc {
          color: #4a5568;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        .lampiran-info {
          display: flex;
          align-items: center;
          background: #f7fafc;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        
        .laporan-footer {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          border-top: 1px solid #edf2f7;
          padding-top: 1rem;
        }
        
        .detail-section {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        
        .detail-section h6 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .detail-item label {
          font-size: 0.85rem;
          color: #718096;
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .detail-item p {
          font-size: 1rem;
          color: #1a202c;
          font-weight: 500;
          margin: 0;
        }
        
        .keterangan-text {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          line-height: 1.6;
        }
        
        .lampiran-box {
          display: flex;
          align-items: center;
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        
        .detail-status {
          display: flex;
          justify-content: flex-end;
        }
        
        @media (max-width: 768px) {
          .laporan-header {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .laporan-meta {
            flex-wrap: wrap;
          }
          
          .laporan-footer {
            flex-direction: column;
          }
          
          .laporan-footer button {
            width: 100%;
          }
          
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PegawaiLayout>
  );
};

export default LaporanBySurat;
