import { useEffect, useState } from "react";
import { getSuratTugasAktif} from "../../services/surat.service";
import { getAllSuratTugas } from "../../services/suratTugas.service";
import { cekStatusPresensi } from "../../services/presensiService";
import { getLaporanPerjalanan } from "../../services/laporan.service";
import { getDaerah, getDaerahById } from "../../services/daerahService";
import api from "../../api/axios";
import { getUser } from "../../utils/auth";
import { toPublicFileUrl } from "../../utils/fileUrl";
import PegawaiLayout from "../../layouts/PegawaiLayout";
import { 
  FaFileAlt, 
  FaMapMarkerAlt, 
  FaCalendarAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaUserCheck,
  FaClock,
  FaEye,
  FaSpinner,
  FaCalendarCheck,
  FaHistory,
  FaMapPin,
  FaTasks,
  FaSync,
  FaBell,
  FaHourglassHalf,
  FaHourglassEnd,
  FaCheckDouble,
  FaArrowRight,
  FaCloudDownloadAlt,
  FaExclamationTriangle,
  FaCalendarDay,
  FaBullseye,
  FaMoneyBillWave,
  FaUser,
  FaIdCard,
  FaBuilding,
  FaPen,
  FaCamera,
  FaCheck,
  FaTimes,
  FaRegClock
} from "react-icons/fa";
import '../../css/dashboard.css';

const DashboardPegawai = () => {
  const [surat, setSurat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_stats, setStats] = useState({
    totalPresensi: 0,
    totalDinas: 0,
    pendingLaporan: 0,
    persentaseKehadiran: 0,
    totalSuratTugas: 0,
    activeSurat: 0,
  });
  const [_presensiHistory, setPresensiHistory] = useState([]);
  const [allSuratTugas, setAllSuratTugas] = useState([]);
  const [_recentPresensi, setRecentPresensi] = useState([]);
  const [_laporanPending, setLaporanPending] = useState([]);
  const [_notifikasi, setNotifikasi] = useState([]);
  const [error, setError] = useState("");
  const [suratStatus, setSuratStatus] = useState(null);
  
  // State untuk tracking status presensi hari ini (REAL-TIME)
  const [statusHariIni, setStatusHariIni] = useState({
    sudahAbsen: false,
    sudahLaporan: false,
    dataPresensi: null,
    loading: false
  });
  const [outsideAreaWarning, setOutsideAreaWarning] = useState("");

  // State untuk tabel surat tugas
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [activePresensiTimeline, setActivePresensiTimeline] = useState([]);
  const [currentPresensiSlide, setCurrentPresensiSlide] = useState(0);
  const itemsPerPage = 3;

  const currentUser = getUser();

  const getFotoList = (presensiItem) => {
    const fotoList = Array.isArray(presensiItem?.foto_list)
      ? presensiItem.foto_list
      : (presensiItem?.foto ? [presensiItem.foto] : []);
    return fotoList.filter(Boolean);
  };

  const stripHtml = (value = "") => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const todayDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const isLocalArea = (name) => {
    const lower = String(name || "").toLowerCase();
    return ["palu", "sigi", "donggala"].some((item) => lower.includes(item));
  };

  const hitungDurasiHari = (tanggalMulai, tanggalSelesai) => {
    if (!tanggalMulai || !tanggalSelesai) return 0;
    const mulai = new Date(tanggalMulai);
    const selesai = new Date(tanggalSelesai);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(0, 0, 0, 0);
    return Math.floor((selesai - mulai) / (1000 * 60 * 60 * 24)) + 1;
  };

  const hitungHariKeAktif = (tanggalMulai) => {
    if (!tanggalMulai) return 0;
    const mulai = new Date(tanggalMulai);
    const today = new Date(todayDateString);
    mulai.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - mulai) / (1000 * 60 * 60 * 24)) + 1;
  };

  const buildGeojson = (raw) => {
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed) return null;
    if (parsed.type === "FeatureCollection" || parsed.type === "Feature") return parsed;
    return { type: "Feature", geometry: parsed, properties: {} };
  };

  const isPointInRing = (point, ring) => {
    if (!Array.isArray(ring) || ring.length < 3) return false;
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] || [];
      const [xj, yj] = ring[j] || [];
      if (![xi, yi, xj, yj].every((value) => typeof value === "number")) continue;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const isPointInPolygonCoords = (point, polygonCoords) => {
    if (!Array.isArray(polygonCoords) || !polygonCoords.length) return false;
    const [outer, ...holes] = polygonCoords;
    if (!isPointInRing(point, outer)) return false;
    return !holes.some((hole) => isPointInRing(point, hole));
  };

  const isPointInGeojson = (point, geojson) => {
    if (!geojson) return false;
    const checkGeometry = (geometry) => {
      if (!geometry) return false;
      if (geometry.type === "Polygon") return isPointInPolygonCoords(point, geometry.coordinates);
      if (geometry.type === "MultiPolygon") {
        return (geometry.coordinates || []).some((poly) => isPointInPolygonCoords(point, poly));
      }
      return false;
    };

    if (geojson.type === "FeatureCollection") {
      return (geojson.features || []).some((feature) => checkGeometry(feature?.geometry));
    }
    if (geojson.type === "Feature") return checkGeometry(geojson.geometry);
    return checkGeometry(geojson);
  };

  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000;
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  const isWithinRadius = (lat, lon, centerLat, centerLon, radiusMeters) => {
    if (!Number.isFinite(Number(radiusMeters)) || Number(radiusMeters) <= 0) return false;
    return calculateDistanceMeters(
      Number(lat),
      Number(lon),
      Number(centerLat),
      Number(centerLon)
    ) <= Number(radiusMeters);
  };

  // Fungsi untuk melihat PDF laporan
  const handleViewLaporanPDF = (pdfFilename) => {
    if (!pdfFilename) {
      alert("File laporan tidak tersedia");
      return;
    }
    
    // Gunakan URL yang sama dengan di modul keuangan
    const pdfUrl = toPublicFileUrl(pdfFilename, { legacyDir: "uploads/pdf" });
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const getLaporanFile = (suratData) => {
    if (!suratData?.laporan) return "";
    return suratData.laporan.file_pdf_signed || suratData.laporan.file_pdf || "";
  };

  const resolveLaporanForSurat = (laporanList, suratData) => {
    if (!Array.isArray(laporanList) || !suratData?.id) return null;

    const suratId = String(suratData.id);
    const related = laporanList.filter((laporanItem) => {
      const relatedId =
        laporanItem?.surat_tugas_id ??
        laporanItem?.surat_tugas?.id ??
        laporanItem?.surat_id ??
        laporanItem?.surat?.id ??
        laporanItem?.suratTugasId;

      if (relatedId === null || relatedId === undefined) return false;
      return String(relatedId) === suratId;
    });

    if (related.length === 0) return null;

    const signed = related.find((laporanItem) => laporanItem?.file_pdf_signed);
    if (signed) return signed;

    const getTimestamp = (value) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const sorted = related.slice().sort((a, b) => {
      const timeA = getTimestamp(
        a?.updated_at || a?.updatedAt || a?.tanggal_ttd || a?.tanggal_kirim || a?.created_at
      );
      const timeB = getTimestamp(
        b?.updated_at || b?.updatedAt || b?.tanggal_ttd || b?.tanggal_kirim || b?.created_at
      );
      return timeB - timeA;
    });

    return sorted[0];
  };

  // Fungsi untuk menghitung durasi dari range tanggal
  const calculateDurasi = (tanggalMulai, tanggalSelesai) => {
    if (!tanggalMulai || !tanggalSelesai) return 0;
    
    try {
      const start = new Date(tanggalMulai);
      const end = new Date(tanggalSelesai);
      
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error("Error menghitung durasi:", error);
      return 0;
    }
  };

  // Fungsi untuk menghitung sisa hari
  const calculateSisaHari = (tanggalSelesai) => {
    if (!tanggalSelesai) return 0;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const end = new Date(tanggalSelesai);
      end.setHours(0, 0, 0, 0);
      
      const diffTime = end - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error("Error menghitung sisa hari:", error);
      return 0;
    }
  };

  // Fungsi untuk menghitung hari yang sudah dijalani
  const calculateHariBerjalan = (tanggalMulai, tanggalSelesai) => {
    if (!tanggalMulai) return 0;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = new Date(tanggalMulai);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(tanggalSelesai);
      end.setHours(0, 0, 0, 0);
      
      const effectiveEnd = today > end ? end : today;
      
      const diffTime = effectiveEnd - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error("Error menghitung hari berjalan:", error);
      return 0;
    }
  };

  // Fungsi untuk menghitung durasi dan status surat tugas
  const calculateSuratStatus = (suratData) => {
    if (!suratData) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tanggalMulai = suratData.tanggal_mulai ? new Date(suratData.tanggal_mulai) : null;
    const tanggalSelesai = suratData.tanggal_selesai ? new Date(suratData.tanggal_selesai) : null;
    
    if (!tanggalMulai || !tanggalSelesai) {
      return {
        status: 'unknown',
        durasi: 0,
        durasiHari: 0,
        sisaHari: 0,
        hariBerjalan: 0,
        persentase: 0,
        label: 'Tidak diketahui',
        icon: <FaInfoCircle />,
        color: 'secondary'
      };
    }

    tanggalMulai.setHours(0, 0, 0, 0);
    tanggalSelesai.setHours(0, 0, 0, 0);
    
    const durasiHari = calculateDurasi(tanggalMulai, tanggalSelesai);
    
    let sisaHari = 0;
    let hariBerjalan = 0;
    let status = '';
    let label = '';
    let icon = null;
    let color = '';
    let persentase = 0;
    
    if (today < tanggalMulai) {
      const daysUntilStart = Math.ceil((tanggalMulai - today) / (1000 * 60 * 60 * 24));
      status = 'upcoming';
      label = `Mulai ${daysUntilStart} hari lagi`;
      icon = <FaHourglassHalf />;
      color = 'info';
      sisaHari = durasiHari;
      hariBerjalan = 0;
      persentase = 0;
    } else if (today > tanggalSelesai) {
      const daysOverdue = Math.ceil((today - tanggalSelesai) / (1000 * 60 * 60 * 24));
      status = 'expired';
      label = `Berakhir ${daysOverdue} hari lalu`;
      icon = <FaHourglassEnd />;
      color = 'secondary';
      sisaHari = 0;
      hariBerjalan = durasiHari;
      persentase = 100;
    } else {
      hariBerjalan = calculateHariBerjalan(tanggalMulai, tanggalSelesai);
      sisaHari = calculateSisaHari(tanggalSelesai);
      persentase = Math.min(Math.round((hariBerjalan / durasiHari) * 100), 100);
      
      status = 'active';
      label = `${sisaHari} hari tersisa`;
      icon = <FaCalendarCheck />;
      color = 'success';
    }

    return {
      status,
      durasi: durasiHari,
      durasiHari,
      sisaHari,
      hariBerjalan,
      persentase,
      label,
      icon,
      color,
      tanggalMulai,
      tanggalSelesai
    };
  };

  // FUNGSI CEK STATUS PRESENSI HARI INI (REAL-TIME)
  const cekStatusHariIni = async () => {
    try {
      setStatusHariIni(prev => ({ ...prev, loading: true }));
      
      const response = await cekStatusPresensi();
      console.log(" Status presensi hari ini:", response.data);
      
      if (response.data?.sudah_absen) {
        setStatusHariIni({
          sudahAbsen: true,
          sudahLaporan: response.data.sudah_laporan || false,
          dataPresensi: response.data.data,
          loading: false
        });
      } else {
        setStatusHariIni({
          sudahAbsen: false,
          sudahLaporan: false,
          dataPresensi: null,
          loading: false
        });
      }
    } catch (error) {
      console.error(" Gagal cek status presensi:", error);
      setStatusHariIni({
        sudahAbsen: false,
        sudahLaporan: false,
        dataPresensi: null,
        loading: false
      });
    }
  };

    useEffect(() => {
    loadDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Memulai load data dashboard...");
      console.log("Current user:", currentUser);

      // 1. Ambil surat tugas aktif
      let suratAktif = null;
      let suratStatusInfo = null;
      
      try {
        console.log("Loading surat tugas aktif...");
        const response = await getSuratTugasAktif();
        console.log(" Response surat aktif:", response);
        
        if (response && typeof response === 'object') {
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            suratAktif = response.data[0];
          } else if (Array.isArray(response) && response.length > 0) {
            suratAktif = response[0];
          } else if (response.id) {
            suratAktif = response;
          }
        }
        
        if (suratAktif) {
          suratStatusInfo = calculateSuratStatus(suratAktif);
          suratAktif.statusInfo = suratStatusInfo;
        }
        
        console.log(" Surat tugas aktif:", suratAktif);
      } catch (err) {
        console.warn("Tidak ada surat tugas aktif:", err.message);
      }

      // 2. Ambil semua surat tugas
      let allSuratData = [];
      try {
        console.log("Loading semua surat tugas untuk user_id:", currentUser?.id);
        
        if (currentUser?.id) {
          const response = await getAllSuratTugas(currentUser.id);
          console.log(" Response getAllSuratTugas:", response);
          
          if (Array.isArray(response)) {
            allSuratData = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            allSuratData = response.data;
          }
          
          console.log(" Total surat tugas sebelum diproses:", allSuratData.length);
        }
      } catch (err) {
        console.error(" Error mengambil surat tugas:", err);
        allSuratData = [];
      }

      // 3. Ambil data presensi
      let presensiData = { history: [], recent: [], total: 0 };
      let presensiCountBySuratId = {};
      try {
        console.log("Loading data presensi...");
        const response = await api.get('/presensi', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        const data = response.data || response;
        
        let presensiList = [];
        if (Array.isArray(data)) {
          presensiList = data;
        } else if (data.data && Array.isArray(data.data)) {
          presensiList = data.data;
        } else if (data.presensi && Array.isArray(data.presensi)) {
          presensiList = data.presensi;
        }

        presensiCountBySuratId = presensiList.reduce((acc, p) => {
          const suratId = p?.surat_tugas_id ?? p?.surat_tugas?.id ?? p?.surat?.id;
          if (suratId === null || suratId === undefined) return acc;
          const key = String(suratId);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        const today = new Date().toISOString().split('T')[0];
        const recent = presensiList
          .filter(p => {
            const presensiDate = p.tanggal_presensi || p.created_at || p.tanggal;
            return presensiDate && presensiDate.includes(today);
          })
          .slice(0, 5);
        
        presensiData = {
          history: presensiList.slice(0, 10),
          recent: recent,
          total: presensiList.length
        };
        
      } catch (err) {
        console.warn("Error presensi:", err.message);
        presensiData = {
          history: [],
          recent: [],
          total: 0
        };
        presensiCountBySuratId = {};
      }

      // 4. Ambil data laporan (pegawai tidak punya akses GET /laporan)
      let laporanData = [];
      try {
        console.log("Loading data laporan...");

        if (Array.isArray(allSuratData) && allSuratData.length > 0) {
          const laporanResponses = await Promise.allSettled(
            allSuratData.map((item) =>
              api.get(`/laporan/surat/${item.id}`, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              })
            )
          );

          laporanData = laporanResponses.flatMap((result) => {
            if (result.status !== 'fulfilled') return [];
            const payload = result.value?.data ?? result.value;
            if (Array.isArray(payload)) return payload;
            if (payload?.data && Array.isArray(payload.data)) return payload.data;
            if (payload?.laporan && Array.isArray(payload.laporan)) return payload.laporan;
            return [];
          });
        } else {
          const response = await api.get('/perjalanan', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const data = response.data || response;
          if (data?.laporan_akhir) {
            laporanData = [data.laporan_akhir];
          }
        }

        console.log("Laporan:", laporanData.length);
      } catch (err) {
        console.warn("Error laporan:", err.message);
        laporanData = [];
      }

      // 5. Ambil data notifikasi
      let notifikasiData = [];
      try {
        console.log("Loading notifikasi...");
        const response = await api.get('/notifikasi', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        const data = response.data || response;
        
        if (Array.isArray(data)) {
          notifikasiData = data;
        } else if (data.data && Array.isArray(data.data)) {
          notifikasiData = data.data;
        } else if (data.notifikasi && Array.isArray(data.notifikasi)) {
          notifikasiData = data.notifikasi;
        }
        
        console.log(" Notifikasi:", notifikasiData.length);
      } catch (err) {
        console.warn("Error notifikasi:", err.message);
        notifikasiData = [];
      }

      // 6. Proses allSuratData dengan data laporan
      allSuratData = allSuratData.map(surat => {
        try {
          // Cari laporan yang terkait dengan surat tugas ini
          const terkaitLaporan = resolveLaporanForSurat(laporanData, surat);
          const presensiCountForSurat = presensiCountBySuratId[String(surat?.id)] || 0;
          
          return {
            ...surat,
            statusInfo: calculateSuratStatus(surat),
            presensi_count: presensiCountForSurat,
            laporan: terkaitLaporan || null // Tambahkan data laporan ke objek surat
          };
        } catch (err) {
          console.warn("Error calculate status untuk surat:", surat.id, err);
          return surat;
        }
      });

      allSuratData.sort((a, b) => {
        try {
          return new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai);
        } catch {
          return 0;
        }
      });

      console.log(" Total surat tugas setelah diproses:", allSuratData.length);

      // 7. CEK STATUS PRESENSI HARI INI (REAL-TIME)
      await cekStatusHariIni();

      let perjalananAktif = null;
      try {
        perjalananAktif = await getLaporanPerjalanan();
      } catch (perjalananErr) {
        console.warn("Error mengambil timeline presensi aktif:", perjalananErr.message);
      }

      const activeTimeline = Array.isArray(perjalananAktif?.presensi)
        ? perjalananAktif.presensi
            .filter((item) => {
              const tanggal = item?.tanggal_presensi;
              if (!tanggal || !suratAktif?.tanggal_mulai || !suratAktif?.tanggal_selesai) return true;
              return tanggal >= suratAktif.tanggal_mulai && tanggal <= suratAktif.tanggal_selesai;
            })
            .map((item, index) => ({
              ...item,
              hari_ke: item?.hari_ke || index + 1,
            }))
        : [];

      setSurat(suratAktif);
      setSuratStatus(suratStatusInfo);
      setAllSuratTugas(allSuratData);
      setActivePresensiTimeline(activeTimeline);
      setCurrentPresensiSlide(0);
      setPresensiHistory(presensiData.history);
      setRecentPresensi(presensiData.recent);
      setLaporanPending(laporanData);
      setNotifikasi(notifikasiData);
      
      const calculatedStats = calculateRealStats(
        presensiData,
        allSuratData,
        laporanData
      );
      setStats(calculatedStats);
      
      console.log(" Dashboard data loaded:", calculatedStats);
      
    } catch (error) {
      console.error(" Error loading dashboard data:", error);
      setError("Gagal memuat data dashboard. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  };

  const calculateRealStats = (presensiData, allSuratData, laporanData) => {
    const presensiTotal = presensiData?.total || 0;
    const suratTugasTotal = Array.isArray(allSuratData) ? allSuratData.length : 0;
    
    const pendingLaporan = Array.isArray(laporanData) 
      ? laporanData.filter(l => {
          const status = l.status?.toLowerCase();
          return status === 'pending' || status === 'draft' || status === 'menunggu';
        }).length 
      : 0;
    
    const hariKerjaPerBulan = 22;
    const attendancePercentage = hariKerjaPerBulan > 0 
      ? Math.min(Math.round((presensiTotal / hariKerjaPerBulan) * 100), 100)
      : 0;
    
    const completedSurat = Array.isArray(allSuratData) 
      ? allSuratData.filter(s => s.statusInfo?.status === 'expired').length 
      : 0;
    
    const activeSurat = Array.isArray(allSuratData) 
      ? allSuratData.filter(s => s.statusInfo?.status === 'active').length 
      : 0;
    
    return {
      totalPresensi: presensiTotal,
      totalDinas: completedSurat,
      pendingLaporan: pendingLaporan,
      persentaseKehadiran: attendancePercentage,
      totalSuratTugas: suratTugasTotal,
      activeSurat: activeSurat
    };
  };

  // Fungsi untuk handle klik tombol laporan
  const handleLaporanClick = (surat) => {
    const laporanFile = getLaporanFile(surat);
    if (laporanFile) {
      handleViewLaporanPDF(laporanFile);
      return;
    }

    // Jika surat sudah selesai (expired), arahkan ke halaman laporan
    if (surat.statusInfo?.status === 'expired') {
      window.location.href = '/laporan';
      return;
    }

    // Jika surat aktif dan sudah absen, arahkan ke halaman laporan
    if (statusHariIni.sudahAbsen) {
      window.location.href = '/laporan';
    } 
    // Jika surat aktif tapi belum absen, arahkan ke halaman presensi
    else {
      window.location.href = '/presensi';
    }
  };

  // Fungsi untuk menampilkan detail surat
  const handleViewDetail = (surat) => {
    setSelectedSurat(surat);
    setShowDetailModal(true);
  };

  // Fungsi untuk menutup modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSurat(null);
  };

  // Fungsi untuk mendownload file surat
  const handleDownloadFile = (filePath) => {
    if (!filePath) {
      alert("File surat tidak tersedia");
      return;
    }
    
    window.open(toPublicFileUrl(filePath), '_blank');
  };

  // Filter surat tugas
  const filteredSuratTugas = allSuratTugas.filter(surat => {
    const matchesSearch = 
      (surat.nomor_surat?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (surat.daerah_tujuan?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (surat.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = filterStatus === "semua" || surat.statusInfo?.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSuratTugas.length / itemsPerPage);
  const paginatedSurat = filteredSuratTugas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString) => {
    if (!dateString) return "-";
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

  const formatDateFull = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  useEffect(() => {
    const cekAreaTagging = async () => {
      if (!surat || suratStatus?.status !== "active" || !navigator.geolocation) {
        setOutsideAreaWarning("");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const latitude = Number(pos.coords.latitude);
            const longitude = Number(pos.coords.longitude);
            const point = [longitude, latitude];
            const daerahId = surat?.daerah_id || surat?.daerah?.id;
            const daerahData = daerahId ? await getDaerahById(daerahId) : null;
            const targetGeojson = buildGeojson(daerahData?.geojson);
            const targetRadius = Number(daerahData?.radius || surat?.radius || 0);
            const insideTarget =
              (targetGeojson ? isPointInGeojson(point, targetGeojson) : false) ||
              isWithinRadius(latitude, longitude, surat?.latitude, surat?.longitude, targetRadius);

            const hariKe = hitungHariKeAktif(surat.tanggal_mulai);
            const durasiHari = hitungDurasiHari(surat.tanggal_mulai, surat.tanggal_selesai);
            const isHariGabungan =
              !isLocalArea(surat.daerah_tujuan) &&
              (hariKe === 1 || (durasiHari > 0 && hariKe === durasiHari));

            let insidePalu = false;
            if (isHariGabungan) {
              const daerahList = await getDaerah();
              const palu = (Array.isArray(daerahList) ? daerahList : []).find((item) =>
                String(item?.nama_daerah || "").toLowerCase().includes("kota palu")
              );
              const paluGeojson = buildGeojson(palu?.geojson);
              const paluRadius = Number(palu?.radius || 0);
              insidePalu =
                (paluGeojson ? isPointInGeojson(point, paluGeojson) : false) ||
                isWithinRadius(latitude, longitude, -0.8983014661969085, 119.89089223877535, paluRadius);
            }

            setOutsideAreaWarning(
              insideTarget || insidePalu
                ? ""
                : "Kamu berada di luar area tagging, silakan ke area tagging."
            );
          } catch (err) {
            console.error("Gagal cek area tagging dashboard:", err);
            setOutsideAreaWarning("");
          }
        },
        () => setOutsideAreaWarning(""),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    cekAreaTagging();
  }, [surat, suratStatus, todayDateString]);

  // Badge status component (alur pegawai)
  const StatusBadge = ({ suratData }) => {
    if (!suratData) return null;

    const laporan = suratData.laporan;
    const hasCatatan = Boolean(laporan?.catatan_keuangan && String(laporan.catatan_keuangan).trim());
    const statusLaporan = laporan?.status;

    let text = "Isi Absen";
    let color = "#0369a1";
    let bg = "#e0f2fe";

    if (statusLaporan === "dikirim" && hasCatatan) {
      text = "Perlu Perbaikan";
      color = "#be123c";
      bg = "#ffe4e6";
    } else if (["ditandatangani", "pencairan_dana", "dana_turun"].includes(statusLaporan)) {
      text = "Selesai";
      color = "#0f766e";
      bg = "#ccfbf1";
    } else if (["dikirim", "dicek_keuangan", "disetujui_keuangan"].includes(statusLaporan)) {
      text = "Laporan";
      color = "#92400e";
      bg = "#fef3c7";
    } else if (suratData.statusInfo?.status === "expired") {
      text = "Selesai";
      color = "#6b7280";
      bg = "#f3f4f6";
    }

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '100px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: bg,
        color: color
      }}>
        {text}
      </span>
    );
  };

  // Badge status khusus perjadin (belum aktif / aktif / selesai presensi)
  const PerjadinStatusBadge = ({ suratData }) => {
    if (!suratData?.tanggal_mulai || !suratData?.tanggal_selesai) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(suratData.tanggal_mulai);
    start.setHours(0, 0, 0, 0);

    const end = new Date(suratData.tanggal_selesai);
    end.setHours(0, 0, 0, 0);

    const durasiHari =
      suratData.statusInfo?.durasiHari ||
      calculateDurasi(suratData.tanggal_mulai, suratData.tanggal_selesai);
    const presensiCount = Number(suratData.presensi_count || 0);
    const isCompleted = durasiHari > 0 && presensiCount >= durasiHari;

    let text = "Aktif";
    let color = "#065f46";
    let bg = "#d1fae5";

    if (isCompleted) {
      text = "Selesai";
      color = "#6b7280";
      bg = "#f3f4f6";
    } else if (today < start) {
      const daysUntilStart = Math.max(0, Math.ceil((start - today) / (1000 * 60 * 60 * 24)));
      text = `Belum aktif (${daysUntilStart} hari lagi)`;
      color = "#0369a1";
      bg = "#e0f2fe";
    } else if (today > end) {
      text = "Selesai";
      color = "#6b7280";
      bg = "#f3f4f6";
    }

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '100px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: bg,
        color: color
      }}>
        {text}
      </span>
    );
  };

  const getLaporanStatusInfo = () => null;

  const LaporanStatusBadge = ({ laporan }) => {
    const info = getLaporanStatusInfo(laporan);
    if (!info) return null;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "600",
        color: info.color,
        background: info.bg,
        border: `1px solid ${info.color}22`
      }}>
        {info.label}
      </span>
    );
  };

  // ==================== TO-DO LIST COMPONENT (REAL-TIME FIXED) ====================
  const TodoList = () => {
    const todayNow = new Date();

    if (statusHariIni.loading) {
      return (
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <FaSpinner style={{
              fontSize: '32px',
              color: '#9ca3af',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#6b7280', margin: 0 }}>Memeriksa status presensi...</p>
          </div>
        </div>
      );
    }

    if (!surat || suratStatus?.status === 'expired') {
      return (
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#f3f4f6',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '20px'
            }}>
              <FaTasks />
            </div>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 4px 0'
              }}>
                To-Do List Hari Ini
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                {todayNow.toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>

          <div style={{
            background: '#f9fafb',
            borderRadius: '20px',
            padding: '32px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#e5e7eb',
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#9ca3af',
              fontSize: '24px'
            }}>
              <FaCheckCircle />
            </div>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              Tidak Ada Tugas Aktif
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 24px 0',
              maxWidth: '280px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Semua surat tugas telah selesai. Silakan menunggu surat tugas baru dari atasan.
            </p>
            <div style={{
              background: '#f3f4f6',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#4b5563'
            }}>
              <FaBell style={{ color: '#3b82f6' }} />
              <span>Notifikasi akan muncul jika ada tugas baru</span>
            </div>
          </div>
        </div>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tanggalMulai = new Date(surat.tanggal_mulai);
    tanggalMulai.setHours(0, 0, 0, 0);
    
    const tanggalSelesai = new Date(surat.tanggal_selesai);
    tanggalSelesai.setHours(0, 0, 0, 0);

    const isTodayInRange = today >= tanggalMulai && today <= tanggalSelesai;
    const daysLeft = suratStatus?.sisaHari || 0;
    const totalHariTugas = suratStatus?.durasiHari || calculateDurasi(surat.tanggal_mulai, surat.tanggal_selesai);
    const completedHariSet = new Set(
      (Array.isArray(activePresensiTimeline) ? activePresensiTimeline : [])
        .filter((item) => {
          const fotoList = getFotoList(item);
          const hasLaporan = typeof item?.laporan === "string" && item.laporan.trim() !== "";
          return fotoList.length >= 2 && hasLaporan && item?.tanggal_presensi;
        })
        .map((item) => item.tanggal_presensi)
    );
    const completedHariTugas = completedHariSet.size;
    const progressTugasPercent = totalHariTugas > 0
      ? Math.min(Math.round((completedHariTugas / totalHariTugas) * 100), 100)
      : 0;

    return (
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#eef2ff',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
              fontSize: '20px'
            }}>
              <FaTasks />
            </div>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 4px 0'
              }}>
                To-Do List Hari Ini
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                {today.toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>
          
          <span style={{
            background: isTodayInRange ? '#d1fae5' : '#f3f4f6',
            color: isTodayInRange ? '#065f46' : '#6b7280',
            padding: '6px 16px',
            borderRadius: '100px',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            {isTodayInRange ? 'Sedang Berjalan' : 'Tidak Ada Jadwal'}
          </span>
        </div>

        {isTodayInRange ? (
          <>
            {outsideAreaWarning && (
              <div style={{
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#c2410c",
                borderRadius: "16px",
                padding: "14px 16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <FaExclamationTriangle />
                <span>{outsideAreaWarning}</span>
              </div>
            )}

            {/* Info Tugas */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {surat.nomor_surat || 'Surat Tugas'}
                </span>
                <span style={{
                  background: '#e5e7eb',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4b5563'
                }}>
                  {surat.jenis_tugas || 'Dinas'}
                </span>
              </div>

              <p style={{
                fontSize: '15px',
                fontWeight: '500',
                color: '#1f2937',
                margin: '0 0 16px 0'
              }}>
                {surat.nama_kegiatan || 'Kegiatan'}
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '14px' }} />
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>
                    {surat.daerah_tujuan || 'Lokasi tugas'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaCalendarAlt style={{ color: '#f59e0b', fontSize: '14px' }} />
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>
                    {formatDate(surat.tanggal_mulai)} - {formatDate(surat.tanggal_selesai)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaClock style={{ color: '#3b82f6', fontSize: '14px' }} />
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>
                    {daysLeft} hari tersisa
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS PRESENSI - REAL-TIME & AKURAT */}
            <div style={{
              background: statusHariIni.sudahAbsen ? '#d1fae5' : '#fee2e2',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: statusHariIni.sudahAbsen ? '#10b981' : '#ef4444'
                  }}>
                    {statusHariIni.sudahAbsen ? <FaCheck /> : <FaClock />}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '12px',
                      color: statusHariIni.sudahAbsen ? '#065f46' : '#991b1b',
                      margin: '0 0 2px 0'
                    }}>
                      Status Presensi
                    </p>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: statusHariIni.sudahAbsen ? '#065f46' : '#991b1b',
                      margin: 0
                    }}>
                      {statusHariIni.sudahAbsen ? 'Sudah melakukan presensi' : 'Belum melakukan presensi'}
                    </p>
                  </div>
                </div>
                {!statusHariIni.sudahAbsen && (
                  <a
                    href="/presensi"
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaCamera />
                    Tagging lokasi Sekarang
                  </a>
                )}
              </div>

              {/* STATUS LAPORAN - HANYA MUNCUL JIKA SUDAH ABSEN */}
              {statusHariIni.sudahAbsen && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'white',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: statusHariIni.sudahLaporan ? '#10b981' : '#f59e0b'
                      }}>
                        {statusHariIni.sudahLaporan ? <FaCheck /> : <FaPen />}
                      </div>
                      <div>
                        <p style={{
                          fontSize: '12px',
                          color: statusHariIni.sudahLaporan ? '#065f46' : '#92400e',
                          margin: '0 0 2px 0'
                        }}>
                          Laporan Kegiatan
                        </p>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: statusHariIni.sudahLaporan ? '#065f46' : '#92400e',
                          margin: 0
                        }}>
                          {statusHariIni.sudahLaporan 
                            ? 'Laporan sudah diisi' 
                            : 'Belum mengisi laporan'}
                        </p>
                      </div>
                    </div>
                    {!statusHariIni.sudahLaporan && (
                      <a
                        href="/laporan"
                        style={{
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaPen />
                        Isi Laporan
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Progress */}
            {suratStatus?.status === 'active' && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '6px'
                }}>
                  <span>Progress Tugas</span>
                  <span style={{ fontWeight: '600', color: '#4f46e5' }}>
                    {progressTugasPercent}% ({completedHariTugas}/{totalHariTugas} hari selesai)
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#e5e7eb',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressTugasPercent}%`,
                    background: '#4f46e5',
                    borderRadius: '100px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              {!statusHariIni.sudahAbsen ? (
                <a
                  href="/presensi"
                  style={{
                    flex: 1,
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaCamera />
                  Tagging Lokasi Sekarang
                </a>
              ) : !statusHariIni.sudahLaporan ? (
                <a
                  href="/presensi"
                  style={{
                    flex: 1,
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaPen />
                  Isi Laporan
                </a>
              ) : (
                <a
                  href="/laporan"
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaFileAlt />
                  Lihat Laporan
                </a>
              )}
              <button
                onClick={() => handleViewDetail(surat)}
                style={{
                  background: 'white',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <FaEye />
                Detail
              </button>
            </div>
          </>
        ) : (
          <div style={{
            background: '#f9fafb',
            borderRadius: '20px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#e5e7eb',
              borderRadius: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#9ca3af',
              fontSize: '20px'
            }}>
              <FaCalendarCheck />
            </div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 4px 0'
            }}>
              Tidak Ada Jadwal Hari Ini
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>
              Surat tugas akan dimulai pada {formatDate(surat.tanggal_mulai)}
            </p>
            <button
              onClick={() => handleViewDetail(surat)}
              style={{
                background: 'white',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <FaEye />
              Lihat Detail Tugas
            </button>
          </div>
        )}
      </div>
    );
  };
  // ==================== END TO-DO LIST REAL-TIME ====================

  const ActivePresensiSlider = () => {
    const isSuratActive = suratStatus?.status === 'active';

    if (!isSuratActive || !activePresensiTimeline.length) {
      return null;
    }

    const safeIndex = Math.min(currentPresensiSlide, Math.max(activePresensiTimeline.length - 1, 0));
    const activeItem = activePresensiTimeline[safeIndex];
    const fotoList = getFotoList(activeItem);
    const laporanText = stripHtml(activeItem?.laporan || activeItem?.kegiatan || "");

    return (
      <div style={{ marginTop: '20px', background: 'white', borderRadius: '20px', border: '1px solid #e5e7eb', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
              Presensi Harian Selama Surat Aktif
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Foto presensi tetap tampil meski laporan harian belum diisi.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCurrentPresensiSlide((prev) => Math.max(prev - 1, 0))}
              disabled={safeIndex === 0}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: safeIndex === 0 ? 0.5 : 1
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: '12px', color: '#4b5563', minWidth: '80px', textAlign: 'center' }}>
              {safeIndex + 1}/{activePresensiTimeline.length}
            </span>
            <button
              onClick={() => setCurrentPresensiSlide((prev) => Math.min(prev + 1, activePresensiTimeline.length - 1))}
              disabled={safeIndex >= activePresensiTimeline.length - 1}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: safeIndex >= activePresensiTimeline.length - 1 ? 'not-allowed' : 'pointer',
                opacity: safeIndex >= activePresensiTimeline.length - 1 ? 0.5 : 1
              }}
            >
              ›
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: '600' }}>
                Hari ke-{activeItem?.hari_ke || safeIndex + 1}
              </span>
              <span style={{ background: '#ecfeff', color: '#155e75', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: '600' }}>
                {activeItem?.tanggal_presensi ? new Date(activeItem.tanggal_presensi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
              Foto Presensi
            </div>
            {fotoList.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {fotoList.map((foto, index) => (
                  <div key={`${activeItem?.id || safeIndex}-${index}`} style={{ background: 'white', borderRadius: '14px', padding: '10px', border: '1px solid #e5e7eb' }}>
                    <img
                      src={toPublicFileUrl(foto, { legacyDir: 'uploads/presensi' })}
                      alt={`Presensi hari ${activeItem?.hari_ke || safeIndex + 1} foto ${index + 1}`}
                      style={{ width: '100%', height: '150px', objectFit: 'contain', objectPosition: 'center', background: '#f8fafc', borderRadius: '10px', display: 'block' }}
                    />
                    <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      Foto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                Belum ada foto presensi untuk hari ini.
              </div>
            )}
          </div>

          <div style={{ background: '#fff7ed', borderRadius: '16px', padding: '16px', border: '1px solid #fed7aa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#9a3412', fontWeight: '600' }}>
              Laporan Harian
              </div>
              <span style={{
                background: laporanText ? '#dcfce7' : '#fef3c7',
                color: laporanText ? '#166534' : '#92400e',
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {laporanText ? 'Sudah diisi' : 'Belum diisi'}
              </span>
            </div>
            <div style={{ color: '#7c2d12', fontSize: '14px', lineHeight: 1.7 }}>
              {laporanText || 'Belum diisi'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const selectedLaporanFile = getLaporanFile(selectedSurat);

  if (loading) {
    return (
      <PegawaiLayout>
        <div style={{
          padding: '24px',
          maxWidth: '1280px',
          margin: '0 auto',
          background: '#f9fafb',
          minHeight: '100vh'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <div>
              <h1 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 4px 0'
              }}>
                Dashboard
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Halo, {currentUser?.nama || 'Pegawai'}
              </p>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '48px',
            background: 'white',
            borderRadius: '24px'
          }}>
            <FaSpinner style={{
              fontSize: '32px',
              color: '#9ca3af',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite'
            }} />
            <h4 style={{ fontSize: '16px', color: '#4b5563', margin: 0 }}>
              Memuat data dashboard...
            </h4>
          </div>
        </div>
      </PegawaiLayout>
    );
  }

  return (
    <PegawaiLayout>
      <div style={{
        padding: '24px',
        maxWidth: '1280px',
        margin: '0 auto',
        background: '#f9fafb',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 4px 0'
            }}>
              Dashboard
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Halo, {currentUser?.nama || 'Pegawai'} BPS Provinsi Sulawesi Tengah
            </p>
          </div>
          <button
            onClick={handleRefresh}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#4b5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FaSync />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <FaExclamationTriangle style={{ color: '#dc2626' }} />
            <span style={{ color: '#991b1b', fontSize: '14px' }}>{error}</span>
            <button
              onClick={() => setError("")}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#991b1b',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              x
            </button>
          </div>
        )}

        {/* DAFTAR SURAT TUGAS */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Daftar Surat Tugas
              </h2>
              <span style={{
                background: '#e5e7eb',
                padding: '4px 10px',
                borderRadius: '100px',
                fontSize: '12px',
                color: '#4b5563'
              }}>
                {allSuratTugas.length} Surat
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <input
              type="text"
              placeholder="Cari surat tugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 2,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                fontSize: '14px',
                background: 'white'
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="semua">Semua</option>
              <option value="active">Aktif</option>
              <option value="upcoming">Akan Datang</option>
              <option value="expired">Selesai</option>
            </select>
          </div>

          {/* List Surat Tugas */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {paginatedSurat.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: '#f3f4f6',
                  borderRadius: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#9ca3af',
                  fontSize: '24px'
                }}>
                  <FaFileAlt />
                </div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 8px 0'
                }}>
                  Tidak Ada Surat Tugas
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Belum ada surat tugas yang tersedia
                </p>
              </div>
            ) : (
              paginatedSurat.map((surat) => (
                <div
                  key={surat.id}
                  style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  {/* Header Card */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {surat.nomor_surat || 'No. Surat'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <StatusBadge suratData={surat} />
                      <LaporanStatusBadge laporan={surat.laporan} />
                      <PerjadinStatusBadge suratData={surat} />
                    </div>
                  </div>

                  {/* Nama Kegiatan */}
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#1f2937',
                    margin: '0 0 16px 0'
                  }}>
                    {surat.nama_kegiatan || 'Kegiatan'}
                  </p>

                  {/* Info Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Daerah Tujuan
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {surat.daerah_tujuan || '-'}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Tanggal
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {formatDate(surat.tanggal_mulai)}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Durasi
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {surat.statusInfo?.durasiHari || calculateDurasi(surat.tanggal_mulai, surat.tanggal_selesai)} hari
                      </span>
                    </div>
                    <div>
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Jenis
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {surat.jenis_tugas || 'Dinas'}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '16px'
                  }}>
                    <button
                      onClick={() => handleViewDetail(surat)}
                      style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: '#4b5563',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaEye />
                      Detail
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredSuratTugas.length > itemsPerPage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#4b5563',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#4b5563',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
               Next
              </button>
            </div>
          )}
        </div>

        {/* TO-DO LIST - REAL-TIME */}
        <TodoList />
        <ActivePresensiSlider />

        {/* QUICK ACTIONS */}
        <div style={{
          marginTop: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            Aksi Cepat
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            <a
              href="/presensi"
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                textDecoration: 'none',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                background: '#eef2ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: '#4f46e5'
              }}>
                <FaCamera />
              </div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 2px 0'
              }}>
                Tagging Lokasi
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: 0
              }}>
                Catat kehadiran
              </p>
            </a>

            <a
              href="/laporan"
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                textDecoration: 'none',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                background: '#d1fae5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: '#059669'
              }}>
                <FaPen />
              </div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 2px 0'
              }}>
                Laporan
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: 0
              }}>
                Buat laporan
              </p>
            </a>

            <a
              href="/informasi-aplikasi"
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                textDecoration: 'none',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                background: '#ff7b00',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: '#fffefc'
              }}>
                <FaInfoCircle />
              </div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 2px 0'
              }}>
                Informasi Aplikasi
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: 0
              }}>
                Panduan & info terkini
              </p>
            </a>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL SURAT TUGAS */}
      {showDetailModal && selectedSurat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={handleCloseModal}>
          <div style={{
            background: 'white',
            width: '100%',
            maxWidth: '600px',
            borderRadius: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'white',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px'
            }}>
              <h5 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaFileAlt style={{ color: '#4f46e5' }} />
                Detail Surat Tugas
              </h5>
              <button
                onClick={handleCloseModal}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  fontSize: '20px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                x
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '24px' }}>
              {/* Nomor Surat dan Status */}
              <div style={{ 
                marginBottom: '20px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '16px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    NOMOR SURAT
                  </span>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0 0 8px 0'
                  }}>
                    {selectedSurat.nomor_surat || 'Tidak tersedia'}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <StatusBadge suratData={selectedSurat} />
                  <LaporanStatusBadge laporan={selectedSurat.laporan} />
                </div>
              </div>

              {/* Informasi Kegiatan */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <p style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 16px 0',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {selectedSurat.nama_kegiatan || 'Kegiatan tidak tersedia'}
                </p>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Daerah Tujuan */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#fee2e2', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444',
                      fontSize: '14px'
                    }}>
                      <FaMapMarkerAlt />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Daerah Tujuan
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.daerah_tujuan || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Tanggal */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#fef3c7', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f59e0b',
                      fontSize: '14px'
                    }}>
                      <FaCalendarAlt />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Tanggal Mulai - Selesai
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {formatDateFull(selectedSurat.tanggal_mulai)} - {formatDateFull(selectedSurat.tanggal_selesai)}
                      </span>
                    </div>
                  </div>

                  {/* Durasi */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#dbeafe', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6',
                      fontSize: '14px'
                    }}>
                      <FaClock />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Durasi
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.statusInfo?.durasiHari || calculateDurasi(selectedSurat.tanggal_mulai, selectedSurat.tanggal_selesai)} hari
                      </span>
                    </div>
                  </div>

                  {/* Pembebanan Biaya */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#d1fae5', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      fontSize: '14px'
                    }}>
                      <FaMoneyBillWave />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Pembebanan Biaya
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.pembebanan_biaya || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Tujuan Kegiatan */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#f3e8ff', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8b5cf6',
                      fontSize: '14px'
                    }}>
                      <FaBullseye />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Tujuan Kegiatan
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.tujuan_kegiatan || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Riwayat Tugas */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <h6 style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  Riwayat Tugas
                </h6>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Laporan Dikirim</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                      {selectedSurat.laporan?.tanggal_kirim
                        ? formatDateFull(selectedSurat.laporan.tanggal_kirim)
                        : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Acc Keuangan</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                      {selectedSurat.laporan?.tanggal_verifikasi_keuangan
                        ? formatDateFull(selectedSurat.laporan.tanggal_verifikasi_keuangan)
                        : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Laporan PDF (TTD)</span>
                    {selectedSurat.laporan?.file_pdf_signed ? (
                      <button
                        onClick={() => handleViewLaporanPDF(selectedSurat.laporan.file_pdf_signed)}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Lihat
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum ada</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Tanggal TTD Atasan</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                      {selectedSurat.laporan?.tanggal_ttd
                        ? formatDateFull(selectedSurat.laporan.tanggal_ttd)
                        : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Bukti Pencairan Dana</span>
                    {selectedSurat.laporan?.bukti_transfer ? (
                      <button
                        onClick={() =>
                          window.open(
                            toPublicFileUrl(selectedSurat.laporan.bukti_transfer, { legacyDir: "uploads/bukti-transfer" }),
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        style={{
                          background: '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Lihat
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum ada</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Tanggal Pencairan</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                      {selectedSurat.laporan?.tanggal_transfer
                        ? formatDateFull(selectedSurat.laporan.tanggal_transfer)
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginTop: '16px' }}>
                  <h6 style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    Timeline Proses
                  </h6>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Laporan Dikirim', date: selectedSurat.laporan?.tanggal_kirim },
                      { label: 'Acc Keuangan', date: selectedSurat.laporan?.tanggal_verifikasi_keuangan },
                      { label: 'Ditandatangani Atasan', date: selectedSurat.laporan?.tanggal_ttd },
                      { label: 'Pencairan Dana', date: selectedSurat.laporan?.tanggal_transfer },
                    ].map((item, idx) => (
                      <div key={`${item.label}-${idx}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '999px',
                          background: item.date ? '#10b981' : '#e5e7eb'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                          <span style={{ fontSize: '12px', color: '#1f2937', fontWeight: 500 }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: '12px', color: item.date ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
                            {item.date ? formatDateFull(item.date) : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Surat */}
              {selectedSurat.file_surat && (
                <button
                  onClick={() => handleDownloadFile(selectedSurat.file_surat)}
                  style={{
                    width: '100%',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    padding: '14px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                >
                  <FaCloudDownloadAlt style={{ color: '#4f46e5' }} />
                  Download Surat Tugas
                </button>
              )}

              {/* Informasi Pegawai */}
              {selectedSurat.user && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '16px',
                  padding: '20px'
                }}>
                  <h6 style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FaUserCheck style={{ color: '#4f46e5' }} />
                    Informasi Pegawai
                  </h6>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Nama
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.user.nama || '-'}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        NIP
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.user.nip || '-'}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        display: 'block',
                        marginBottom: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Unit Kerja
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {selectedSurat.user.unit_kerja || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal - DIPERBAIKI */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              background: '#f9fafb',
              borderBottomLeftRadius: '24px',
              borderBottomRightRadius: '24px'
            }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4b5563',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
              
              {/* Jika ada file laporan, tampilkan tombol Lihat Laporan yang membuka PDF */}
              {selectedLaporanFile ? (
                <button
                  onClick={() => handleViewLaporanPDF(selectedLaporanFile)}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaFileAlt />
                  Lihat Laporan
                </button>
              ) : selectedSurat.statusInfo?.status === 'expired' ? (
                /* Jika tidak ada file laporan, arahkan ke halaman laporan */
                <button
                  onClick={() => window.location.href = '/laporan'}
                  style={{
                    flex: 1,
                    background: '#6b7280',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaFileAlt />
                  Lihat Laporan
                </button>
              ) : (
                /* Jika surat BELUM selesai (masih active atau upcoming) */
                <button
                  onClick={() => handleLaporanClick(selectedSurat)}
                  style={{
                    flex: 1,
                    background: !statusHariIni.sudahAbsen ? '#ef4444' : '#f59e0b',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {!statusHariIni.sudahAbsen ? (
                    <>
                      <FaCamera />
                      Tagging Lokasi Dulu
                    </>
                  ) : (
                    <>
                      <FaPen />
                      Buat Laporan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PegawaiLayout>
  );
};

export default DashboardPegawai;

