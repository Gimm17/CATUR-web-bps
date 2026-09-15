import { useEffect, useState } from "react";

// SERVICES
import { getPegawaiCount } from "../../services/pegawaiService";
import { getDaerah } from "../../services/daerahService";
import { getAllSuratTugas } from "../../services/suratTugas.service";
import { getLaporanKeuangan } from "../../services/keuangan.service";
// ICONS
import { 
  FaUsers, 
  FaMapMarkerAlt, 
  FaFileAlt, 
  FaClipboardCheck,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaRoad,
  FaBell,
  FaDatabase
} from "react-icons/fa";

import AdminLayout from "../../layouts/AdminLayout";

const DashboardPegawai = () => {
  const [pegawaiCount, setPegawaiCount] = useState(0);
  const [daerahList, setDaerahList] = useState([]);
  const [laporanPendingCount, setLaporanPendingCount] = useState(0);
  const [laporanPencairanCount, setLaporanPencairanCount] = useState(0);
  const [laporanSelesaiCount, setLaporanSelesaiCount] = useState(0);
  const [suratTugasCount, setSuratTugasCount] = useState(0);
  const [perjadinAktifCount, setPerjadinAktifCount] = useState(0);
  const [laporanList, setLaporanList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const toDayOnly = (value) => {
          if (!value) return null;
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return null;
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        };
        const todayOnly = toDayOnly(new Date());
        
        // Fetch data utama
        const [pegawaiRes, daerahRes, suratRes, laporanRes] = await Promise.all([
          getPegawaiCount(),
          getDaerah(),
          getAllSuratTugas(),
          getLaporanKeuangan()
        ]);

        // Set data dari API yang ada
        if (pegawaiRes && pegawaiRes.count !== undefined) {
          setPegawaiCount(pegawaiRes.count);
        }

        if (daerahRes && Array.isArray(daerahRes)) {
          setDaerahList(daerahRes);
        }
        const suratList = Array.isArray(suratRes) ? suratRes : [];
        const laporanListRaw = Array.isArray(laporanRes) ? laporanRes : [];

        if (suratList.length) {
          setSuratTugasCount(suratList.length);

          const activeCount = suratList.filter(item => {
            if (!item || item.status !== "AKTIF") return false;
            const startOnly = toDayOnly(item.tanggal_mulai);
            const endOnly = toDayOnly(item.tanggal_selesai);
            if (!startOnly || !endOnly || !todayOnly) return false;
            return startOnly <= todayOnly && todayOnly <= endOnly;
          }).length;
          setPerjadinAktifCount(activeCount);
        } else {
          setSuratTugasCount(0);
          setPerjadinAktifCount(0);
        }

        if (laporanListRaw.length) {
          const pendingCount = laporanListRaw.filter(item =>
            item && (item.status === "dikirim" || item.status === "dicek_keuangan")
          ).length;
          setLaporanPendingCount(pendingCount);
          setLaporanPencairanCount(
            laporanListRaw.filter(item => item && item.status === "pencairan_dana").length
          );
          setLaporanSelesaiCount(
            laporanListRaw.filter(item => item && item.status === "dana_turun").length
          );
        } else {
          setLaporanPendingCount(0);
          setLaporanPencairanCount(0);
          setLaporanSelesaiCount(0);
        }

        const laporanSuratIds = new Set(
          laporanListRaw
            .map((item) => item?.surat_tugas_id || item?.surat_tugas?.id)
            .filter(Boolean)
        );

        const draftRows = suratList
          .filter((surat) => {
            if (!surat || surat.status !== "AKTIF") return false;
            if (laporanSuratIds.has(surat.id)) return false;
            const startOnly = toDayOnly(surat.tanggal_mulai);
            const endOnly = toDayOnly(surat.tanggal_selesai);
            if (!startOnly || !endOnly || !todayOnly) return false;
            return startOnly <= todayOnly && todayOnly <= endOnly;
          })
          .map((surat) => ({
            id: `draft-${surat.id}`,
            status: "draft",
            surat_tugas_id: surat.id,
            surat_tugas: surat,
            user: surat.user || null,
            nominal_dana: 0
          }));

        const mergedLaporan = [...draftRows, ...laporanListRaw];
        setLaporanList(mergedLaporan);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        
        setPegawaiCount(0);
        setDaerahList([]);
        setLaporanPendingCount(0);
        setLaporanPencairanCount(0);
        setLaporanSelesaiCount(0);
        setSuratTugasCount(0);
        setPerjadinAktifCount(0);
        setLaporanList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format tanggal Indonesia
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatTanggalPerjadin = (suratTugas) => {
    if (!suratTugas) return "-";
    const start = suratTugas.tanggal_mulai ? new Date(suratTugas.tanggal_mulai) : null;
    const end = suratTugas.tanggal_selesai ? new Date(suratTugas.tanggal_selesai) : null;
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (start && end) {
      return `${start.toLocaleDateString('id-ID', options)} - ${end.toLocaleDateString('id-ID', options)}`;
    }
    if (start) {
      return start.toLocaleDateString('id-ID', options);
    }
    return "-";
  };

  const normalizeStatusLaporan = (status) => {
    if (!status) return null;
    if (status === "draft") return "draft";
    if (status === "dikirim") return "dikirim";
    if (status === "dicek_keuangan") return "dicek_keuangan";
    if (["disetujui_keuangan", "ditandatangani", "pencairan_dana", "dana_turun"].includes(status)) {
      return "completed";
    }
    return status;
  };

  const formatStatusLaporan = (status) => {
    const normalized = normalizeStatusLaporan(status);
    const statusMap = {
      draft: "Draft (Isi Absen)",
      dikirim: "Laporan Dikirim",
      dicek_keuangan: "Pengecekan Laporan",
      completed: "Completed"
    };
    return statusMap[normalized] || status || "-";
  };

  const formatPencairanAnggaran = (status) => {
    if (status === "disetujui_keuangan") return "Disetujui Keuangan";
    if (status === "ditandatangani") return "Ditandatangani Atasan";
    if (status === "pencairan_dana") return "Pencairan Dana";
    if (status === "dana_turun") return "Dana Diturunkan";
    return "-";
  };

  const formatRupiah = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString('id-ID');
  };

  const getStatusBadgeStyle = (status) => {
    const normalized = normalizeStatusLaporan(status);
    const styles = {
      draft: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
      dikirim: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
      dicek_keuangan: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      completed: { bg: '#dcfce7', text: '#166534', border: '#86efac' }
    };
    const palette = styles[normalized] || { bg: '#f1f5f9', text: '#0f172a', border: '#e2e8f0' };
    return {
      backgroundColor: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.border}`,
      padding: '5px 10px',
      borderRadius: '12px',
      fontSize: '0.85rem',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    };
  };

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "draft", label: "Draft (Isi Absen)" },
    { value: "dikirim", label: "Laporan Dikirim" },
    { value: "dicek_keuangan", label: "Pengecekan Laporan" },
    { value: "completed", label: "Completed" }
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLaporan = laporanList.filter(item => {
    if (!item) return false;
    const normalizedStatus = normalizeStatusLaporan(item.status);
    const matchesStatus = statusFilter === "all" ? true : normalizedStatus === statusFilter;
    if (!normalizedSearch) return matchesStatus;
    const nama = item.user?.nama?.toLowerCase() || "";
    const tujuan = item.surat_tugas?.daerah_tujuan?.toLowerCase() || "";
    const kegiatan = item.surat_tugas?.nama_kegiatan?.toLowerCase() || "";
    return matchesStatus && (nama.includes(normalizedSearch) || tujuan.includes(normalizedSearch) || kegiatan.includes(normalizedSearch));
  });

  const totalPages = Math.max(1, Math.ceil(filteredLaporan.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedLaporan = filteredLaporan.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, laporanList.length]);

  // Get status color untuk laporan
  const getLaporanStatusColor = () => {
    if (laporanPendingCount === 0) return 'success';
    if (laporanPendingCount <= 3) return 'warning';
    return 'danger';
  };

  // Get icon untuk laporan
  const getLaporanStatusIcon = () => {
    if (laporanPendingCount === 0) return <FaCheckCircle />;
    return <FaClock />;
  };

  return (
    <AdminLayout>
      {/* MAIN CONTENT AREA - Disesuaikan dengan sidebar */}
      <div  style={{ 
        minHeight: 'calc(100vh - 70px)',
        backgroundColor: '#f8fafc',
        padding: '20px'
      }}>
        
        {/* HEADER SECTION */}
        <section className="content-header">
          <div className="container-fluid">
            <div className="row mb-4">
              <div className="col-sm-12">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h1 style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: '700',
                      color: '#1e293b',
                      marginBottom: '5px'
                    }}>
                      Dashboard Admin
                    </h1>
                    <p style={{ 
                      color: '#64748b',
                      marginBottom: '0',
                      fontSize: '0.95rem'
                    }}>
                      Selamat datang di Sistem Presensi Dinas 
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaCalendarAlt style={{ color: '#1a56db' }} />
                    <span style={{ 
                      fontWeight: '500',
                      color: '#1e293b',
                      fontSize: '0.95rem'
                    }}>
                      {currentDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS CARDS */}
        <section className="content">
          <div className="container-fluid">
            <div className="row">
              {/* TOTAL PEGAWAI */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: '5px solid #1a56db'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: 'rgba(26, 86, 219, 0.1)',
                    color: '#1a56db',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    <FaUsers />
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Total Pegawai
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : pegawaiCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaUsers style={{ fontSize: '0.8rem' }} />
                      Semua pegawai terdaftar
                    </span>
                  </div>
                </div>
              </div>

              {/* LAPORAN PENDING */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: `5px solid ${
                    getLaporanStatusColor() === 'success' ? '#10b981' :
                    getLaporanStatusColor() === 'warning' ? '#f59e0b' :
                    '#ef4444'
                  }`,
                  position: 'relative'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: getLaporanStatusColor() === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                    getLaporanStatusColor() === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                                    'rgba(239, 68, 68, 0.1)',
                    color: getLaporanStatusColor() === 'success' ? '#10b981' :
                          getLaporanStatusColor() === 'warning' ? '#f59e0b' :
                          '#ef4444',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    {getLaporanStatusIcon()}
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Laporan Pending
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : laporanPendingCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaClock style={{ fontSize: '0.8rem' }} />
                      Menunggu verifikasi
                    </span>
                  </div>

                  {laporanPendingCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}>
                      !
                    </div>
                  )}
                </div>
              </div>

              {/* PEGAWAI PERJADIN */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: '5px solid #10b981'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    <FaRoad />
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Pegawai Perjalanan Dinas
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : perjadinAktifCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaRoad style={{ fontSize: '0.8rem' }} />
                      Sedang bertugas
                    </span>
                  </div>
                </div>
              </div>

              {/* SURAT TUGAS */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: '5px solid #0ea5e9'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    color: '#0ea5e9',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    <FaFileAlt />
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Surat Tugas
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : suratTugasCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaFileAlt style={{ fontSize: '0.8rem' }} />
                      Total surat tugas
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              {/* LAPORAN PENCAIRAN */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: '5px solid #a855f7'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.12)',
                    color: '#a855f7',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    <FaChartLine />
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Laporan Pencairan
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : laporanPencairanCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaChartLine style={{ fontSize: '0.8rem' }} />
                      Status pencairan dana
                    </span>
                  </div>
                </div>
              </div>

              {/* LAPORAN SELESAI */}
              <div className="col-lg-3 col-md-6 col-sm-12 mb-4">
                <div className="info-box" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  height: '100%',
                  borderLeft: '5px solid #10b981'
                }}>
                  <span className="info-box-icon" style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '15px'
                  }}>
                    <FaCheckCircle />
                  </span>

                  <div className="info-box-content">
                    <span className="info-box-text" style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '5px'
                    }}>
                      Laporan Selesai
                    </span>
                    <span className="info-box-number" style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      display: 'block',
                      lineHeight: '1',
                      marginBottom: '8px'
                    }}>
                      {loading ? '...' : laporanSelesaiCount}
                    </span>
                    <span className="info-box-detail" style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FaCheckCircle style={{ fontSize: '0.8rem' }} />
                      Dana sudah turun
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABEL LAPORAN DAN QUICK ACTIONS */}
            <div className="row">
              {/* TABEL LAPORAN (70%) */}
              <div className="col-lg-8 col-md-12 mb-4">
                <div className="card" style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  border: 'none'
                }}>
                  <div className="card-header" style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '20px',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <FaFileAlt style={{ color: '#0ea5e9' }} />
                          Laporan Seluruh Pegawai
                        </h5>
                        <p style={{
                          fontSize: '0.9rem',
                          color: '#64748b',
                          marginBottom: '0'
                        }}>
                          Ringkasan laporan perjalanan dinas pegawai
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-control form-control-sm"
                            placeholder="Cari nama atau tujuan..."
                            style={{ minWidth: '220px' }}
                          />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select form-select-sm"
                            style={{ minWidth: '170px' }}
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{
                          backgroundColor: '#f8fafc',
                          padding: '8px 15px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: '800',
                            color: '#0ea5e9',
                            lineHeight: '1'
                          }}>
                            {laporanList.length}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#64748b'
                          }}>
                            Laporan
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-body" style={{ padding: '0' }}>
                    {loading ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p style={{ 
                          marginTop: '15px',
                          color: '#64748b'
                        }}>
                          Memuat data laporan...
                        </p>
                      </div>
                    ) : filteredLaporan.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        <FaFileAlt style={{
                          fontSize: '3rem',
                          color: '#cbd5e1',
                          marginBottom: '15px'
                        }} />
                        <h6 style={{
                          color: '#1e293b',
                          fontWeight: '600',
                          marginBottom: '10px'
                        }}>
                          {laporanList.length === 0 ? "Belum Ada Data Laporan" : "Data Tidak Ditemukan"}
                        </h6>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>
                          {laporanList.length === 0
                            ? "Laporan pegawai akan tampil di sini setelah dikirim"
                            : "Coba ubah kata kunci atau filter status"}
                        </p>
                        <a href="/admin/laporan" className="btn btn-primary btn-sm">
                          <FaClipboardCheck className="me-2" />
                          Lihat Laporan
                        </a>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                              <th style={{
                                width: '5%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                No
                              </th>
                              <th style={{
                                width: '18%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Nama
                              </th>
                              <th style={{
                                width: '20%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Kegiatan
                              </th>
                              <th style={{
                                width: '20%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Lokasi/Tujuan Perjadin
                              </th>
                              <th style={{
                                width: '18%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Tanggal Perjadin
                              </th>
                              <th style={{
                                width: '14%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Status Laporan
                              </th>
                              <th style={{
                                width: '15%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Pencairan Anggaran
                              </th>
                              <th style={{
                                width: '15%',
                                fontWeight: '600',
                                color: '#1e293b',
                                padding: '15px',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                Nilai Pencairan
                              </th>
                             
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedLaporan.map((item, index) => (
                              <tr key={item.id || index} style={{
                                borderBottom: '1px solid #f1f5f9'
                              }}>
                                <td style={{
                                  padding: '15px',
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  color: '#1e293b'
                                }}>
                                  {startIndex + index + 1}
                                </td>
                                <td style={{ padding: '15px' }}>
                                  <div style={{ fontWeight: '500', color: '#1e293b' }}>
                                    {item.user?.nama || '-'}
                                  </div>
                                </td>
                                <td style={{ padding: '15px', color: '#64748b' }}>
                                  {item.surat_tugas?.nama_kegiatan || '-'}
                                </td>
                                <td style={{ padding: '15px', color: '#64748b' }}>
                                  {item.surat_tugas?.daerah_tujuan || '-'}
                                </td>
                                <td style={{ padding: '15px' }}>
                                  {formatTanggalPerjadin(item.surat_tugas)}
                                </td>
                                <td style={{ padding: '15px' }}>
                                  <span style={getStatusBadgeStyle(item.status)}>
                                    {formatStatusLaporan(item.status)}
                                  </span>
                                </td>
                                <td style={{ padding: '15px', color: '#64748b' }}>
                                  {formatPencairanAnggaran(item.status)}
                                </td>
                                <td style={{ padding: '15px' }}>
                                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                    Rp {formatRupiah(item.nominal_dana)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {!loading && laporanList.length > 0 && (
                    <div className="card-footer" style={{
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                      padding: '15px 20px'
                    }}>
                      <div className="d-flex justify-content-between align-items-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                        <small style={{ color: '#64748b' }}>
                          Menampilkan {filteredLaporan.length} laporan
                        </small>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={safePage <= 1}
                          >
                            Prev
                          </button>
                          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Halaman {safePage} dari {totalPages}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={safePage >= totalPages}
                          >
                            Next
                          </button>
                        </div>
                       
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK ACTIONS (30%) */}
              <div className="col-lg-4 col-md-12 mb-4">
                {/* QUICK ACTIONS CARD */}
                <div className="card mb-4" style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  border: 'none'
                }}>
                  <div className="card-header" style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '20px',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}>
                    <h5 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <FaClipboardCheck style={{ color: '#1a56db' }} />
                      Aksi Cepat
                    </h5>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Buat Surat Tugas */}
                      <a href="/admin/surat-tugas/create" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: 'rgba(26, 86, 219, 0.1)',
                          color: '#1a56db',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <FaFileAlt />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                            Buat Surat Tugas
                          </div>
                          <small style={{ color: '#64748b' }}>
                            Buat surat tugas baru untuk pegawai
                          </small>
                        </div>
                      </a>

                      {/* Kelola Daerah */}
                      <a href="/admin-daerah" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <FaMapMarkerAlt />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                            Kelola Daerah
                          </div>
                          <small style={{ color: '#64748b' }}>
                            Tambah atau edit daerah presensi
                          </small>
                        </div>
                      </a>

                      {/* Verifikasi Laporan */}
                      <a href="/admin/laporan" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          color: '#f59e0b',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <FaClipboardCheck />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                            Verifikasi Laporan
                          </div>
                          <small style={{ color: '#64748b' }}>
                            Proses laporan pending ({laporanPendingCount})
                          </small>
                        </div>
                      </a>

                      {/* Data Pegawai */}
                      <a href="/pengaturan-akun" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          color: '#0ea5e9',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <FaUsers />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                            Data Pegawai
                          </div>
                          <small style={{ color: '#64748b' }}>
                            Lihat dan kelola data pegawai
                          </small>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>

                {/* SYSTEM INFO CARD */}
                <div className="card" style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  border: 'none'
                }}>
                  <div className="card-header" style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '20px',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}>
                    <h5 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <FaDatabase style={{ color: '#10b981' }} />
                      Info Sistem
                    </h5>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Versi Sistem</span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>CATUR-SENSUS v1.0</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Periode Sensus</span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>2026</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Total Data</span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{pegawaiCount + daerahList.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Status Sistem</span>
                        <span style={{ fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaCheckCircle />
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* HOVER EFFECTS STYLE */}
      <style jsx>{`
        .info-box:hover {
          transform: translateY(-3px);
          transition: transform 0.3s ease;
        }
        
        a:hover {
          background-color: white !important;
          border-color: #1a56db !important;
          transform: translateX(5px);
          transition: all 0.2s;
        }
        
        button:hover {
          opacity: 0.9;
        }
        
        @media (max-width: 768px) {
          .content-wrapper {
            padding: 15px;
          }
          
          .info-box {
            flex-direction: column;
            text-align: center;
            gap: 15px;
          }
          
          .info-box-icon {
            margin-right: 0 !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default DashboardPegawai;
