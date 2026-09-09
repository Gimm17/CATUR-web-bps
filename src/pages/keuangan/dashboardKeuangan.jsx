import { useEffect, useState, useRef } from "react";
import { 
  getLaporanKeuangan, 
  cairkanDana, 
  kembalikanLaporan, 
  teruskanKeAtasan,
  getBuktiNotaKeuangan,
  exportLaporanKeuanganExcel,
  exportLaporanKeuanganPdf
} from "../../services/keuangan.service";

import "../../css/keuangan.css";
import KeuanganLayout from "../../layouts/KeuanganLayout";
import { toPublicFileUrl } from "../../utils/fileUrl";
import { confirmAction, promptInput, showToast } from "../../utils/alerts";
import RichTextRenderer from "../pegawai/RichTextRenderer";

export default function KeuanganLaporan() {
  // STATE UTAMA
  const [laporan, setLaporan] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modalType, setModalType] = useState(""); // 'detail', 'cairkan', 'kembalikan'
  const [form, setForm] = useState({
    nominal_dana: "",
    bukti_transfer: null,
    catatan: "",
    tanggal_transfer: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [exportingType, setExportingType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [buktiNota, setBuktiNota] = useState([]);
  const [loadingBuktiNota, setLoadingBuktiNota] = useState(false);

  // STATE UNTUK DASHBOARD
  const [activeTab, setActiveTab] = useState("semua");
  const [searchTerm, setSearchTerm] = useState("");

  // REF untuk file input
  const fileInputRef = useRef(null);

  // LOAD DATA
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getLaporanKeuangan();
      console.log("Data laporan:", data);
      setLaporan(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error load data:", err);
      alert("Gagal load laporan: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // FUNGSI UTAMA
const handleCairkan = async () => {
  if (!selected) return;
  
  if (!form.bukti_transfer) {
    alert("Harap pilih file bukti transfer");
    return;
  }
  
  try {
    setUploading(true);
    setUploadProgress(0);
    
    // Buat FormData
    const formData = new FormData();
    formData.append('bukti_transfer', form.bukti_transfer);
    formData.append('tanggal_transfer', form.tanggal_transfer);
    formData.append('catatan', form.catatan || "Dana berhasil dicairkan");
    
    console.log("Mengirim file:", form.bukti_transfer.name);
    console.log("Ukuran file:", form.bukti_transfer.size, "bytes");
    
    const result = await cairkanDana(selected.id, formData);
    
    console.log("Hasil pencairan:", result);
    
    showToast(
      result?.message || "Dana sudah berhasil diturunkan. Mohon informasikan pegawai agar mengecek rekeningnya masing-masing.",
      { icon: "success" }
    );
    
    handleCloseModal();
    loadData();
    setUploadProgress(0);
    
  } catch (err) {
    console.error("Error cairkan dana:", err);
    showToast("Gagal mencairkan dana: " + err.message, { icon: "error" });
    setUploadProgress(0);
  } finally {
    setUploading(false);
  }
};

  const handleTeruskan = async (id) => {
    const confirmed = await confirmAction("Setujui dan teruskan ke atasan?", {
      title: "Teruskan ke Atasan",
      confirmText: "Setujui",
      cancelText: "Batal",
      icon: "question"
    });
    if (!confirmed) return;
    
    try {
      const nominalInput = await promptInput("Masukkan nominal dana yang disetujui:", {
        title: "Nominal Dana",
        input: "number",
        inputAttributes: { min: 0, step: 1 },
        confirmText: "Lanjut"
      });
      if (nominalInput === null) return;
      if (!nominalInput || isNaN(nominalInput)) {
        alert("Nominal tidak valid");
        return;
      }

      const catatanInput = await promptInput("Berikan catatan (opsional):", {
        title: "Catatan",
        input: "text",
        defaultValue: "Disetujui keuangan",
        confirmText: "Simpan"
      });
      if (catatanInput === null) return;
      
      await teruskanKeAtasan(id, { 
        nominal_dana: parseInt(nominalInput, 10),
        catatan: catatanInput || "Disetujui keuangan"
      });
      
      showToast("Laporan berhasil disetujui dan diteruskan ke atasan", { icon: "success" });
      loadData();
    } catch (err) {
      console.error("Error teruskan ke atasan:", err);
      showToast("Gagal meneruskan: " + (err.response?.data?.message || err.message), { icon: "error" });
    }
  };

  const handleKembalikan = async () => {
    if (!selected) return;
    
    if (!form.catatan || !form.catatan.trim()) {
      alert("Harap berikan catatan perbaikan");
      return;
    }
    
    try {
      console.log("Mengirim catatan:", form.catatan.trim());
      await kembalikanLaporan(selected.id, form.catatan.trim());
      
      showToast("Laporan berhasil dikembalikan ke pegawai", { icon: "success" });
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error("Error kembalikan laporan:", err);
      showToast("Gagal mengembalikan: " + (err.response?.data?.message || err.message), { icon: "error" });
    }
  };

  const handleOpenModal = (item, type) => {
    setSelected(item);
    setModalType(type);
    if (type === "detail") {
      loadBuktiNota(item?.id);
    }
    
    if (type === "cairkan") {
      setForm({ 
        nominal_dana: item.nominal_dana || "",
        bukti_transfer: null,
        catatan: "",
        tanggal_transfer: new Date().toISOString().split('T')[0]
      });
    } else {
      setForm({ 
        nominal_dana: "",
        bukti_transfer: null,
        catatan: "",
        tanggal_transfer: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleCloseModal = () => {
    setSelected(null);
    setModalType("");
    setBuktiNota([]);
    setForm({ 
      nominal_dana: "", 
      bukti_transfer: null, 
      catatan: "",
      tanggal_transfer: new Date().toISOString().split('T')[0]
    });
  };

  // Fungsi untuk memilih file - VERSI BARU
  const handleFileSelect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.target.files[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      setForm(prev => ({ ...prev, bukti_transfer: file }));
    }
  };

  // Fungsi untuk trigger file input - VERSI BARU
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const loadBuktiNota = async (laporanId) => {
    if (!laporanId) {
      setBuktiNota([]);
      return;
    }
    try {
      setLoadingBuktiNota(true);
      const res = await getBuktiNotaKeuangan(laporanId);
      setBuktiNota(Array.isArray(res?.bukti_pembayaran) ? res.bukti_pembayaran : []);
    } catch (err) {
      console.error("Error load bukti nota:", err);
      setBuktiNota([]);
    } finally {
      setLoadingBuktiNota(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleExport = async (type) => {
    try {
      setExportingType(type);
      const params = {
        tab: activeTab,
        search: searchTerm || ""
      };
      const blob = type === "excel"
        ? await exportLaporanKeuanganExcel(params)
        : await exportLaporanKeuanganPdf(params);

      const dateLabel = new Date().toISOString().slice(0, 10);
      downloadBlob(
        blob,
        type === "excel"
          ? `laporan-keuangan-${dateLabel}.xls`
          : `laporan-keuangan-${dateLabel}.pdf`
      );
      showToast(
        type === "excel" ? "Export Excel berhasil" : "Export PDF berhasil",
        { icon: "success" }
      );
    } catch (err) {
      console.error(`Error export ${type}:`, err);
      showToast(
        `Gagal export ${type === "excel" ? "Excel" : "PDF"}: ${err.response?.data?.message || err.message}`,
        { icon: "error" }
      );
    } finally {
      setExportingType("");
    }
  };

  // STATUS PERBAIKAN UNTUK TABEL KEUANGAN
  const getPerbaikanStatus = (item) => {
    if (!item || item.status !== 'dikirim') return null;

    if (item.catatan_keuangan && item.catatan_keuangan.trim()) {
      return 'perlu_perbaikan';
    }

    if (item.tanggal_verifikasi_keuangan) {
      return 'sudah_diperbaiki';
    }

    return null;
  };

  const getPerbaikanBadge = (item) => {
    const status = getPerbaikanStatus(item);
    if (!status) return <span className="se-no-file">-</span>;

    if (status === 'perlu_perbaikan') {
      return (
        <span
          className="se-status-badge"
          style={{ backgroundColor: '#fff1f2', color: '#be123c' }}
        >
          🔁 Perlu Perbaikan
        </span>
      );
    }

    return (
      <span
        className="se-status-badge"
        style={{ backgroundColor: '#ecfdf3', color: '#15803d' }}
      >
        ✅ Sudah Diperbaiki
      </span>
    );
  };

  const formatTanggalPerjadin = (suratTugas) => {
    if (!suratTugas) return "-";
    const start = suratTugas.tanggal_mulai ? new Date(suratTugas.tanggal_mulai) : null;
    const end = suratTugas.tanggal_selesai ? new Date(suratTugas.tanggal_selesai) : null;
    const options = { day: "2-digit", month: "short", year: "numeric" };

    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return `${start.toLocaleDateString("id-ID", options)} - ${end.toLocaleDateString("id-ID", options)}`;
    }
    if (start && !Number.isNaN(start.getTime())) {
      return start.toLocaleDateString("id-ID", options);
    }
    return "-";
  };

  const parseTanggal = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string") {
      const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnly) {
        const year = Number(dateOnly[1]);
        const month = Number(dateOnly[2]);
        const day = Number(dateOnly[3]);
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatTanggalWaktu = (value) => {
    const date = parseTanggal(value);
    if (!date) return value || "-";
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTanggalSaja = (value) => {
    const date = parseTanggal(value);
    if (!date) return value || "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // FILTER LAPORAN BERDASARKAN TAB
  const tabFilteredLaporan = laporan.filter(item => {
    if (!item) return false;
    
    switch (activeTab) {
      case "menunggu":
        return item.status === "dikirim" || item.status === "dicek_keuangan";
      case "perbaikan":
        return getPerbaikanStatus(item) === "perlu_perbaikan";
      case "disetujui":
        return item.status === "disetujui_keuangan";
      case "ditandatangani":
        return item.status === "ditandatangani";
      case "dana_turun":
        return item.status === "dana_turun";
      default:
        return true;
    }
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLaporan = tabFilteredLaporan.filter((item) => {
    if (!normalizedSearch) return true;
    const haystack = [
      item?.user?.nama,
      item?.user?.nip,
      item?.surat_tugas?.daerah_tujuan,
      item?.surat_tugas?.nama_kegiatan,
      item?.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  // STATISTIK UNTUK DASHBOARD
  const stats = {
    total: laporan.length,
    menunggu: laporan.filter(l => 
      l && (l.status === "dikirim" || l.status === "dicek_keuangan")
    ).length,
    perbaikan: laporan.filter(l => 
      l && getPerbaikanStatus(l) === "perlu_perbaikan"
    ).length,
    disetujui: laporan.filter(l => 
      l && l.status === "disetujui_keuangan"
    ).length,
    ditandatangani: laporan.filter(l => 
      l && l.status === "ditandatangani"
    ).length,
    dana_turun: laporan.filter(l => 
      l && l.status === "dana_turun"
    ).length,
  };

  // FUNGSI UNTUK MEMBUKA PDF LAPORAN AKHIR
  const handleViewPDF = (pdfFilename) => {
    if (!pdfFilename) {
      alert("File PDF tidak tersedia");
      return;
    }
    
    const pdfUrl = toPublicFileUrl(pdfFilename, { legacyDir: "uploads/pdf" });
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // FUNGSI UNTUK MEMBUKA PDF SURAT TUGAS
  const handleViewSuratTugasPDF = (pdfFilename) => {
    if (!pdfFilename) {
      alert("File surat tugas tidak tersedia");
      return;
    }
    
    const pdfUrl = toPublicFileUrl(pdfFilename);
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };


// FUNGSI UNTUK MEMBUKA BUKTI TRANSFER - SESUAI STRUKTUR DATA ANDA
const handleViewBuktiTransfer = (buktiTransfer) => {
  if (!buktiTransfer) {
    alert("Bukti transfer belum tersedia");
    return;
  }
  
  console.log("Membuka bukti transfer:", buktiTransfer);
  
  if (typeof buktiTransfer !== 'string') {
    alert("Format bukti transfer tidak valid");
    return;
  }

  const fileUrl = toPublicFileUrl(buktiTransfer, { legacyDir: "uploads/bukti-transfer" });
  console.log("Membuka URL:", fileUrl);
  window.open(fileUrl, '_blank');
};

  const handleViewBuktiNota = (item) => {
    if (!item) return;
    const source = item.url || item.filename || item.file || item.path;
    if (!source) {
      alert("Bukti nota tidak tersedia");
      return;
    }
    const fileUrl = toPublicFileUrl(source, { legacyDir: "uploads/bukti-nota-pembayaran" });
    window.open(fileUrl, "_blank");
  };
  // FUNGSI UNTUK FORMAT STATUS
  const getStatusLabel = (status) => {
    const statusMap = {
      'dikirim': '📤 Dikirim Pegawai',
      'dicek_keuangan': '🔍 Dicek Keuangan',
      'disetujui_keuangan': '✅ Disetujui Keuangan',
      'ditandatangani': '📝 Ditandatangani Atasan',
      'pencairan_dana': '⏳ Pencairan Dana',
      'dana_turun': '💰 Dana Turun'
    };
    return statusMap[status] || status;
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

  const getStatusLaporanStyle = (status) => {
    const normalized = normalizeStatusLaporan(status);
    const styles = {
      draft: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
      dikirim: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
      dicek_keuangan: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
      completed: { bg: "#dcfce7", text: "#166534", border: "#86efac" }
    };
    const palette = styles[normalized] || { bg: "#f1f5f9", text: "#0f172a", border: "#e2e8f0" };
    return {
      backgroundColor: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.border}`
    };
  };

  // FUNGSI UNTUK WARNA STATUS
  const getStatusColor = (status) => {
    const colorMap = {
      'dikirim': 'blue',
      'dicek_keuangan': 'orange',
      'disetujui_keuangan': 'green',
      'ditandatangani': 'purple',
      'pencairan_dana': 'yellow',
      'dana_turun': 'teal'
    };
    return colorMap[status] || 'gray';
  };

  // FUNGSI UNTUK TOMBOL AKSI BERDASARKAN STATUS
  const getActionButtons = (item) => {
    if (!item) return null;

    switch(item.status) {
      case 'dikirim':
      case 'dicek_keuangan':
        return (
          <>
            <button 
              className="se-action-btn se-btn-approve"
              onClick={() => handleTeruskan(item.id)}
            >
              <span className="se-btn-icon">✅</span> Setujui
            </button>
            <button 
              className="se-action-btn se-btn-return"
              onClick={() => handleOpenModal(item, "kembalikan")}
            >
              <span className="se-btn-icon">↩️</span> Kembalikan
            </button>
          </>
        );
      
      case 'disetujui_keuangan':
        return (
          <button className="se-action-btn se-btn-info" disabled>
            <span className="se-btn-icon">📋</span> Menunggu Atasan
          </button>
        );
      
      case 'ditandatangani':
        return (
          <button 
            className="se-action-btn se-btn-cairkan"
            onClick={() => handleOpenModal(item, "cairkan")}
          >
            <span className="se-btn-icon">💰</span> Cairkan Dana
          </button>
        );
      
      case 'dana_turun':
        return (
          <>
            <button 
              className="se-action-btn se-btn-view"
              onClick={() => handleViewBuktiTransfer(item.bukti_transfer || item.bukti_transfer_file_name)}
            >
              <span className="se-btn-icon">👁️</span> Lihat Bukti
            </button>
            <button className="se-action-btn se-btn-success" disabled>
              <span className="se-btn-icon">✔️</span> Selesai
            </button>
          </>
        );
      
      default:
        return null;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <KeuanganLayout>
      <div className="se-container">
        {/* HEADER */}
        <div className="se-header-card">
          <div className="se-header-content">
            <div className="se-badge">
              <span className="se-badge-icon">💰</span>
              SELAMAT DATANG DI HALAMAN KEUANGAN
            </div>
            <h1 className="se-title">Dashboard Pengelolaan Dana Perjalanan Dinas</h1>
            <p className="se-subtitle">Verifikasi, Persetujuan, dan Pencairan Laporan</p>
          </div>
          <div className="se-header-graphic">
            <div className="se-graphic-icon">📊</div>
          </div>
        </div>

        {/* DASHBOARD STATISTIK */}
        <div className="se-dashboard-stats">
          <div className="se-stat-card" onClick={() => setActiveTab("semua")}>
            <div className="se-stat-icon se-stat-icon-total">📈</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.total}</h3>
              <p className="se-stat-label">Total Laporan</p>
            </div>
          </div>

          <div className="se-stat-card se-stat-warning" onClick={() => setActiveTab("menunggu")}>
            <div className="se-stat-icon">⏳</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.menunggu}</h3>
              <p className="se-stat-label">Menunggu Verifikasi</p>
            </div>
            {stats.menunggu > 0 && <div className="se-stat-badge">PRIORITAS</div>}
          </div>

          <div className="se-stat-card se-stat-danger" onClick={() => setActiveTab("perbaikan")}>
            <div className="se-stat-icon">🔁</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.perbaikan}</h3>
              <p className="se-stat-label">Perlu Perbaikan</p>
            </div>
            {stats.perbaikan > 0 && <div className="se-stat-badge">REVISI</div>}
          </div>

          <div className="se-stat-card se-stat-success" onClick={() => setActiveTab("disetujui")}>
            <div className="se-stat-icon">✅</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.disetujui}</h3>
              <p className="se-stat-label">Disetujui Keuangan</p>
            </div>
          </div>

          <div className="se-stat-card se-stat-info" onClick={() => setActiveTab("ditandatangani")}>
            <div className="se-stat-icon">📝</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.ditandatangani}</h3>
              <p className="se-stat-label">Siap Dicairkan</p>
            </div>
          </div>

          <div className="se-stat-card se-stat-processed" onClick={() => setActiveTab("dana_turun")}>
            <div className="se-stat-icon">💰</div>
            <div className="se-stat-content">
              <h3 className="se-stat-number">{stats.dana_turun}</h3>
              <p className="se-stat-label">Dana Turun</p>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="se-tab-navigation">
          <button 
            className={`se-tab ${activeTab === "semua" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("semua")}
          >
            Semua Laporan
          </button>
          <button 
            className={`se-tab ${activeTab === "menunggu" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("menunggu")}
          >
            ⏳ Menunggu ({stats.menunggu})
          </button>
          <button 
            className={`se-tab ${activeTab === "perbaikan" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("perbaikan")}
          >
            🔁 Perlu Perbaikan ({stats.perbaikan})
          </button>
          <button 
            className={`se-tab ${activeTab === "disetujui" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("disetujui")}
          >
            ✅ Disetujui ({stats.disetujui})
          </button>
          <button 
            className={`se-tab ${activeTab === "ditandatangani" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("ditandatangani")}
          >
            📝 Siap Cairkan ({stats.ditandatangani})
          </button>
          <button 
            className={`se-tab ${activeTab === "dana_turun" ? "se-tab-active" : ""}`}
            onClick={() => setActiveTab("dana_turun")}
          >
            💰 Dana Turun ({stats.dana_turun})
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="se-main-card">
          <div className="se-card-header">
            <div>
              <h2 className="se-card-title">
                <span className="se-title-icon">📑</span>
                {activeTab === "menunggu" ? "Laporan Menunggu Verifikasi" :
                 activeTab === "perbaikan" ? "Laporan Perlu Perbaikan" :
                 activeTab === "disetujui" ? "Laporan Disetujui Keuangan" :
                 activeTab === "ditandatangani" ? "Laporan Siap Dicairkan" :
                 activeTab === "dana_turun" ? "Laporan Dana Telah Turun" :
                 "Semua Laporan Perjalanan"}
              </h2>
              <p className="se-card-subtitle">
                Menampilkan {filteredLaporan.length} dari {stats.total} laporan
                {loading && " - Memuat..."}
              </p>
            </div>
            <div className="se-card-actions">
              <div className="se-search">
                <input
                  type="text"
                  className="se-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari pegawai, NIP, lokasi, kegiatan..."
                />
                {searchTerm ? (
                  <button className="se-search-clear" type="button" onClick={() => setSearchTerm("")}>
                    ×
                  </button>
                ) : null}
              </div>
              <button
                className="se-refresh-btn"
                onClick={() => handleExport("excel")}
                disabled={loading || exportingType !== ""}
                type="button"
              >
                <span className="se-btn-icon">📊</span> {exportingType === "excel" ? "Export..." : "Excel"}
              </button>
              <button
                className="se-refresh-btn"
                onClick={() => handleExport("pdf")}
                disabled={loading || exportingType !== ""}
                type="button"
              >
                <span className="se-btn-icon">📄</span> {exportingType === "pdf" ? "Export..." : "PDF"}
              </button>
              <button className="se-refresh-btn" onClick={loadData} disabled={loading}>
                <span className="se-btn-icon">🔄</span> {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* TABEL LAPORAN */}
          {loading ? (
            <div className="se-loading-state">
              <div className="se-loading-spinner"></div>
              <p>Memuat data laporan...</p>
            </div>
          ) : filteredLaporan.length === 0 ? (
            <div className="se-empty-state">
              <div className="se-empty-icon">
                {activeTab === "menunggu" ? "📭" :
                 activeTab === "perbaikan" ? "🔁" :
                 activeTab === "disetujui" ? "✅" :
                 activeTab === "ditandatangani" ? "💰" : "📊"}
              </div>
              <h3 className="se-empty-title">
                {activeTab === "menunggu" ? "Tidak Ada Laporan Menunggu" :
                 activeTab === "perbaikan" ? "Tidak Ada Laporan Perlu Perbaikan" :
                 activeTab === "disetujui" ? "Tidak Ada Laporan Disetujui" :
                 activeTab === "ditandatangani" ? "Belum Ada Laporan Siap Dicairkan" :
                 activeTab === "dana_turun" ? "Belum Ada Dana Yang Diturunkan" :
                 "Belum Ada Laporan"}
              </h3>
              <p className="se-empty-desc">
                {activeTab === "menunggu" ? 
                  "Semua laporan telah diproses" :
                  "Tidak ada data yang sesuai dengan filter"}
              </p>
            </div>
          ) : (
            <div className="se-table-container">
              <table className="se-table">
                <thead>
                  <tr>
                    <th className="se-th">No</th>
                    <th className="se-th">Pegawai</th>
                    <th className="se-th">Kegiatan</th>
                    <th className="se-th">Lokasi</th>
                    <th className="se-th">Tanggal Perjadin</th>
                    <th className="se-th">Dokumen</th>
                    <th className="se-th">Status Laporan</th>
                    <th className="se-th">Status Pencairan</th>
                    <th className="se-th">Perbaikan</th>
                    <th className="se-th">Nominal</th>
                    <th className="se-th">Bukti Transfer</th>
                    <th className="se-th">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLaporan.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`se-tr ${
                        getPerbaikanStatus(item) === "perlu_perbaikan"
                          ? "se-tr-perbaikan"
                          : getPerbaikanStatus(item) === "sudah_diperbaiki"
                          ? "se-tr-diperbaiki"
                          : ""
                      }`}
                    >
                      <td className="se-td">{index + 1}</td>
                      <td className="se-td">
                        <div className="se-user-card">
                          <div className="se-user-avatar">
                            {item.user?.nama?.charAt(0) || "P"}
                          </div>
                          <div className="se-user-info">
                            <div className="se-user-name">{item.user?.nama || "-"}</div>
                            <div className="se-user-detail">
                              NIP: {item.user?.nip || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="se-td">{item.surat_tugas?.nama_kegiatan || "-"}</td>
                      <td className="se-td">
                        {item.surat_tugas?.daerah_tujuan || "-"}
                      </td>
                      <td className="se-td">{formatTanggalPerjadin(item.surat_tugas)}</td>
                      <td className="se-td">
                        <div className="se-document-cards">
                          {item.surat_tugas?.file_surat && (
                            <button
                              className="se-btn-doc-large se-btn-doc-compact se-btn-surat-large"
                              onClick={() => handleViewSuratTugasPDF(item.surat_tugas.file_surat)}
                              title="Lihat Surat Tugas"
                            >
                              <span className="se-btn-icon">📄</span>
                              <div>
                                <strong>Surat Tugas</strong>
                                <small>Dokumen penugasan</small>
                              </div>
                            </button>
                          )}

                          {item.file_pdf && (
                            <button
                              className="se-btn-doc-large se-btn-doc-compact se-btn-laporan-large"
                              onClick={() => handleViewPDF(item.file_pdf)}
                              title="Lihat Laporan Akhir"
                            >
                              <span className="se-btn-icon">📋</span>
                              <div>
                                <strong>Laporan Akhir</strong>
                                <small>Hasil perjadin</small>
                              </div>
                            </button>
                          )}

                          {!item.surat_tugas?.file_surat && !item.file_pdf && (
                            <span className="se-no-file">Tidak ada dokumen</span>
                          )}
                        </div>
                      </td>
                      <td className="se-td">
                        <span className="se-status-badge" style={getStatusLaporanStyle(item.status)}>
                          {formatStatusLaporan(item.status)}
                        </span>
                      </td>
                      <td className="se-td">
                        <div 
                          className="se-status-badge" 
                          style={{
                            backgroundColor: getStatusColor(item.status) === 'blue' ? '#e3f2fd' :
                                           getStatusColor(item.status) === 'orange' ? '#fff3e0' :
                                           getStatusColor(item.status) === 'green' ? '#e8f5e9' :
                                           getStatusColor(item.status) === 'purple' ? '#f3e5f5' :
                                           getStatusColor(item.status) === 'yellow' ? '#fffde7' :
                                           getStatusColor(item.status) === 'teal' ? '#e0f2f1' : '#f5f5f5',
                            color: getStatusColor(item.status) === 'blue' ? '#1565c0' :
                                  getStatusColor(item.status) === 'orange' ? '#f57c00' :
                                  getStatusColor(item.status) === 'green' ? '#388e3c' :
                                  getStatusColor(item.status) === 'purple' ? '#7b1fa2' :
                                  getStatusColor(item.status) === 'yellow' ? '#f9a825' :
                                  getStatusColor(item.status) === 'teal' ? '#00796b' : '#757575',
                            border: `1px solid ${
                              getStatusColor(item.status) === 'blue' ? '#bbdefb' :
                              getStatusColor(item.status) === 'orange' ? '#ffe0b2' :
                              getStatusColor(item.status) === 'green' ? '#c8e6c9' :
                              getStatusColor(item.status) === 'purple' ? '#e1bee7' :
                              getStatusColor(item.status) === 'yellow' ? '#fff9c4' :
                              getStatusColor(item.status) === 'teal' ? '#b2dfdb' : '#e0e0e0'
                            }`
                          }}
                        >
                          {getStatusLabel(item.status)}
                        </div>
                      </td>
                      <td className="se-td">
                        {getPerbaikanBadge(item)}
                      </td>
                      <td className="se-td">
                        <div className="se-amount">
                          Rp {item.nominal_dana ? item.nominal_dana.toLocaleString('id-ID') : "0"}
                        </div>
                      </td>
                      <td className="se-td">
                        {item.bukti_transfer_file_name ? (
                          <button 
                            className="se-btn-doc-large se-btn-doc-compact se-btn-bukti-large"
                            onClick={() => handleViewBuktiTransfer(item.bukti_transfer || item.bukti_transfer_file_name)}
                            title="Lihat bukti transfer"
                          >
                            <span className="se-btn-icon">💰</span>
                            <div>
                              <strong>Bukti Transfer</strong>
                              <small>Lihat dokumen</small>
                            </div>
                          </button>
                        ) : (
                          <span className="se-no-bukti">Belum ada</span>
                        )}
                      </td>
                      <td className="se-td">
                        <div className="se-action-buttons">
                          {/* Tombol Detail */}
                          <button 
                            className="se-action-btn se-btn-detail"
                            onClick={() => handleOpenModal(item, "detail")}
                          >
                            <span className="se-btn-icon">👁️</span> Detail
                          </button>

                          {/* Tombol berdasarkan status */}
                          {getActionButtons(item)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL DETAIL */}
        {selected && modalType === "detail" && (
          <div className="se-modal-overlay" onClick={handleCloseModal}>
            <div className="se-modal se-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="se-modal-header">
                <h2 className="se-modal-title">
                  <span className="se-modal-icon">📋</span>
                  Detail Laporan Perjalanan
                </h2>
                <button className="se-modal-close" onClick={handleCloseModal}>✕</button>
              </div>
              
              <div className="se-modal-body se-modal-body--detail">
                {/* BAGIAN DOKUMEN */}
                <div className="se-document-section">
                  <h3 className="se-detail-title">📎 Dokumen Pendukung</h3>
                  <div className="se-document-buttons-row">
                    {/* Tombol Surat Tugas */}
                    {selected.surat_tugas?.file_surat && (
                      <button 
                        className="se-btn-doc-large se-btn-surat-large"
                        onClick={() => handleViewSuratTugasPDF(selected.surat_tugas.file_surat)}
                      >
                        <span className="se-btn-icon">📄</span> 
                        <div>
                          <strong>Surat Tugas</strong>
                          <small>Dokumen resmi penugasan</small>
                        </div>
                      </button>
                    )}
                    
                    {/* Tombol Laporan Akhir */}
                    {selected.file_pdf && (
                      <button 
                        className="se-btn-doc-large se-btn-laporan-large"
                        onClick={() => handleViewPDF(selected.file_pdf)}
                      >
                        <span className="se-btn-icon">📋</span>
                        <div>
                          <strong>Laporan Akhir</strong>
                          <small>Hasil perjalanan dinas</small>
                        </div>
                      </button>
                    )}
                    
                    {/* Tombol Bukti Transfer jika sudah ada */}
                    {selected.bukti_transfer_file_name && (
                      <button 
                        className="se-btn-doc-large se-btn-bukti-large"
                        onClick={() => handleViewBuktiTransfer(selected.bukti_transfer || selected.bukti_transfer_file_name)}
                      >
                        <span className="se-btn-icon">💰</span>
                        <div>
                          <strong>Bukti Transfer</strong>
                          <small>Dokumen pencairan dana</small>
                        </div>
                      </button>
                    )}
                  </div>
                  {!selected.surat_tugas?.file_surat && !selected.file_pdf && !selected.bukti_transfer_file_name && (
                    <div className="se-document-empty">Tidak ada dokumen pendukung</div>
                  )}
                </div>

                {/* INFORMASI LAPORAN */}
                <div className="se-detail-grid">
                  <div className="se-detail-section">
                    <h3 className="se-detail-title">👤 Informasi Pegawai</h3>
                    <div className="se-detail-info">
                      <div className="se-detail-row">
                        <span className="se-detail-label">Nama</span>
                        <span className="se-detail-value" style={{ fontWeight: 700 }}>
                          {selected.user?.nama || "-"}
                        </span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">NIP</span>
                        <span className="se-detail-value">{selected.user?.nip || "-"}</span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">Kegiatan</span>
                        <span className="se-detail-value">{selected.surat_tugas?.nama_kegiatan || "-"}</span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">Lokasi Dinas</span>
                        <span className="se-detail-value">{selected.surat_tugas?.daerah_tujuan || "-"}</span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">Periode</span>
                        <span className="se-detail-value">{formatTanggalPerjadin(selected.surat_tugas)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="se-detail-section">
                    <h3 className="se-detail-title">📊 Status & Keuangan</h3>
                    <div className="se-detail-info">
                      <div className="se-detail-row">
                        <span className="se-detail-label">Status Laporan</span>
                        <span className="se-status-badge" style={getStatusLaporanStyle(selected.status)}>
                          {formatStatusLaporan(selected.status)}
                        </span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">Status Pencairan</span>
                        <span
                          className="se-status-badge"
                          style={{
                            backgroundColor: getStatusColor(selected.status) === 'blue' ? '#e3f2fd' :
                                           getStatusColor(selected.status) === 'orange' ? '#fff3e0' :
                                           getStatusColor(selected.status) === 'green' ? '#e8f5e9' :
                                           getStatusColor(selected.status) === 'purple' ? '#f3e5f5' :
                                           getStatusColor(selected.status) === 'yellow' ? '#fffde7' :
                                           getStatusColor(selected.status) === 'teal' ? '#e0f2f1' : '#f5f5f5',
                            color: getStatusColor(selected.status) === 'blue' ? '#1565c0' :
                                  getStatusColor(selected.status) === 'orange' ? '#f57c00' :
                                  getStatusColor(selected.status) === 'green' ? '#388e3c' :
                                  getStatusColor(selected.status) === 'purple' ? '#7b1fa2' :
                                  getStatusColor(selected.status) === 'yellow' ? '#f9a825' :
                                  getStatusColor(selected.status) === 'teal' ? '#00796b' : '#757575'
                          }}
                        >
                          {getStatusLabel(selected.status)}
                        </span>
                      </div>
                      {selected.status === "dikirim" && (
                        <div className="se-detail-row">
                          <span className="se-detail-label">Status Perbaikan</span>
                          <span className="se-detail-value">{getPerbaikanBadge(selected)}</span>
                        </div>
                      )}
                      <div className="se-detail-row">
                        <span className="se-detail-label">Tanggal Kirim</span>
                        <span className="se-detail-value">{formatTanggalWaktu(selected.tanggal_kirim)}</span>
                      </div>
                      <div className="se-detail-row">
                        <span className="se-detail-label">Nominal Disetujui</span>
                        <span className="se-detail-value" style={{ fontWeight: 700 }}>
                          Rp {selected.nominal_dana ? selected.nominal_dana.toLocaleString('id-ID') : "0"}
                        </span>
                      </div>
                      {selected.tanggal_transfer && (
                        <div className="se-detail-row">
                          <span className="se-detail-label">Tanggal Transfer</span>
                          <span className="se-detail-value">{formatTanggalSaja(selected.tanggal_transfer)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CATATAN KEUANGAN */}
                {selected.catatan_keuangan && (
                  <div className="se-detail-section se-detail-section-full">
                    <h3 className="se-detail-title">🗒️ Catatan Keuangan</h3>
                    <div className="se-rich-box">
                      <RichTextRenderer content={selected.catatan_keuangan} />
                    </div>
                  </div>
                )}

                {/* KESIMPULAN */}
                {selected.kesimpulan && (
                  <div className="se-detail-section se-detail-section-full">
                    <h3 className="se-detail-title">📝 Kesimpulan Perjalanan</h3>
                    <div className="se-rich-box se-kesimpulan-box">
                      <RichTextRenderer content={selected.kesimpulan} />
                    </div>
                  </div>
                )}

                {/* BUKTI NOTA/PEMBAYARAN */}
                <div className="se-detail-section">
                  <h3 className="se-detail-title">🧾 Bukti Nota / Pembayaran</h3>
                  {loadingBuktiNota ? (
                    <div className="se-detail-info">
                      <span>Memuat bukti nota...</span>
                    </div>
                  ) : buktiNota.length === 0 ? (
                    <div className="se-detail-info">
                      <span className="se-no-file">Belum ada bukti nota</span>
                    </div>
                  ) : (
                    <div className="se-detail-info">
                      {buktiNota.map((item, idx) => (
                        <div key={`${item.filename || item.name || 'nota'}-${idx}`} className="se-detail-row">
                          <span>{item.name || item.originalname || item.filename || `Bukti Nota ${idx + 1}`}</span>
                          <button
                            className="se-action-btn se-btn-view"
                            onClick={() => handleViewBuktiNota(item)}
                          >
                            <span className="se-btn-icon">👁️</span> Lihat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="se-modal-footer">
                <button className="se-btn se-btn-secondary" onClick={handleCloseModal}>
                  Tutup
                </button>
                {(selected.status === "dikirim" || selected.status === "dicek_keuangan") && (
                  <div className="se-modal-actions">
                    <button 
                      className="se-btn se-btn-success"
                      onClick={() => handleTeruskan(selected.id)}
                    >
                      ✅ Setujui & Teruskan
                    </button>
                    <button 
                      className="se-btn se-btn-warning"
                      onClick={() => setModalType("kembalikan")}
                    >
                      ↩️ Kembalikan
                    </button>
                  </div>
                )}
                {selected.status === "ditandatangani" && (
                  <button 
                    className="se-btn se-btn-primary"
                    onClick={() => setModalType("cairkan")}
                  >
                    💰 Cairkan Dana
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL KEMBALIKAN */}
        {selected && modalType === "kembalikan" && (
          <div className="se-modal-overlay" onClick={handleCloseModal}>
            <div className="se-modal" onClick={(e) => e.stopPropagation()}>
              <div className="se-modal-header">
                <h2 className="se-modal-title">
                  <span className="se-modal-icon">↩️</span>
                  Kembalikan Laporan ke Pegawai
                </h2>
                <button className="se-modal-close" onClick={handleCloseModal}>✕</button>
              </div>
              
              <div className="se-modal-body">
                <div className="se-alert-box se-alert-warning">
                  <strong>Peringatan:</strong> Laporan akan dikembalikan ke pegawai untuk perbaikan.
                  Status akan kembali ke "Dikirim".
                </div>

                <div className="se-form-group">
                  <label className="se-form-label">Catatan Perbaikan *</label>
                  <textarea 
                    className="se-form-textarea"
                    placeholder="Berikan alasan mengapa laporan perlu diperbaiki. Contoh: 'Data presensi tidak lengkap', 'Kesimpulan terlalu singkat', 'Dokumen pendukung kurang', dll."
                    value={form.catatan}
                    onChange={(e) => setForm({...form, catatan: e.target.value})}
                    rows="5"
                    required
                  />
                  <div className="se-form-hint">
                    Catatan ini akan ditampilkan ke pegawai sebagai panduan perbaikan.
                  </div>
                </div>
              </div>

              <div className="se-modal-footer">
                <button className="se-btn se-btn-secondary" onClick={handleCloseModal}>
                  Batal
                </button>
                <button 
                  className="se-btn se-btn-danger"
                  onClick={handleKembalikan}
                  disabled={!form.catatan || !form.catatan.trim()}
                >
                  ↩️ Kembalikan ke Pegawai
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CAIRKAN DANA - VERSI BARU DENGAN UPLOAD YANG DIPERBAIKI */}
        {selected && modalType === "cairkan" && (
          <div className="se-modal-overlay" onClick={handleCloseModal}>
            <div className="se-modal se-modal-upload" onClick={(e) => e.stopPropagation()}>
              <div className="se-modal-header">
                <h2 className="se-modal-title">
                  <span className="se-modal-icon">💰</span>
                  Proses Pencairan Dana
                </h2>
                <button className="se-modal-close" onClick={handleCloseModal}>✕</button>
              </div>
              
              <div className="se-modal-body">
                <div className="se-cairkan-info">
                  <div className="se-info-box">
                    <div className="se-info-label">Pegawai:</div>
                    <div className="se-info-value">{selected.user?.nama}</div>
                  </div>
                  <div className="se-info-box">
                    <div className="se-info-label">Nominal:</div>
                    <div className="se-info-value se-amount-large">
                      Rp {selected.nominal_dana ? selected.nominal_dana.toLocaleString('id-ID') : "0"}
                    </div>
                  </div>
                  <div className="se-info-box">
                    <div className="se-info-label">Status:</div>
                    <div className="se-info-value">
                      <span 
                        className="se-status-badge"
                        style={{
                          backgroundColor: '#f3e5f5',
                          color: '#7b1fa2'
                        }}
                      >
                        📝 Ditandatangani Atasan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="se-form-group">
                  <label className="se-form-label">Tanggal Transfer *</label>
                  <input
                    type="date"
                    className="se-form-input"
                    value={form.tanggal_transfer}
                    onChange={(e) => setForm({...form, tanggal_transfer: e.target.value})}
                    required
                    disabled={uploading}
                  />
                </div>

                <div className="se-form-group">
                  <label className="se-form-label">Bukti Transfer *</label>
                  
                  {/* Progress Bar */}
                  {uploading && (
                    <div className="se-upload-progress">
                      <div className="se-progress-bar">
                        <div 
                          className="se-progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <div className="se-progress-text">
                        {uploadProgress < 100 ? 'Mengupload...' : 'Selesai!'}
                      </div>
                    </div>
                  )}
                  
                  {/* File Input - Tersembunyi */}
                  <input
                    type="file"
                    id="buktiTransfer"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  
                  {/* Tombol Upload yang Jelas */}
                  <div className="se-file-upload-wrapper">
                    {!form.bukti_transfer ? (
                      <button 
                        type="button"
                        className="se-btn-upload"
                        onClick={handleUploadClick}
                        disabled={uploading}
                      >
                        <span className="se-upload-icon">📎</span>
                        <span className="se-upload-text">Pilih File Bukti Transfer</span>
                        <span className="se-upload-hint">Klik untuk memilih file</span>
                      </button>
                    ) : (
                      <div className="se-file-preview">
                        <div className="se-file-info">
                          <div className="se-file-icon-large">
                            {form.bukti_transfer.type.includes('image') ? '🖼️' : 
                             form.bukti_transfer.type.includes('pdf') ? '📄' : '📎'}
                          </div>
                          <div className="se-file-details">
                            <div className="se-file-name">{form.bukti_transfer.name}</div>
                            <div className="se-file-meta">
                              <span className="se-file-size">{formatFileSize(form.bukti_transfer.size)}</span>
                              <span className="se-file-type">{form.bukti_transfer.type.split('/')[1].toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="se-file-actions">
                          <button 
                            type="button"
                            className="se-btn-change"
                            onClick={handleUploadClick}
                            disabled={uploading}
                          >
                            Ganti File
                          </button>
                          <button 
                            type="button"
                            className="se-btn-remove"
                            onClick={() => setForm({...form, bukti_transfer: null})}
                            disabled={uploading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="se-form-hint">
                    <span className="se-hint-icon">ℹ️</span>
                    Format: JPG, PNG, PDF (maks. 5MB). File akan disimpan di server.
                  </div>
                </div>

                <div className="se-form-group">
                  <label className="se-form-label">Catatan (Opsional)</label>
                  <textarea 
                    className="se-form-textarea"
                    placeholder="Contoh: 'Dana telah ditransfer ke rekening BCA 123-456-7890 a.n. [Nama Pegawai]'"
                    value={form.catatan}
                    onChange={(e) => setForm({...form, catatan: e.target.value})}
                    rows="3"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="se-modal-footer">
                <button 
                  className="se-btn se-btn-secondary" 
                  onClick={handleCloseModal}
                  disabled={uploading}
                >
                  Batal
                </button>
                <button 
                  className="se-btn se-btn-primary"
                  onClick={handleCairkan}
                  disabled={!form.bukti_transfer || uploading}
                >
                  {uploading ? (
                    <>
                      <span className="se-loading-spinner-small"></span>
                      Upload {uploadProgress}%
                    </>
                  ) : (
                    <>
                      💰 Konfirmasi Pencairan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="se-footer">
          <div className="se-footer-content">
            <div className="se-footer-logo">
              <div className="se-logo-mark">BPS</div>
              <div className="se-footer-info">
                <div className="se-footer-title">Badan Pusat Statistik</div>
                <div className="se-footer-subtitle">Sistem Pengelolaan Perjalanan Dinas - Departemen Keuangan</div>
              </div>
            </div>
            <div className="se-footer-stats">
              <div className="se-footer-stat">Total Laporan: {stats.total}</div>
              <div className="se-footer-stat">Menunggu: {stats.menunggu}</div>
              <div className="se-footer-stat">Dicairkan: {stats.dana_turun}</div>
            </div>
          </div>
        </div>
      </div>
    </KeuanganLayout>
  );
}
