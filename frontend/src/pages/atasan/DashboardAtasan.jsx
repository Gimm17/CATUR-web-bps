import { useEffect, useState } from "react";
import { getProgresPegawai } from '../../services/laporanAtasan.service';
import { getPegawaiCount } from "../../services/pegawaiService";
import AtasanLayout from "../../layouts/AtasanLayout";
import '../../css/dashboardatasan.css';
import { toPublicFileUrl } from "../../utils/fileUrl";

const DashboardAtasan = () => {
  const [progressData, setProgressData] = useState([]);
  const [pegawaiCount, setPegawaiCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("semua");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [pegawaiRes, progressRes] = await Promise.all([
        getPegawaiCount(),
        getProgresPegawai()
      ]);
      
      setPegawaiCount(pegawaiRes.count || 0);
      setProgressData(progressRes || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = progressData.length;
    const signed = progressData.filter(item => item.file_pdf_signed).length;
    const approved = progressData.filter(item => item.status === "disetujui").length;
    const pending = progressData.filter(item => item.status !== "disetujui").length;
    
    return {
      total,
      signed,
      approved,
      pending,
      signedPercentage: total > 0 ? Math.round((signed / total) * 100) : 0,
      approvedPercentage: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  };

  const getFilteredData = () => {
    switch(activeTab) {
      case "ditandatangani":
        return progressData.filter(item => item.file_pdf_signed);
      case "disetujui":
        return progressData.filter(item => item.status === "disetujui");
      case "pending":
        return progressData.filter(item => item.status !== "disetujui");
      default:
        return progressData;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'disetujui': { class: 'status-approved', icon: 'bi-check-circle', label: 'Disetujui' },
      'pending': { class: 'status-pending', icon: 'bi-clock', label: 'Menunggu' },
      'ditolak': { class: 'status-rejected', icon: 'bi-x-circle', label: 'Ditolak' },
      'draft': { class: 'status-draft', icon: 'bi-pencil', label: 'Draft' }
    };
    
    const statusInfo = statusMap[status] || { class: 'status-pending', icon: 'bi-clock', label: status || 'Pending' };
    
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        <i className={`bi ${statusInfo.icon} me-1`}></i>
        {statusInfo.label}
      </span>
    );
  };

  const stats = calculateStats();
  const filteredData = getFilteredData();

  return (
    <AtasanLayout>
      <div className="dashboard-atasan">
        {/* HEADER DASHBOARD */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="dashboard-title">
               <span className="title-main" style={{ color: 'white' }}>Dashboard Monitoring</span>
                <span className="title-sub"style={{ color: 'white' }}>Sistem Pemantauan laporan Perjalanan Dinas Pegawai</span>
              </h1>
              <div className="sensus-badge">
                <span className="sensus-text">BPS PROVINSI SULAWESI TENGAH</span>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="btn-refresh" 
                onClick={fetchDashboardData}
                disabled={loading}
              >
                <i className={`bi ${loading ? 'bi-arrow-clockwise spin' : 'bi-arrow-clockwise'}`}></i>
                {loading ? 'Memuat...' : 'Refresh Data'}
              </button>
              <div className="last-update">
                <i className="bi bi-calendar3 me-2"></i>
                Update: {new Date().toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* STATISTIK UTAMA */}
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">
              <i className="bi bi-person-badge"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{pegawaiCount}</div>
              <div className="stat-label">Total Pegawai</div>
              <div className="stat-trend">
                <i className="bi bi-arrow-up-right text-success"></i>
                <span className="text-success">+{Math.floor(pegawaiCount * 0.12)} bulan ini</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">
              <i className="bi bi-folder-check"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Laporan</div>
              <div className="progress-stat">
                <div className="progress-bar" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.approved}</div>
              <div className="stat-label">Disetujui</div>
              <div className="progress-stat">
                <div className="progress-bar" style={{ width: `${stats.approvedPercentage}%` }}>
                  <span className="progress-text">{stats.approvedPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-warning">
            <div className="stat-icon">
              <i className="bi bi-pen"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.signed}</div>
              <div className="stat-label">Tertandatangani</div>
              <div className="progress-stat">
                <div className="progress-bar" style={{ width: `${stats.signedPercentage}%` }}>
                  <span className="progress-text">{stats.signedPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS FILTER */}
        <div className="tabs-section">
          <div className="tabs-header">
            <h3 className="section-title">
              <i className="bi bi-list-task me-2"></i>
              Progress Laporan Pegawai
            </h3>
            <div className="tabs-container">
              <button 
                className={`tab-btn ${activeTab === "semua" ? "active" : ""}`}
                onClick={() => setActiveTab("semua")}
              >
                Semua ({stats.total})
              </button>
              <button 
                className={`tab-btn ${activeTab === "disetujui" ? "active" : ""}`}
                onClick={() => setActiveTab("disetujui")}
              >
                Disetujui ({stats.approved})
              </button>
              <button 
                className={`tab-btn ${activeTab === "ditandatangani" ? "active" : ""}`}
                onClick={() => setActiveTab("ditandatangani")}
              >
                Ditandatangani ({stats.signed})
              </button>
              <button 
                className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending ({stats.pending})
              </button>
            </div>
          </div>
        </div>

        {/* TABEL LAPORAN */}
        <div className="table-section">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-pegawai">Pegawai</th>
                  <th className="col-surat">Surat Tugas</th>
                  <th className="col-lokasi">Lokasi Tugas</th>
                  <th className="col-periode">Periode</th>
                  <th className="col-status">Status</th>
                  <th className="col-dokumen">Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p className="mt-3">Memuat data laporan...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="empty-state">
                        <i className="bi bi-inbox display-5 text-muted mb-3"></i>
                        <h5 className="text-muted mb-2">Tidak ada data laporan</h5>
                        <p className="text-muted small">
                          {activeTab === "semua" 
                            ? "Belum ada laporan yang dikirimkan" 
                            : `Tidak ada laporan dengan status "${activeTab}"`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((laporan) => (
                    <tr key={laporan.id} className="table-row">
                      <td className="col-pegawai">
                        <div className="pegawai-info">
                          <div className="pegawai-avatar">
                            {laporan.user?.nama?.charAt(0).toUpperCase() || "P"}
                          </div>
                          <div className="pegawai-detail">
                            <div className="pegawai-nama">{laporan.user?.nama || "Nama tidak tersedia"}</div>
                            <div className="pegawai-nip">{laporan.user?.nip || "NIP tidak tersedia"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="col-surat">
                        <div className="surat-info">
                          <div className="surat-nomor">{laporan.surat_tugas?.nomor_surat || "-"}</div>
                          <div className="surat-tipe">Surat Perintah Tugas</div>
                        </div>
                      </td>
                      <td className="col-lokasi">
                        <div className="lokasi-info">
                          <i className="bi bi-geo-alt me-2"></i>
                          {laporan.surat_tugas?.daerah_tujuan || "Lokasi tidak ditentukan"}
                        </div>
                      </td>
                      <td className="col-periode">
                        <div className="periode-info">
                          <div className="periode-date">
                            <span className="date-start">{formatDate(laporan.surat_tugas?.tanggal_mulai)}</span>
                            <i className="bi bi-arrow-right mx-2"></i>
                            <span className="date-end">{formatDate(laporan.surat_tugas?.tanggal_selesai)}</span>
                          </div>
                          <div className="periode-duration">
                            {laporan.surat_tugas?.tanggal_mulai && laporan.surat_tugas?.tanggal_selesai ? 
                              "Masa tugas" : "Periode tidak ditentukan"}
                          </div>
                        </div>
                      </td>
                      <td className="col-status">
                        {getStatusBadge(laporan.status)}
                      </td>
                      <td className="col-dokumen">
                        <div className="dokumen-actions">
                          {laporan.file_pdf && (
                            <a
                              href={toPublicFileUrl(laporan.file_pdf, { legacyDir: "uploads/pdf" })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-dokumen btn-laporan"
                            >
                              <i className="bi bi-file-earmark-pdf me-1"></i>
                              Laporan
                            </a>
                          )}
                          {laporan.file_word && (
                            <a
                              href={toPublicFileUrl(laporan.file_word, { legacyDir: "uploads/word" })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-dokumen btn-laporan"
                            >
                              <i className="bi bi-file-earmark-word me-1"></i>
                              Word
                            </a>
                          )}
                          {laporan.file_pdf_signed ? (
                            <a
                              href={toPublicFileUrl(laporan.file_pdf_signed, { legacyDir: "uploads/pdf" })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-dokumen btn-signed"
                            >
                              <i className="bi bi-pen-fill me-1"></i>
                              TTD
                            </a>
                          ) : (
                            <span className="no-signature">
                              <i className="bi bi-pen me-1"></i>
                              Belum TTD
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading && filteredData.length > 0 && (
            <div className="table-footer">
              <div className="pagination-info">
                Menampilkan <strong>{filteredData.length}</strong> dari <strong>{progressData.length}</strong> laporan
              </div>
              <div className="pagination-controls">
                <button className="btn-pagination" disabled>
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button className="btn-pagination active">1</button>
                <button className="btn-pagination">2</button>
                <button className="btn-pagination">3</button>
                <button className="btn-pagination">
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INFO PANEL */}
        <div className="info-panel">
          <div className="info-icon">
            <i className="bi bi-info-circle"></i>
          </div>
          <div className="info-content">
            <h6 className="info-title">Panduan Monitoring Sensus Ekonomi 2026</h6>
            <p className="info-text">
              Dashboard ini menampilkan progress pengumpulan data lapangan oleh pegawai. 
              Pastikan semua laporan telah disetujui dan ditandatangani sebelum tenggat waktu 
              <strong> 31 Desember 2026</strong>. Gunakan filter untuk memantau status spesifik.
            </p>
          </div>
        </div>
      </div>
    </AtasanLayout>
  );
};

export default DashboardAtasan;
