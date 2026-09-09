import { useEffect, useState } from "react";
import PegawaiLayout from "../../layouts/PegawaiLayout";
import {
  getLaporanPerjalanan,
  kirimLaporanAkhir,
  uploadTTD,
  getTTD,
  uploadBuktiPembayaran,
  getBuktiPembayaran,
  resetBuktiPembayaran,
} from "../../services/laporan.service";
import { submitLaporan } from "../../services/presensiService";
import RichTextRenderer from "./RichTextRenderer";
import RichTextEditor from "./RichTextEditor";
import { toPublicFileUrl } from "../../utils/fileUrl";
import { confirmAction, showToast } from "../../utils/alerts";

// Ikon untuk UI yang lebih menarik
import {
  FaCheckCircle,
  FaClock,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFilePdf,
  FaFileWord,
  FaPaperPlane,
  FaSpinner,
  FaMoneyBillWave,
  FaSignature,
  FaFileInvoiceDollar,
  FaUserTie,
  FaCalendarCheck,
  FaReceipt,
  FaExclamationTriangle,
  FaEdit,
  FaSync,
  FaEye,
  FaDownload,
  FaFileMedical,
  FaFileSignature,
  FaExternalLinkAlt,
  FaUpload,
  FaTimes,
  FaImage,
  FaPen,
  FaCheck,
  FaSave,
} from "react-icons/fa";

const LaporanPerjalanan = () => {
  /* ================= STATE ================= */
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [kesimpulan, setKesimpulan] = useState("");
  const [loadingKirim, setLoadingKirim] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // State untuk edit laporan harian
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPresensi, setEditPresensi] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  
  // State untuk tanda tangan
  const [ttdFile, setTtdFile] = useState(null);
  const [ttdPreview, setTtdPreview] = useState(null);
  const [ttdLoading, setTtdLoading] = useState(false);
  const [showTTDModal, setShowTTDModal] = useState(false);
  const [ttdError, setTtdError] = useState("");
  const [notaFiles, setNotaFiles] = useState([]);
  const [notaLoading, setNotaLoading] = useState(false);
  const [notaError, setNotaError] = useState("");
  const [notaList, setNotaList] = useState([]);

  const getFotoList = (presensiItem) => {
    const list = Array.isArray(presensiItem?.foto_list)
      ? presensiItem.foto_list
      : (presensiItem?.foto ? [presensiItem.foto] : []);
    return list.filter(Boolean);
  };

  /* ================= FUNGSI HITUNG DURASI SURAT TUGAS ================= */
  const hitungDurasiSuratTugas = (suratTugas) => {
    if (!suratTugas?.tanggal_mulai || !suratTugas?.tanggal_selesai) {
      return 0;
    }
    
    const tglMulai = new Date(suratTugas.tanggal_mulai);
    const tglSelesai = new Date(suratTugas.tanggal_selesai);
    
    // Hitung selisih hari
    const diffTime = Math.abs(tglSelesai - tglMulai);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 karena inklusif
    
    return diffDays;
  };

  // Cek apakah presensi sudah lengkap
  const cekPresensiLengkap = (suratTugas, presensi) => {
    const durasi = hitungDurasiSuratTugas(suratTugas);
    const jumlahPresensi = presensi?.length || 0;
    const presensiList = Array.isArray(presensi) ? presensi : [];
    const jumlahPresensiFotoLengkap = presensiList.filter((item) => getFotoList(item).length >= 2).length;
    const jumlahPresensiFotoBelumLengkap = Math.max(0, jumlahPresensi - jumlahPresensiFotoLengkap);
    const isJumlahHariLengkap = durasi > 0 && jumlahPresensi >= durasi;
    
    return {
      durasi,
      jumlahPresensi,
      jumlahPresensiFotoLengkap,
      jumlahPresensiFotoBelumLengkap,
      isJumlahHariLengkap,
      isLengkap: isJumlahHariLengkap && jumlahPresensiFotoBelumLengkap === 0
    };
  };

  const canUploadNotaByStatus = (status) => {
    return ["draft", "dikirim", "dicek_keuangan"].includes(status);
  };

  /* ================= FUNGSI UNTUK TANDA TANGAN ================= */
  // Handle upload file tanda tangan
  const handleTTDChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi ukuran file (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setTtdError("Ukuran file maksimal 2MB");
      return;
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setTtdError("Hanya file JPG, JPEG, atau PNG yang diperbolehkan");
      return;
    }

    setTtdError("");
    setTtdFile(file);

    // Buat preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setTtdPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle hapus tanda tangan yang dipilih
  const handleClearTTD = () => {
    setTtdFile(null);
    setTtdPreview(null);
    setTtdError("");
    if (document.getElementById("ttdUpload")) {
      document.getElementById("ttdUpload").value = "";
    }
  };

  // Upload tanda tangan ke server
  const handleUploadTTD = async () => {
    if (!ttdFile) {
      setTtdError("Pilih file tanda tangan terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("ttd_pegawai", ttdFile);

    try {
      setTtdLoading(true);
      await uploadTTD(formData);
      
      // Refresh data setelah upload berhasil
      await fetchData();
      
      // Reset state
      handleClearTTD();
      setShowTTDModal(false);
      
      showToast("Tanda tangan berhasil diupload! Anda bisa mengirim laporan sekarang.", { icon: "success" });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Gagal mengupload tanda tangan";
      setTtdError(errorMessage);
      console.error("Error uploading TTD:", err);
    } finally {
      setTtdLoading(false);
    }
  };

  // Get tanda tangan dari server
  const fetchTTD = async () => {
    if (data?.laporan_akhir?.ttd_pegawai) {
      const url = toPublicFileUrl(data.laporan_akhir.ttd_pegawai, { legacyDir: "uploads/ttd" });
      setTtdPreview(url);
      return;
    }

    try {
      const ttdUrl = await getTTD();
      if (ttdUrl) {
        console.log('TTD loaded from server:', ttdUrl);
        setTtdPreview(ttdUrl);
      }
    } catch (err) {
      console.log("Tanda tangan belum tersedia:", err.message);
    }
  };

  /* ================= FUNGSI BUKTI NOTA/PEMBAYARAN ================= */
  const handleNotaChange = (e) => {
    if (!canUploadNotaByStatus(data?.laporan_akhir?.status)) {
      setNotaError("Upload nota dinas hanya bisa dilakukan sebelum disetujui keuangan");
      return;
    }

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
    const invalidType = files.find((file) => {
      const ext = String(file.name || "").toLowerCase();
      const matchesExt = allowedExt.some((e) => ext.endsWith(e));
      return !allowedTypes.includes(file.type) && !matchesExt;
    });
    if (invalidType) {
      setNotaError("Format file bukti hanya JPG, JPEG, PNG, atau PDF");
      return;
    }

    const invalidSize = files.find((file) => file.size > 5 * 1024 * 1024);
    if (invalidSize) {
      setNotaError("Ukuran maksimal tiap file adalah 5MB");
      return;
    }

    setNotaError("");
    setNotaFiles(files);
  };

  const handleClearNota = async () => {
    const input = document.getElementById("notaUpload");
    if (input) {
      input.value = "";
    }

    setNotaFiles([]);
    setNotaError("");

    if (!notaList.length) {
      setNotaList([]);
      return;
    }

    try {
      setNotaLoading(true);
      await resetBuktiPembayaran();
      setNotaList([]);
      showToast("Bukti nota berhasil direset.", { icon: "success" });
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Gagal reset bukti nota";
      setNotaError(message);
    } finally {
      setNotaLoading(false);
    }
  };

  const handleUploadNota = async () => {
    if (!canUploadNotaByStatus(data?.laporan_akhir?.status)) {
      setNotaError("Upload nota dinas hanya bisa dilakukan sebelum disetujui keuangan");
      return;
    }

    if (!notaFiles.length) {
      setNotaError("Pilih minimal 1 file bukti");
      return;
    }

    const formData = new FormData();
    notaFiles.forEach((file) => formData.append("bukti_pembayaran", file));

    try {
      setNotaLoading(true);
      await uploadBuktiPembayaran(formData);
      await fetchData();
      const list = await getBuktiPembayaran();
      setNotaList(list);
      const input = document.getElementById("notaUpload");
      if (input) input.value = "";
      setNotaFiles([]);
      setNotaError("");
      showToast("Bukti nota/pembayaran berhasil diupload. PDF bertanda tangan sudah diperbarui dengan lampiran nota di halaman baru.", { icon: "success" });
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Gagal upload bukti nota/pengeluaran";
      setNotaError(message);
    } finally {
      setNotaLoading(false);
    }
  };

  const handleViewBuktiNota = (item) => {
    if (!item) return;
    const source = typeof item === "string" ? item : (item.url || item.filename || "");
    if (!source) {
      alert("File bukti tidak valid");
      return;
    }
    const fileUrl = toPublicFileUrl(source, { legacyDir: "uploads/bukti-nota-pembayaran" });
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  /* ================= FUNGSI BUKTI TRANSFER ================= */
  const handleViewBuktiTransfer = (buktiTransfer) => {
    if (!buktiTransfer) {
      alert("Bukti transfer belum tersedia");
      return;
    }
    
    console.log("Membuka bukti transfer:", buktiTransfer);
    
    // Handle object
    if (buktiTransfer && typeof buktiTransfer === 'object') {
      if (buktiTransfer.bukti_transfer) {
        handleViewBuktiTransfer(buktiTransfer.bukti_transfer);
        return;
      }
    }
    if (typeof buktiTransfer !== 'string') {
      alert("Format bukti transfer tidak valid");
      return;
    }

    const fileUrl = toPublicFileUrl(buktiTransfer, { legacyDir: "uploads/bukti-transfer" });
    console.log("Membuka URL:", fileUrl);
    window.open(fileUrl, '_blank');
  };

  /* ================= FUNGSI VIEW PDF ================= */
  const handleViewPdf = (pdfUrl) => {
    if (!pdfUrl) {
      alert("Dokumen PDF belum tersedia");
      return;
    }

    const fullUrl = toPublicFileUrl(pdfUrl, { legacyDir: "uploads/pdf" });
    
    if (!fullUrl.includes('drive.google.com')) {
      fetch(fullUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            window.open(fullUrl, '_blank', 'noopener,noreferrer');
          } else {
            alert("File PDF tidak ditemukan di server.");
          }
        })
        .catch((err) => {
          console.error("Error accessing PDF:", err);
          alert("Gagal mengakses file PDF. Pastikan server berjalan.");
        });
    } else {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  /* ================= FUNGSI DOWNLOAD PDF ================= */
  const handleDownloadPdf = (pdfUrl) => {
    if (!pdfUrl) {
      alert("Dokumen PDF belum tersedia");
      return;
    }
    
    const finalUrl = toPublicFileUrl(pdfUrl, { legacyDir: "uploads/pdf" });
    
    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = `Laporan_${data?.user?.nama || 'Pegawai'}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= FUNGSI VIEW WORD ================= */
  const handleViewWord = (wordUrl) => {
    if (!wordUrl) {
      alert("Dokumen Word belum tersedia");
      return;
    }

    const fullUrl = toPublicFileUrl(wordUrl, { legacyDir: "uploads/word" });
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  /* ================= FUNGSI DOWNLOAD WORD ================= */
  const handleDownloadWord = (wordUrl) => {
    if (!wordUrl) {
      alert("Dokumen Word belum tersedia");
      return;
    }

    const finalUrl = toPublicFileUrl(wordUrl, { legacyDir: "uploads/word" });
    const ext = String(wordUrl).toLowerCase().includes(".docx") ? "docx" : "doc";

    const link = document.createElement("a");
    link.href = finalUrl;
    link.download = `Laporan_${data?.user?.nama || "Pegawai"}_${new Date().toISOString().split("T")[0]}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= FUNGSI EDIT LAPORAN HARIAN ================= */
  const handleOpenEditLaporan = (presensiItem) => {
    setEditPresensi(presensiItem || null);
    setEditContent(presensiItem?.laporan || "");
    setEditError("");
    setShowEditModal(true);
  };

  const handleCloseEditLaporan = () => {
    if (editLoading) return;
    setShowEditModal(false);
    setEditPresensi(null);
    setEditContent("");
    setEditError("");
  };

  const handleSaveEditLaporan = async () => {
    if (!editPresensi?.id) {
      setEditError("Data presensi tidak valid.");
      return;
    }

    const textContent = editContent.replace(/<[^>]*>/g, "").trim();
    if (!textContent) {
      setEditError("Laporan harian tidak boleh kosong.");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      await submitLaporan({
        laporan: editContent,
        presensi_id: editPresensi.id,
      });

      setData((prev) => {
        if (!prev) return prev;
        const nextPresensi = Array.isArray(prev.presensi)
          ? prev.presensi.map((p) =>
              p.id === editPresensi.id ? { ...p, laporan: editContent } : p
            )
          : prev.presensi;
        return { ...prev, presensi: nextPresensi };
      });

      handleCloseEditLaporan();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Gagal menyimpan laporan harian";
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await getLaporanPerjalanan();
      setData(res);
      setNotaList(Array.isArray(res?.bukti_pembayaran) ? res.bukti_pembayaran : []);
      updateActiveStage(res);
      setError("");
    } catch (err) {
      console.error("Error fetch data:", err);
      setError("Gagal memuat laporan perjalanan: " + (err.message || "Unknown error"));
    } finally {
      setRefreshing(false);
    }
  };

  const updateActiveStage = (data) => {
    if (!data) {
      setActiveStage(0);
      return;
    }
    
    const { surat_tugas = {}, presensi = [], laporan_akhir = null } = data;
    
    // Hitung kelengkapan presensi
    const {
      durasi,
      jumlahPresensi,
      jumlahPresensiFotoLengkap,
      jumlahPresensiFotoBelumLengkap,
      isLengkap,
    } = cekPresensiLengkap(surat_tugas, presensi);
    
    console.log('Debug Presensi:', { durasi, jumlahPresensi, jumlahPresensiFotoLengkap, jumlahPresensiFotoBelumLengkap, isLengkap, presensi });
    
    // STAGE 0: Belum ada presensi atau presensi belum lengkap
    if (!presensi || presensi.length === 0 || !isLengkap) {
      setActiveStage(0);
      return;
    }
    
    // STAGE 1-3: Presensi sudah lengkap, tapi laporan masih draft / belum dikirim
    if (!laporan_akhir || laporan_akhir.status === 'draft') {
      const buktiList = Array.isArray(data?.bukti_pembayaran) ? data.bukti_pembayaran : [];
      const hasBukti = buktiList.length > 0;
      const hasTtd = Boolean(laporan_akhir?.ttd_pegawai);
      if (!hasTtd) {
        setActiveStage(1);
      } else {
        setActiveStage(hasBukti ? 3 : 2);
      }
      return;
    }
    
    // CEK JIKA ADA CATATAN KEUANGAN (Dikembalikan)
    if (laporan_akhir.catatan_keuangan && laporan_akhir.status === 'dikirim') {
      setActiveStage(3);
      return;
    }
    
    switch(laporan_akhir.status) {
      case 'dikirim':
        setActiveStage(4);
        break;
      case 'dicek_keuangan':
        setActiveStage(4);
        break;
      case 'disetujui_keuangan':
        setActiveStage(5);
        break;
      case 'ditandatangani':
        setActiveStage(6);
        break;
      case 'pencairan_dana':
        setActiveStage(7);
        break;
      case 'dana_turun':
        setActiveStage(8);
        break;
      default:
        setActiveStage(1);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log("Component mounted, fetching initial data");
    fetchData();
    
    const intervalId = setInterval(() => {
      if (data?.laporan_akhir?.status === 'dikirim' || 
          data?.laporan_akhir?.status === 'dicek_keuangan') {
        fetchData();
      }
    }, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Fetch TTD saat data berubah
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (data) {
      fetchTTD();
      if (!Array.isArray(data?.bukti_pembayaran)) {
        getBuktiPembayaran().then(setNotaList).catch(() => {});
      }
    }
  }, [data]);

  /* ================= STYLES ================= */
  const theme = {
    primary: "#1A56DB",
    secondary: "#0EA5E9",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#F8FAFC",
    text: "#1E293B",
    light: "#E2E8F0",
    finance: "#8B5CF6",
    approval: "#F97316",
    signature: "#9333EA"
  };


  /* ================= MODAL TANDA TANGAN ================= */
  const TTDModal = () => {
    if (!showTTDModal) return null;

    return (
      <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header" style={{ 
              background: `linear-gradient(135deg, ${theme.signature} 0%, ${theme.primary} 100%)`,
              color: 'white'
            }}>
              <h5 className="modal-title fw-bold">
                <FaSignature className="me-2" />
                Upload Tanda Tangan Digital
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white"
                onClick={() => {
                  setShowTTDModal(false);
                  handleClearTTD();
                }}
              ></button>
            </div>
            
            <div className="modal-body">
              {/* Instruksi */}
              <div className="alert alert-info border-0 mb-4" 
                   style={{ backgroundColor: `${theme.primary}10` }}>
                <div className="d-flex">
                  <FaPen className="me-3 mt-1" style={{ color: theme.primary }} />
                  <div>
                    <strong> Petunjuk Upload Tanda Tangan:</strong>
                    <ul className="mb-0 mt-1 small">
                      <li><strong>Upload sekarang, gunakan nanti:</strong> Tanda tangan akan otomatis digunakan saat mengirim laporan</li>
                      <li><strong>File akan disimpan:</strong> Tanda tangan disimpan di server dan siap digunakan kapan saja</li>
                      <li><strong>Bisa diganti:</strong> Anda bisa upload ulang kapanpun sebelum laporan disetujui</li>
                      <li><strong>Format:</strong> JPG, JPEG, PNG  Maksimal 2MB</li>
                      <li><strong>Pastikan jelas:</strong> Tanda tangan akan muncul di bagian bawah laporan PDF</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Loading Overlay */}
              {ttdLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                     style={{ backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
                  <div className="text-center">
                    <FaSpinner className="spinner-border text-primary mb-2" size="2em" />
                    <p className="text-primary mb-0">Mengupload tanda tangan...</p>
                  </div>
                </div>
              )}

              {/* Tanda Tangan Preview */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Preview Tanda Tangan
                </label>
                
                <div className="border-2 border-dashed rounded-3 p-4 text-center"
                     style={{ 
                       borderColor: ttdPreview ? theme.success : theme.light,
                       backgroundColor: ttdPreview ? `${theme.success}05` : `${theme.background}80`,
                       minHeight: '250px',
                       position: 'relative'
                     }}>
                  {ttdPreview ? (
                    <>
                      <div className="position-relative d-inline-block">
                        <img 
                          src={ttdPreview} 
                          alt="Preview Tanda Tangan" 
                          className="img-fluid rounded shadow-sm"
                          style={{ 
                            maxHeight: '200px',
                            border: `2px solid ${theme.success}`,
                            backgroundColor: 'white',
                            padding: '10px'
                          }}
                        />
                        <button
                          className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle"
                          style={{ width: '30px', height: '30px' }}
                          onClick={handleClearTTD}
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                      <div className="mt-3">
                        <small className="text-success">
                          <FaCheck className="me-1" />
                          Tanda tangan siap diupload
                        </small>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="py-5">
                        <FaImage size={48} className="text-muted mb-3 opacity-50" />
                        <h6 className="text-muted mb-2">Belum ada tanda tangan</h6>
                        <p className="text-muted small mb-0">
                          Pilih file tanda tangan untuk melihat preview
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Input */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Pilih File Tanda Tangan <span className="text-danger">*</span>
                </label>
                
                <div className="input-group">
                  <input
                    type="file"
                    id="ttdUpload"
                    className="form-control border-2"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleTTDChange}
                    style={{ 
                      borderColor: theme.light,
                      borderRadius: '8px'
                    }}
                  />
                  <button 
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => document.getElementById('ttdUpload').click()}
                  >
                    <FaUpload className="me-2" />
                    Pilih File
                  </button>
                </div>
                
                <div className="form-text">
                  Format: JPG, JPEG, PNG  Maksimal 2MB
                </div>
                
                {ttdError && (
                  <div className="alert alert-danger border-0 mt-2 py-2">
                    <FaExclamationTriangle className="me-2" />
                    {ttdError}
                  </div>
                )}
              </div>

              {/* Info Tanda Tangan yang Sudah Ada */}
              {data?.laporan_akhir?.ttd_pegawai && !ttdPreview && (
                <div className="alert alert-warning border-0">
                  <div className="d-flex align-items-center">
                    <FaSignature className="me-3" style={{ color: theme.warning }} />
                    <div>
                      <strong>Tanda tangan sudah tersedia</strong>
                      <p className="small mb-0 mt-1">
                        Anda telah mengupload tanda tangan sebelumnya. Upload baru untuk menggantinya.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowTTDModal(false);
                  handleClearTTD();
                }}
              >
                <FaTimes className="me-2" />
                Batal
              </button>
              
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ttdFile || ttdLoading}
                onClick={handleUploadTTD}
                style={{
                  background: `linear-gradient(135deg, ${theme.signature} 0%, ${theme.primary} 100%)`,
                  border: 'none',
                  minWidth: '150px'
                }}
              >
                {ttdLoading ? (
                  <>
                    <FaSpinner className="spinner-border spinner-border-sm me-2" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <FaUpload className="me-2" />
                    Upload Tanda Tangan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // TAMPILKAN LOADING
  if (refreshing && !data) {
    return (
      <PegawaiLayout>
        <div className="d-flex justify-content-center align-items-center min-vh-50">
          <div className="text-center">
            <FaSpinner className="spinner-border" style={{ color: theme.primary }} />
            <p className="mt-3" style={{ color: theme.text }}>Memuat laporan perjalanan...</p>
          </div>
        </div>
      </PegawaiLayout>
    );
  }

  // TAMPILKAN ERROR
  if (error && !data) {
    return (
      <PegawaiLayout>
        <div className="container-fluid py-4">
          <div className="alert alert-danger border-0 shadow-sm" 
               style={{ backgroundColor: theme.danger, color: 'white' }}>
            <div className="d-flex align-items-center">
              <FaClock className="me-2" />
              <span>{error}</span>
            </div>
            <button 
              className="btn btn-sm btn-light mt-2"
              onClick={fetchData}
            >
              <FaSync className="me-2" />
              Coba Lagi
            </button>
          </div>
        </div>
      </PegawaiLayout>
    );
  }

  if (!data) {
    return (
      <PegawaiLayout>
        <div className="d-flex justify-content-center align-items-center min-vh-50">
          <div className="text-center">
            <FaSpinner className="spinner-border" style={{ color: theme.primary }} />
            <p className="mt-3" style={{ color: theme.text }}>Memuat laporan perjalanan...</p>
          </div>
        </div>
      </PegawaiLayout>
    );
  }

  // DESTRUCTURING DATA
  const { 
    surat_tugas = {}, 
    presensi = [], 
    laporan_akhir = null, 
    user = {}, 
    pembayaran = null 
  } = data;

  // Hitung kelengkapan presensi
  const {
    durasi,
    jumlahPresensi,
    jumlahPresensiFotoLengkap,
    jumlahPresensiFotoBelumLengkap,
    isLengkap,
  } = cekPresensiLengkap(surat_tugas, presensi);

  // CEK APAKAH LAPORAN DIKEMBALIKAN
  const isDikembalikan = laporan_akhir?.catatan_keuangan && 
                        (laporan_akhir?.status === 'dikirim' || 
                         laporan_akhir?.status === 'dicek_keuangan');

  // CEK JIKA ADA FILE PDF
  const hasPdfFile = laporan_akhir?.file_pdf || laporan_akhir?.file_pdf_signed;
  const pdfFile = laporan_akhir?.file_pdf_signed || laporan_akhir?.file_pdf;
  const pdfType = laporan_akhir?.file_pdf_signed ? "signed" : "draft";

  // CEK JIKA ADA FILE WORD
  const hasWordFile = Boolean(laporan_akhir?.file_word);
  const wordFile = laporan_akhir?.file_word || "";

  // CEK APAKAH TTD SUDAH ADA
  const hasTTD = ttdPreview || laporan_akhir?.ttd_pegawai;
  const buktiPembayaranList = Array.isArray(notaList)
    ? notaList
    : (Array.isArray(data?.bukti_pembayaran) ? data.bukti_pembayaran : []);
  const canUploadNota = canUploadNotaByStatus(laporan_akhir?.status);
  const hasBuktiPembayaran = buktiPembayaranList.length > 0;
  const buktiNotaStageCompleted = hasBuktiPembayaran;

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStageDateLabel = (stageId) => {
    switch (stageId) {
      case 2:
        return "Tanggal kirim";
      case 5:
        return "Tanggal verifikasi";
      case 6:
        return "Tanggal ACC";
      case 7:
        return "Tanggal TTD";
      case 8:
        return "Tanggal proses";
      case 9:
        return "Tanggal dana turun";
      default:
        return "Tanggal";
    }
  };

  const getStageDateValue = (stageId) => {
    switch (stageId) {
      case 2:
        return laporan_akhir?.tanggal_kirim || laporan_akhir?.created_at;
      case 5:
        if (laporan_akhir?.status === "dicek_keuangan") {
          return laporan_akhir?.updated_at;
        }
        return laporan_akhir?.tanggal_verifikasi_keuangan;
      case 6:
        return laporan_akhir?.tanggal_verifikasi_keuangan;
      case 7:
        return laporan_akhir?.tanggal_ttd;
      case 8:
        if (laporan_akhir?.status === "pencairan_dana") {
          return laporan_akhir?.updated_at;
        }
        return null;
      case 9:
        return pembayaran?.tanggal_transfer || laporan_akhir?.tanggal_transfer;
      default:
        return null;
    }
  };

  /* ================= TAHAPAN WORKFLOW ================= */
  const stages = [
    { 
      id: 1,
      name: "Presensi Harian", 
      icon: <FaCalendarCheck />,
      description: `Pegawai melakukan Presensi harian selama dinas (${jumlahPresensi}/${durasi} hari)`,
      completed: isLengkap,
      color: theme.primary,
      progress: `${jumlahPresensi}/${durasi}`
    },
    {
      id: 3,
      name: "Tambahkan Tanda Tangan", 
      icon: <FaSignature />,
      description: "Upload tanda tangan digital untuk laporan",
      completed: hasTTD,
      color: theme.signature,
      optional: false
    },
    {
      id: 4,
      name: "Upload Bukti Nota Dinas",
      icon: <FaReceipt />,
      description: canUploadNota
        ? "Upload bukti nota/pengeluaran jika ada, sebelum disetujui keuangan"
        : "Bukti nota bersifat opsional dan hanya bisa ditambah sebelum disetujui keuangan",
      completed: buktiNotaStageCompleted,
      color: theme.warning,
      optional: true
    },
    {
      id: 2,
      name: isDikembalikan ? "Perbaiki Laporan" : "Kirim Laporan Akhir", 
      icon: isDikembalikan ? <FaExclamationTriangle /> : <FaPaperPlane />,
      description: isDikembalikan ? "Perbaiki laporan sesuai catatan keuangan" : "Kirim laporan akhir setelah presensi lengkap dan kesimpulan siap",
      completed: laporan_akhir !== null && laporan_akhir.status !== 'draft',
      color: isDikembalikan ? theme.danger : theme.secondary,
      warning: isDikembalikan
    },
    {
      id: 5,
      name: "Pengecekan Keuangan", 
      icon: <FaFileInvoiceDollar />,
      description: "Tim keuangan memverifikasi kelengkapan dokumen",
      completed: laporan_akhir?.status === 'dicek_keuangan' || 
                laporan_akhir?.status === 'disetujui_keuangan' ||
                laporan_akhir?.status === 'ditandatangani' ||
                laporan_akhir?.status === 'pencairan_dana' ||
                laporan_akhir?.status === 'dana_turun',
      color: theme.finance
    },
    {
      id: 6,
      name: "Disetujui Keuangan", 
      icon: <FaCheckCircle />,
      description: "Laporan dinyatakan lengkap oleh keuangan",
      completed: laporan_akhir?.status === 'disetujui_keuangan' ||
                laporan_akhir?.status === 'ditandatangani' ||
                laporan_akhir?.status === 'pencairan_dana' ||
                laporan_akhir?.status === 'dana_turun',
      color: theme.success
    },
    {
      id: 7,
      name: "TTD & Persetujuan Atasan", 
      icon: <FaSignature />,
      description: "Atasan menandatangani dan menyetujui laporan",
      completed: laporan_akhir?.status === 'ditandatangani' ||
                laporan_akhir?.status === 'pencairan_dana' ||
                laporan_akhir?.status === 'dana_turun',
      color: theme.approval
    },
    {
      id: 8,
      name: "Pengajuan Pencairan Dana", 
      icon: <FaMoneyBillWave />,
      description: "Keuangan memproses pencairan dana perjalanan",
      completed: laporan_akhir?.status === 'pencairan_dana' ||
                laporan_akhir?.status === 'dana_turun',
      color: theme.finance
    },
    {
      id: 9,
      name: "Dana Diturunkan", 
      icon: <FaReceipt />,
      description: "Dana telah ditransfer dan bukti tersedia",
      completed: laporan_akhir?.status === 'dana_turun',
      color: theme.success
    }
  ];

  const requiredStages = stages.filter((stage) => !stage.optional);
  const completedSteps = requiredStages.filter((s) => s.completed).length;
  const progressPercent = requiredStages.length
    ? Math.min((completedSteps / requiredStages.length) * 100, 100)
    : 0;

  /* ================= SUBMIT LAPORAN ================= */
  const handleKirimLaporan = async () => {
    // Strip HTML tags untuk validasi panjang teks
    const textContent = kesimpulan.replace(/<[^>]*>/g, '');
    
    if (!textContent.trim()) {
      alert("Harap isi kesimpulan perjalanan");
      return;
    }

    if (textContent.length < 100) {
      alert("Kesimpulan minimal 100 karakter (tanpa format)");
      return;
    }

    // CEK PRESENSI LENGKAP
    if (!isLengkap) {
      alert(`Presensi belum lengkap! Anda baru melakukan presensi ${jumlahPresensi} dari ${durasi} hari yang diwajibkan.`);
      return;
    }

    // CEK TTD
    if (!hasTTD) {
      const userChoice = await confirmAction(
        "Anda belum mengupload tanda tangan. Upload sekarang?",
        {
          title: "Tanda Tangan Belum Ada",
          confirmText: "Upload Sekarang",
          cancelText: "Lanjut Tanpa TTD",
          icon: "warning"
        }
      );
      if (userChoice) {
        setShowTTDModal(true);
        return;
      }
    }

    try {
      setLoadingKirim(true);
      await kirimLaporanAkhir({ kesimpulan }); // Kirim dalam format HTML
      
      showToast("Laporan akhir berhasil " + (isDikembalikan ? "diperbaiki dan " : "") + "dikirim!", { icon: "success" });
      
      await fetchData();
      setKesimpulan("");
      const input = document.getElementById("notaUpload");
      if (input) input.value = "";
      setNotaFiles([]);
      setNotaError("");
      setNotaList([]);
      
      if (hasTTD) {
        console.log("Laporan dikirim dengan TTD");
      } else {
        console.log("Laporan dikirim TANPA TTD");
      }
    } catch (err) {
      console.error("Error kirim laporan:", err);
      alert(
        err?.response?.data?.message ||
          " Gagal mengirim laporan akhir. Pastikan koneksi internet stabil."
      );
    } finally {
      setLoadingKirim(false);
    }
  };

  // Fungsi untuk edit laporan jika dikembalikan
  const handleEditLaporan = () => {
    if (laporan_akhir && laporan_akhir.kesimpulan) {
      setKesimpulan(laporan_akhir.kesimpulan); // Ini sudah dalam format HTML
    }
  };

  return (
    <PegawaiLayout>
      {/* Modal Tanda Tangan */}
      <TTDModal />
      {/* Modal Edit Laporan Harian */}
      {showEditModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div
                className="modal-header"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                  color: "white",
                }}
              >
                <h5 className="modal-title fw-bold">
                  <FaEdit className="me-2" />
                  Edit Laporan Harian
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseEditLaporan}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <div className="d-flex gap-2 align-items-center text-muted small">
                    <FaCalendarAlt className="me-1" />
                    <span>{editPresensi?.tanggal_presensi || "-"}</span>
                    <span></span>
                    <span>{editPresensi?.lokasi || surat_tugas?.daerah_tujuan || "-"}</span>
                  </div>
                </div>

                <div
                  style={{
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <RichTextEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Tulis laporan harian di sini..."
                    readOnly={editLoading}
                  />
                </div>

                {editError && (
                  <div className="alert alert-danger border-0 mt-3 py-2">
                    <FaExclamationTriangle className="me-2" />
                    {editError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseEditLaporan}
                  disabled={editLoading}
                >
                  <FaTimes className="me-2" />
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEditLaporan}
                  disabled={editLoading}
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                    border: "none",
                    minWidth: "150px",
                  }}
                >
                  {editLoading ? (
                    <>
                      <FaSpinner className="spinner-border spinner-border-sm me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="container-fluid py-4">
        {/* HEADER CARD */}
        <div className="card border-0 shadow-lg mb-4" 
             style={{ 
               background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
               borderRadius: '20px'
             }}>
          <div className="card-body text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1">Laporan Perjalanan Dinas</h4>
                <p className="mb-0 opacity-75">CATUR REPORT - Tracking Progress Perjalanan</p>
              </div>
              <div className="bg-white p-3 rounded-circle">
                <FaUserTie size={32} style={{ color: theme.primary }} />
              </div>
            </div>
          </div>
        </div>

        {/* TANDA TANGAN QUICK ACTION */}
        <div className="card border-0 shadow-sm mb-4"
             style={{ 
               borderLeft: `5px solid ${hasTTD ? theme.success : theme.warning}`
             }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="bg-light p-3 rounded-circle me-3">
                  <FaSignature size={24} style={{ color: hasTTD ? theme.success : theme.warning }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">
                    {hasTTD ? "Tanda Tangan Siap Digunakan" : " Tambahkan Tanda Tangan"}
                  </h6>
                  <p className="text-muted small mb-0">
                    {hasTTD 
                      ? "Tanda tangan Anda sudah diupload dan akan otomatis dimasukkan ke laporan PDF"
                      : "Upload tanda tangan digital sebelum mengirim laporan"}
                  </p>
                </div>
              </div>
              
              <div className="d-flex gap-2">
                {hasTTD && ttdPreview && (
                  <button
                    className="btn btn-outline-success d-flex align-items-center"
                    onClick={() => {
                      setShowTTDModal(true);
                    }}
                  >
                    <FaEye className="me-2" />
                    Lihat TTD
                  </button>
                )}
                
                <button
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => setShowTTDModal(true)}
                  style={{
                    background: `linear-gradient(135deg, ${theme.signature} 0%, ${theme.primary} 100%)`,
                    border: 'none'
                  }}
                >
                  <FaSignature className="me-2" />
                  {hasTTD ? "Ganti TTD" : "Upload TTD"}
                </button>
              </div>
            </div>
            
            {hasTTD && data?.laporan_akhir?.tanggal_ttd_pegawai && (
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">
                  <FaCalendarAlt className="me-1" />
                  Diupload: {new Date(data.laporan_akhir.tanggal_ttd_pegawai).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </small>
              </div>
            )}
          </div>
        </div>

        {/* ALERT JIKA LAPORAN DIKEMBALIKAN */}
        {isDikembalikan && (
          <div className="alert alert-warning border-0 shadow-sm mb-4">
            <div className="d-flex align-items-start">
              <FaExclamationTriangle className="me-3 mt-1" size={24} />
              <div className="flex-grow-1">
                <h5 className="alert-heading fw-bold">Laporan Dikembalikan untuk Perbaikan</h5>
                <p className="mb-2">
                  <strong>Catatan dari Keuangan:</strong>
                </p>
                <div className="bg-light p-3 rounded mb-3 border-start border-3 border-warning">
                  <RichTextRenderer content={laporan_akhir.catatan_keuangan} />
                </div>
                <p className="mb-0">
                  Silakan perbaiki laporan Anda sesuai catatan di atas, kemudian kirim ulang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INFO SURAT TUGAS */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-4" style={{ color: theme.primary }}>
              <FaMapMarkerAlt className="me-2" />
              Detail Perjalanan Dinas
            </h5>
            <div className="row">
              <div className="col-md-3 mb-3">
                <div className="d-flex align-items-start">
                  <div className="bg-light p-2 rounded-circle me-3">
                    <FaUser style={{ color: theme.primary }} />
                  </div>
                  <div>
                    <small className="text-muted">Pegawai</small>
                    <p className="mb-0 fw-semibold">{user?.nama || "-"}</p>
                    <small className="text-muted">NIP: {user?.nip || '-'}</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="d-flex align-items-start">
                  <div className="bg-light p-2 rounded-circle me-3">
                    <FaMapMarkerAlt style={{ color: theme.secondary }} />
                  </div>
                  <div>
                    <small className="text-muted">Lokasi Dinas</small>
                    <p className="mb-0 fw-semibold">{surat_tugas?.daerah_tujuan || "-"}</p>
                    <small className="text-muted">Tujuan Sensus</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="d-flex align-items-start">
                  <div className="bg-light p-2 rounded-circle me-3">
                    <FaCalendarAlt style={{ color: theme.success }} />
                  </div>
                  <div>
                    <small className="text-muted">Periode</small>
                    <p className="mb-0 fw-semibold">
                      {surat_tugas?.tanggal_mulai || "-"}
                    </p>
                    <small>s/d {surat_tugas?.tanggal_selesai || "-"}</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="d-flex align-items-start">
                  <div className="bg-light p-2 rounded-circle me-3">
                    <FaCalendarCheck style={{ color: theme.success }} />
                  </div>
                  <div>
                    <small className="text-muted">Durasi Dinas</small>
                    <p className="mb-0 fw-semibold">
                      {durasi} Hari
                    </p>
                    <small className={`${isLengkap ? 'text-success' : 'text-warning'}`}>
                      {isLengkap 
                        ? 'Presensi & foto lengkap' 
                        : `Hari ${jumlahPresensi}/${durasi}, foto lengkap ${jumlahPresensiFotoLengkap}/${Math.max(jumlahPresensi, durasi || 0)}`}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW TRACKER - VERTICAL TIMELINE */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-4" style={{ color: theme.primary }}>
              <FaCheckCircle className="me-2" />
              Alur Persetujuan & Pencairan Dana
            </h5>
            
            {/* Progress Bar Summary */}
            <div className="mb-5">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">Progress: {completedSteps} dari {requiredStages.length} tahap</span>
                <span className="fw-bold" style={{ color: theme.primary }}>
                  {progressPercent.toFixed(0)}% Selesai
                </span>
              </div>
              <div className="progress" style={{ height: '10px', borderRadius: '10px' }}>
                <div
                  className="progress-bar"
                  style={{ 
                    width: `${progressPercent}%`,
                    background: isDikembalikan 
                      ? `linear-gradient(90deg, ${theme.danger}, ${theme.warning})`
                      : `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                    borderRadius: '10px',
                    transition: 'width 0.8s ease'
                  }}
                />
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="position-relative">
              {/* Timeline Line */}
              <div 
                className="position-absolute start-0 top-0 h-100 ms-3"
                style={{ 
                  width: '3px',
                  background: isDikembalikan
                    ? `linear-gradient(to bottom, ${theme.danger}, ${theme.warning})`
                    : `linear-gradient(to bottom, ${theme.primary}, ${theme.secondary})`,
                  borderRadius: '10px'
                }}
              />
              
              {/* Timeline Items */}
              {stages.map((stage, index) => (
                <div key={stage.id} className="mb-4 position-relative">
                  <div className="d-flex">
                    {/* Timeline Dot */}
                    <div className="me-4 position-relative">
                      <div 
                        className={`rounded-circle d-flex align-items-center justify-content-center ${
                          stage.completed ? 'shadow-lg' : 'border'
                        } ${stage.warning ? 'border-warning' : ''}`}
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: stage.warning ? theme.danger : 
                                        (stage.completed ? stage.color : 
                                         (stage.optional ? 'white' : 'white')),
                          borderColor: stage.warning ? theme.danger : 
                                      (stage.completed ? stage.color : 
                                       (stage.optional ? theme.signature : theme.light)),
                          borderWidth: stage.optional ? '2px dashed' : '3px solid',
                          zIndex: 2
                        }}
                      >
                        <div style={{ 
                          color: stage.warning ? 'white' : 
                                (stage.completed ? 'white' : 
                                 (stage.optional ? theme.signature : stage.color)),
                          fontSize: '1.2rem'
                        }}>
                          {stage.warning ? <FaExclamationTriangle /> : 
                           stage.completed ? <FaCheckCircle /> : stage.icon}
                        </div>
                      </div>
                      
                      {/* TTD Action Icon */}
                      {stage.id === 3 && !hasTTD && laporan_akhir && (
                        <div 
                          className="position-absolute"
                          style={{
                            top: '-10px',
                            right: '-10px',
                            zIndex: 3
                          }}
                        >
                          <button
                            onClick={() => setShowTTDModal(true)}
                            className="btn btn-sm btn-warning rounded-circle shadow-lg p-0 d-flex align-items-center justify-content-center"
                            style={{
                              width: '35px',
                              height: '35px',
                              border: '2px solid white'
                            }}
                            title="Upload Tanda Tangan"
                          >
                            <FaSignature size={16} />
                          </button>
                        </div>
                      )}

                      {/* PDF ICON di sebelah stage Kirim Laporan Akhir */}
                      {stage.id === 2 && hasPdfFile && (
                        <div 
                          className="position-absolute"
                          style={{
                            top: '-10px',
                            left: '-10px',
                            zIndex: 3
                          }}
                        >
                          <button
                            onClick={() => handleViewPdf(pdfFile)}
                            className="btn btn-sm btn-danger rounded-circle shadow-lg p-0 d-flex align-items-center justify-content-center"
                            style={{
                              width: '35px',
                              height: '35px',
                              border: '2px solid white'
                            }}
                            title={pdfType === "signed" ? "Lihat Laporan TTD" : "Lihat Draft Laporan"}
                          >
                            {pdfType === "signed" ? <FaFileSignature size={16} /> : <FaFilePdf size={16} />}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-grow-1">
                      <div className={`card border-0 ${stage.completed ? 'shadow-sm' : ''} ${stage.warning ? 'border-warning' : ''}`}
                           style={{
                             backgroundColor: stage.warning ? `${theme.warning}15` : 
                                           (stage.completed ? `${stage.color}10` : 
                                            (stage.optional ? `${theme.signature}05` : 'white')),
                             borderLeft: `4px solid ${stage.warning ? theme.danger : 
                                        (stage.completed ? stage.color : 
                                         (stage.optional ? theme.signature : theme.light))}`,
                             borderStyle: stage.optional ? 'dashed' : 'solid'
                           }}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className={`fw-bold mb-1 ${stage.warning ? 'text-danger' : 
                                            (stage.completed ? '' : 
                                             (stage.optional ? 'text-muted' : 'text-muted'))}`}>
                                {stage.name}
                                {stage.warning && " (Perlu Perbaikan)"}
                                {stage.optional && !stage.completed && " (Opsional)"}
                                
                                {/* Label PDF di samping nama stage */}
                                {stage.id === 2 && hasPdfFile && (
                                  <span className="ms-2">
                                    <FaFilePdf 
                                      className="text-danger" 
                                      style={{ verticalAlign: 'middle', fontSize: '0.8em' }}
                                    />
                                    <span className="text-muted small ms-1" style={{ fontSize: '0.8em' }}>
                                      {pdfType === "signed" ? "(TTD)" : "(Draft)"}
                                    </span>
                                  </span>
                                )}
                                
                                {/* Label TTD di samping nama stage */}
                                {stage.id === 3 && (
                                  <span className="ms-2">
                                    <FaSignature 
                                      className={stage.completed ? "text-success" : "text-warning"} 
                                      style={{ verticalAlign: 'middle', fontSize: '0.8em' }}
                                    />
                                    <span className={`small ms-1 ${stage.completed ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.8em' }}>
                                      {stage.completed ? "(Sudah Upload)" : "(Belum Upload)"}
                                    </span>
                                  </span>
                                )}
                                {stage.id === 4 && (
                                  <span className="ms-2">
                                    <FaReceipt
                                      className={stage.completed ? "text-success" : "text-warning"}
                                      style={{ verticalAlign: 'middle', fontSize: '0.8em' }}
                                    />
                                    <span className={`small ms-1 ${stage.completed ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.8em' }}>
                                      {stage.completed ? "(Sudah Upload)" : "(Belum Upload)"}
                                    </span>
                                  </span>
                                )}
                              </h6>
                              <p className="small mb-0" style={{ 
                                color: stage.warning ? theme.danger : 
                                      (stage.completed ? theme.text : 
                                       (stage.optional ? '#6c757d' : '#6c757d'))
                              }}>
                                {stage.description}
                                {[2, 5, 6, 7, 8, 9].includes(stage.id) && (
                                  <span className="d-block mt-2 text-muted">
                                    <FaCalendarAlt className="me-1" />
                                    {getStageDateLabel(stage.id)}: {formatDateTime(getStageDateValue(stage.id))}
                                  </span>
                                )}
                                {stage.id === 3 && !stage.completed && (
                                  <button
                                    onClick={() => setShowTTDModal(true)}
                                    className="btn btn-sm btn-link p-0 ms-2 text-decoration-none"
                                    style={{ color: theme.signature }}
                                  >
                                    <small>Upload sekarang</small>
                                  </button>
                                )}
                                {stage.id === 4 && !stage.completed && (
                                  <span className="small text-warning ms-2">
                                    {canUploadNota
                                      ? "Upload bukti pada form kirim laporan di bawah."
                                      : "Upload bukti hanya tersedia sebelum disetujui keuangan."}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="d-flex align-items-center">
                              {/* TTD Action Button */}
                              {stage.id === 3 && (
                                <div className="me-2">
                                  {hasTTD ? (
                                    <button
                                      onClick={() => setShowTTDModal(true)}
                                      className="btn btn-sm btn-outline-success d-flex align-items-center"
                                      title="Lihat/Ganti Tanda Tangan"
                                    >
                                      <FaEye className="me-1" />
                                      Lihat TTD
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setShowTTDModal(true)}
                                      className="btn btn-sm btn-outline-warning d-flex align-items-center"
                                      title="Upload Tanda Tangan"
                                    >
                                      <FaUpload className="me-1" />
                                      Upload
                                    </button>
                                  )}
                                </div>
                              )}
                              {stage.id === 4 && (
                                <div className="me-2">
                                  <button
                                    onClick={() => document.getElementById('notaUpload')?.focus()}
                                    className="btn btn-sm btn-outline-warning d-flex align-items-center"
                                    disabled={!canUploadNota}
                                    title="Upload Bukti Nota Dinas"
                                  >
                                    <FaUpload className="me-1" />
                                    {canUploadNota ? "Upload" : "Sudah Disetujui Keuangan"}
                                  </button>
                                </div>
                              )}
                              
                              {stage.id === 2 && hasPdfFile && (
                                <div className="me-2">
                                  <button
                                    onClick={() => handleViewPdf(pdfFile)}
                                    className="btn btn-sm btn-outline-danger d-flex align-items-center"
                                    title={pdfType === "signed" ? "Lihat Laporan TTD" : "Lihat Draft Laporan"}
                                  >
                                    <FaEye className="me-1" />
                                    Lihat
                                  </button>
                                </div>
                              )}
                              
                              {stage.warning ? (
                                <span className="badge" style={{ 
                                  backgroundColor: theme.danger, 
                                  color: 'white' 
                                }}>
                                  <FaExclamationTriangle className="me-1" />
                                  Perbaiki
                                </span>
                              ) : stage.completed ? (
                                <span className="badge" style={{ 
                                  backgroundColor: stage.color, 
                                  color: 'white' 
                                }}>
                                  Selesai
                                </span>
                              ) : stage.optional ? (
                                <span className="badge bg-light text-muted">
                                  Opsional
                                </span>
                              ) : index === activeStage ? (
                                <span className="badge bg-warning text-dark">
                                  <FaSpinner className="spinner-border spinner-border-sm me-1" />
                                  Sedang Berlangsung
                                </span>
                              ) : (
                                <span className="badge bg-light text-muted">
                                  Menunggu
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Additional Info for Specific Stages */}
                          {stage.id === 3 && hasTTD && (
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" style={{ color: theme.success }} />
                                <div>
                                  <strong>Tanda tangan sudah diupload</strong>
                                  {ttdPreview && (
                                    <div className="mt-2 d-flex align-items-center">
                                      <img 
                                        src={ttdPreview} 
                                        alt="Tanda Tangan" 
                                        className="img-fluid rounded border"
                                        style={{ 
                                          maxHeight: '40px',
                                          backgroundColor: 'white',
                                          padding: '5px'
                                        }}
                                      />
                                      <button
                                        className="btn btn-sm btn-outline-primary ms-3"
                                        onClick={() => setShowTTDModal(true)}
                                      >
                                        <FaEye className="me-1" />
                                        Lihat Detail
                                      </button>
                                    </div>
                                  )}
                                  {laporan_akhir?.tanggal_ttd_pegawai && (
                                    <p className="small mb-0 mt-1 text-muted">
                                      Diupload: {new Date(laporan_akhir.tanggal_ttd_pegawai).toLocaleDateString('id-ID')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {stage.id === 4 && buktiNotaStageCompleted && (
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" style={{ color: theme.success }} />
                                <div>
                                  <strong>Bukti nota/pembayaran sudah diupload</strong>
                                  {hasBuktiPembayaran ? (
                                    <p className="small mb-0 mt-1 text-muted">
                                      Total file: {buktiPembayaranList.length}
                                    </p>
                                  ) : (
                                    <p className="small mb-0 mt-1 text-muted">
                                      Bukti sudah digunakan saat laporan dikirim.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {stage.id === 9 && pembayaran?.status === 'dana_turun' && (
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex align-items-center">
                                <FaReceipt className="me-2" style={{ color: theme.success }} />
                                <div>
                                  <strong>Bukti Transfer Tersedia:</strong>
                                  {pembayaran?.bukti_transfer && (
                                    <button
                                      className="ms-2 btn btn-sm btn-outline-success"
                                      onClick={() => handleViewBuktiTransfer(pembayaran.bukti_transfer)}
                                    >
                                      Lihat Bukti Transfer di Google Drive
                                    </button>
                                  )}
                                  {pembayaran?.tanggal_transfer && (
                                    <p className="small mb-0 mt-1">
                                      Ditransfer pada: {pembayaran.tanggal_transfer}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABEL PRESENSI HARIAN */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: theme.primary }}>
                <FaCalendarCheck className="me-2" />
                Presensi Harian Selama Dinas
              </h5>
              
              {/* Badge Progres */}
              <span className={`badge ${isLengkap ? 'bg-success' : 'bg-warning'} p-2`}>
                {isLengkap 
                  ? <><FaCheckCircle className="me-1" /> Presensi & Foto Lengkap</>
                  : <><FaClock className="me-1" /> Hari {jumlahPresensi}/{durasi}, Foto Lengkap {jumlahPresensiFotoLengkap}/{Math.max(jumlahPresensi, durasi || 0)}</>
                }
              </span>
            </div>
            
            {(!presensi || presensi.length === 0) ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <FaCalendarCheck size={48} className="text-muted opacity-50" />
                </div>
                <h6 className="text-muted">Belum ada data Presensi</h6>
                <p className="text-muted small">
                  Lakukan Presensi harian melalui aplikasi mobile (0/{durasi} hari)
                </p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead style={{ backgroundColor: theme.background }}>
                      <tr>
                        <th style={{ color: theme.text }}>Hari Ke</th>
                        <th style={{ color: theme.text }}>Tanggal</th>
                        <th style={{ color: theme.text }}>
                          <FaMapMarkerAlt className="me-1" />
                          Daerah Tujuan
                        </th>
                        <th style={{ color: theme.text }}>Foto</th>
                        <th style={{ color: theme.text }}>Laporan Harian</th>
                        <th style={{ color: theme.text }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presensi.map((p, index) => (
                        <tr key={p.id || index}>
                          <td className="fw-bold" style={{ color: theme.primary }}>
                            Hari {index + 1}
                          </td>
                          <td className="fw-semibold">{p.tanggal_presensi || "-"}</td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {p.lokasi || surat_tugas?.daerah_tujuan || "-"}
                            </span>
                          </td>
                          <td>
                            {getFotoList(p).length ? (
                              <div>
                                <div className="d-flex flex-wrap gap-2">
                                  {getFotoList(p).map((fotoItem, fotoIndex) => (
                                    <img
                                      key={`${p.id || index}-${fotoIndex}`}
                                      src={toPublicFileUrl(fotoItem, { legacyDir: "uploads/presensi" })}
                                      alt={`Presensi ${p.tanggal_presensi} foto ${fotoIndex + 1}`}
                                      className="rounded shadow-sm"
                                      style={{ 
                                        width: '70px', 
                                        height: '70px',
                                        objectFit: 'contain',
                                        objectPosition: 'center',
                                        background: '#f8fafc'
                                      }}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://via.placeholder.com/70x70?text=No+Image";
                                      }}
                                    />
                                  ))}
                                </div>
                                <small className={`d-block mt-2 ${getFotoList(p).length >= 2 ? 'text-success' : 'text-warning'}`}>
                                  {getFotoList(p).length} foto
                                </small>
                              </div>
                            ) : (
                              <span className="text-muted small">Tidak ada foto</span>
                            )}
                          </td>
                          <td>
                            <div className="bg-light p-3 rounded" style={{ maxHeight: '150px', overflow: 'auto' }}>
                              {p.laporan ? (
                                <RichTextRenderer content={p.laporan} />
                              ) : (
                                <span className="text-muted small">Tidak ada laporan harian</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleOpenEditLaporan(p)}
                            >
                              <FaEdit className="me-1" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Informasi Kelengkapan di Bawah Tabel */}
                {!isLengkap && (
                  <div className="alert alert-warning border-0 mt-3">
                    <div className="d-flex align-items-center">
                      <FaClock className="me-3" />
                      <div>
                        <strong>Perhatian:</strong> Anda masih perlu melengkapi presensi harian.
                        {jumlahPresensi < durasi && <> Kekurangan hari presensi: {durasi - jumlahPresensi} hari.</>}
                        {jumlahPresensiFotoBelumLengkap > 0 && <> Ada {jumlahPresensiFotoBelumLengkap} hari presensi yang fotonya belum mencapai minimal 2.</>}
                        Setelah semua hari dan foto lengkap, Anda dapat mengirim laporan akhir.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* FORM LAPORAN AKHIR - Hanya muncul jika presensi lengkap */}
        {isLengkap && (!laporan_akhir || laporan_akhir.status === 'draft' || isDikembalikan) && (
          <div className="card border-0 shadow-lg mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-4" style={{ color: isDikembalikan ? theme.danger : theme.primary }}>
                <FaPaperPlane className="me-2" />
                {isDikembalikan ? "Perbaiki dan Kirim Ulang Laporan" : "Kirim Laporan Akhir Perjalanan"}
              </h5>
              
              {/* Warning untuk TTD */}
              {!hasTTD && (
                <div className="alert alert-warning border-0 mb-4" 
                     style={{ backgroundColor: `${theme.warning}15`, borderLeft: `4px solid ${theme.warning}` }}>
                  <div className="d-flex">
                    <FaSignature className="me-3 mt-1" style={{ color: theme.warning }} />
                    <div>
                      <strong>Perhatian:</strong> Anda belum mengupload tanda tangan digital. 
                      <button
                        className="btn btn-sm btn-warning ms-2"
                        onClick={() => setShowTTDModal(true)}
                      >
                        <FaUpload className="me-1" />
                        Upload Tanda Tangan
                      </button>
                      <p className="small mb-0 mt-1">
                        Tanda tangan akan muncul di laporan PDF yang dikirimkan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasBuktiPembayaran && canUploadNota && (
                <div className="alert alert-warning border-0 mb-4"
                     style={{ backgroundColor: `${theme.warning}15`, borderLeft: `4px solid ${theme.warning}` }}>
                  <div className="d-flex">
                    <FaReceipt className="me-3 mt-1" style={{ color: theme.warning }} />
                    <div>
                      <strong>Info:</strong> Anda belum mengupload bukti nota/pengeluaran perjalanan dinas.
                      <p className="small mb-0 mt-1">
                        Jika ada bukti nota, Anda bisa upload sekarang atau nanti sebelum disetujui keuangan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {!canUploadNota && (
                <div className="alert alert-info border-0 mb-4"
                     style={{ backgroundColor: `${theme.primary}15`, borderLeft: `4px solid ${theme.primary}` }}>
                  <div className="d-flex">
                    <FaReceipt className="me-3 mt-1" style={{ color: theme.primary }} />
                    <div>
                      <strong>Info:</strong> Upload bukti nota dinas bersifat opsional dan hanya bisa dilakukan sebelum disetujui keuangan.
                    </div>
                  </div>
                </div>
              )}
              
              {isDikembalikan ? (
                <div className="alert alert-danger border-0 mb-4" 
                     style={{ backgroundColor: `${theme.danger}15`, borderLeft: `4px solid ${theme.danger}` }}>
                  <div className="d-flex">
                    <FaExclamationTriangle className="me-3 mt-1" style={{ color: theme.danger }} />
                    <div>
                      <strong>Laporan Dikembalikan:</strong> Silakan perbaiki laporan sesuai catatan dari keuangan di atas.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success border-0 mb-4" 
                     style={{ backgroundColor: `${theme.success}15`, borderLeft: `4px solid ${theme.success}` }}>
                  <div className="d-flex">
                    <FaCheckCircle className="me-3 mt-1" style={{ color: theme.success }} />
                    <div>
                      <strong>Presensi Lengkap!</strong> Anda telah menyelesaikan {durasi} hari presensi.
                      Silakan kirim laporan akhir perjalanan.
                    </div>
                  </div>
                </div>
              )}
              
              {/* TOMBOL EDIT JIKA DIKEMBALIKAN */}
              {isDikembalikan && laporan_akhir?.kesimpulan && (
                <div className="mb-3">
                  <button 
                    className="btn btn-sm btn-outline-warning"
                    onClick={handleEditLaporan}
                  >
                    <FaEdit className="me-2" />
                    Tampilkan Laporan Sebelumnya
                  </button>
                  <small className="text-muted ms-2">
                    Klik untuk mengedit laporan sebelumnya
                  </small>
                </div>
              )}
              
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Kesimpulan & Hasil Perjalanan Dinas <span className="text-danger">*</span>
                </label>
                
                {/* Rich Text Editor untuk Kesimpulan */}
                <div style={{ 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <RichTextEditor
                    value={kesimpulan}
                    onChange={setKesimpulan}
                    placeholder={isDikembalikan ? 
                      "Perbaiki kesimpulan sesuai catatan dari keuangan:\n1. Perbaikan yang diminta: [sesuaikan]\n2. Tambahan informasi: [tambahkan]\n3. Revisi lainnya: [revisi]" :
                      "Tuliskan secara detail:\n1. Pencapaian selama perjalanan dinas\n2. Kendala yang dihadapi\n3. Rekomendasi untuk perjalanan berikutnya\n4. Hasil sensus/data yang berhasil dikumpulkan"
                    }
                    readOnly={loadingKirim}
                  />
                </div>
                
                <div className="form-text d-flex justify-content-between mt-2">
                  <span>Minimal 100 karakter (tanpa format)</span>
                  <span className={kesimpulan.replace(/<[^>]*>/g, '').length < 100 ? 'text-danger' : 'text-success'}>
                    {kesimpulan.replace(/<[^>]*>/g, '').length}/100 karakter
                  </span>
                </div>
              </div>

              {canUploadNota && (
                <div className="mb-4 p-3 rounded border" style={{ backgroundColor: `${theme.warning}08` }}>
                  <label className="form-label fw-semibold">
                    Bukti Nota / Pembayaran Perjalanan Dinas <span className="text-muted">(jika ada)</span>
                  </label>

                  <div className="input-group mb-2">
                    <input
                      type="file"
                      id="notaUpload"
                      className="form-control"
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                      onChange={handleNotaChange}
                      disabled={notaLoading || loadingKirim}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => document.getElementById("notaUpload")?.click()}
                      disabled={notaLoading || loadingKirim}
                    >
                      <FaUpload className="me-1" />
                      Pilih File
                    </button>
                  </div>

                  <div className="d-flex gap-2 mb-2">
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={handleUploadNota}
                      disabled={notaLoading || loadingKirim || notaFiles.length === 0}
                    >
                      {notaLoading ? (
                        <>
                          <FaSpinner className="spinner-border spinner-border-sm me-2" />
                          Upload...
                        </>
                      ) : (
                        <>
                          <FaUpload className="me-1" />
                          Upload Bukti
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleClearNota}
                      disabled={notaLoading || loadingKirim}
                    >
                      <FaTimes className="me-1" />
                      Reset
                    </button>
                  </div>

                  <small className="text-muted d-block mb-2">
                    Jika ada nota atau bukti pengeluaran, Anda bisa upload di sini. Format: JPG, JPEG, PNG, PDF. Maksimal 5MB per file. Maksimal 10 file tiap upload.
                  </small>

                  {notaFiles.length > 0 && (
                    <div className="small text-success mb-2">
                      {notaFiles.length} file siap diupload.
                    </div>
                  )}

                  {notaError && (
                    <div className="alert alert-danger py-2 mb-2">
                      <FaExclamationTriangle className="me-2" />
                      {notaError}
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Daftar Bukti Tersimpan</strong>
                      <span className={`badge ${hasBuktiPembayaran ? "bg-success" : "bg-secondary"}`}>
                        {buktiPembayaranList.length} file
                      </span>
                    </div>
                    {hasBuktiPembayaran ? (
                      <div className="d-flex flex-wrap gap-2">
                        {buktiPembayaranList.map((item, index) => (
                          <button
                            key={`${item?.filename || item?.url || "bukti"}-${index}`}
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleViewBuktiNota(item)}
                          >
                            <FaEye className="me-1" />
                            {item?.name || item?.filename || `Bukti ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <small className="text-muted">Belum ada bukti yang diupload.</small>
                    )}
                  </div>
                </div>
              )}
              
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {isDikembalikan && (
                    <small className="text-muted">
                      Status terakhir: <span className="text-danger">Dikembalikan oleh Keuangan</span>
                    </small>
                  )}
                </div>
                <div className="d-flex">
                  {isDikembalikan && (
                    <button
                      className="btn btn-lg fw-semibold me-2"
                      onClick={fetchData}
                      style={{
                        background: theme.light,
                        color: theme.text,
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px'
                      }}
                    >
                      <FaSync className="me-2" />
                      Refresh Status
                    </button>
                  )}
                  
                  {/* TTD Upload Button */}
                  <button
                    className="btn btn-lg fw-semibold me-2"
                    onClick={() => setShowTTDModal(true)}
                    style={{
                      background: `linear-gradient(135deg, ${theme.signature} 0%, ${theme.primary} 100%)`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px'
                    }}
                  >
                    <FaSignature className="me-2" />
                    {hasTTD ? 'Ganti TTD' : 'Upload TTD'}
                  </button>
                  
                  <button
                    className="btn btn-lg fw-semibold"
                    disabled={loadingKirim || kesimpulan.replace(/<[^>]*>/g, '').length < 100}
                    onClick={handleKirimLaporan}
                    style={{
                      background: (kesimpulan.replace(/<[^>]*>/g, '').length >= 100)
                        ? (isDikembalikan 
                            ? `linear-gradient(135deg, ${theme.danger} 0%, ${theme.warning} 100%)`
                            : `linear-gradient(135deg, ${theme.success} 0%, ${theme.primary} 100%)`)
                        : theme.light,
                      color: (kesimpulan.replace(/<[^>]*>/g, '').length >= 100) ? 'white' : theme.text,
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 32px',
                      boxShadow: (kesimpulan.replace(/<[^>]*>/g, '').length >= 100)
                        ? (isDikembalikan 
                            ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                            : '0 4px 15px rgba(16, 185, 129, 0.3)')
                        : 'none',
                      transition: 'all 0.3s',
                      minWidth: '200px'
                    }}
                  >
                    {loadingKirim ? (
                      <>
                        <FaSpinner className="spinner-border spinner-border-sm me-2" />
                        Mengirim Laporan...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="me-2" />
                        {isDikembalikan ? "Kirim Perbaikan" : "Kirim Laporan Akhir"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert jika presensi belum lengkap */}
        {!isLengkap && (
          <div className="card border-0 shadow-lg mb-4" 
               style={{ backgroundColor: `${theme.warning}10` }}>
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <FaCalendarCheck size={64} className="text-warning opacity-75" />
              </div>
              <h5 className="fw-bold mb-3" style={{ color: theme.warning }}>
                Presensi Harian Belum Lengkap
              </h5>
              <p className="mb-3">
                Anda telah melakukan presensi {jumlahPresensi} dari {durasi} hari yang diwajibkan, dan baru {jumlahPresensiFotoLengkap} hari yang memenuhi minimal 2 foto.
              </p>
              <div className="progress mx-auto" style={{ maxWidth: '400px', height: '20px' }}>
                <div
                  className="progress-bar bg-warning"
                  style={{ 
                    width: `${(jumlahPresensi / durasi) * 100}%`,
                    borderRadius: '10px'
                  }}
                />
              </div>
              <p className="mt-4 text-muted">
                Silakan lengkapi semua hari presensi dan pastikan tiap hari memiliki minimal 2 foto sebelum mengirim laporan akhir.
              </p>
              <button
                className="btn btn-warning mt-2"
                onClick={fetchData}
              >
                <FaSync className="me-2" />
                Refresh Status Presensi
              </button>
            </div>
          </div>
        )}

        {/* INFORMASI LAPORAN & PEMBAYARAN */}
        {laporan_akhir && laporan_akhir.status !== 'draft' && !isDikembalikan && (
          <div className="row">
            {/* Status Laporan */}
            <div className="col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100"
                   style={{ 
                     borderLeft: `5px solid ${
                       laporan_akhir.status === 'dana_turun' ? theme.success :
                       laporan_akhir.status === 'pencairan_dana' ? theme.warning :
                       laporan_akhir.status === 'ditandatangani' ? theme.approval :
                       laporan_akhir.status === 'disetujui_keuangan' ? theme.finance :
                       theme.primary
                     }`
                   }}>
                <div className="card-body">
                  <h5 className="fw-bold mb-3" style={{ color: theme.primary }}>
                    Status Laporan
                  </h5>
                  
                  <div className="d-flex align-items-start mb-3">
                    <div className="me-3">
                      <div className="bg-light p-2 rounded">
                        {laporan_akhir.status === 'dana_turun' ? (
                          <FaReceipt size={24} style={{ color: theme.success }} />
                        ) : laporan_akhir.status === 'ditandatangani' ? (
                          <FaSignature size={24} style={{ color: theme.approval }} />
                        ) : (
                          <FaFileInvoiceDollar size={24} style={{ color: theme.finance }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1">
                        {laporan_akhir.status === 'dana_turun' ? 'Selesai' :
                         laporan_akhir.status === 'pencairan_dana' ? 'Pencairan Dana' :
                         laporan_akhir.status === 'ditandatangani' ? 'Ditandatangani' :
                         laporan_akhir.status === 'disetujui_keuangan' ? 'Disetujui Keuangan' :
                         laporan_akhir.status === 'dicek_keuangan' ? 'Sedang Dicek Keuangan' :
                         'Dalam Proses'}
                      </h6>
                      <p className="text-muted small mb-0">
                        {laporan_akhir.status === 'dana_turun' ? 'Semua proses telah selesai' :
                         laporan_akhir.status === 'pencairan_dana' ? 'Tim keuangan sedang memproses pencairan dana' :
                         laporan_akhir.status === 'ditandatangani' ? 'Atasan telah menandatangani laporan' :
                         laporan_akhir.status === 'disetujui_keuangan' ? 'Laporan telah disetujui bagian keuangan' :
                         laporan_akhir.status === 'dicek_keuangan' ? 'Laporan sedang diverifikasi oleh keuangan' :
                         'Laporan sedang dalam proses verifikasi'}
                      </p>
                      {laporan_akhir.tanggal_kirim && (
                        <p className="text-muted small mt-2 mb-0">
                          <FaClock className="me-1" />
                          Dikirim: {new Date(laporan_akhir.tanggal_kirim).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tanda Tangan Info */}
                  {hasTTD && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="fw-bold mb-3">
                        <FaSignature className="me-2" style={{ color: theme.signature }} />
                        Tanda Tangan Digital
                      </h6>
                      
                      <div className="alert alert-success border-0 mb-3" 
                           style={{ backgroundColor: `${theme.success}10` }}>
                        <div className="d-flex align-items-center">
                          <FaCheckCircle className="me-3" style={{ color: theme.success }} />
                          <div>
                            <p className="mb-1 fw-semibold">
                              Tanda tangan sudah diupload
                            </p>
                            <p className="small mb-0 text-muted">
                              Tanda tangan akan muncul di laporan PDF yang dikirim
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {ttdPreview && (
                        <div className="text-center mb-3">
                          <div className="bg-white p-3 rounded border d-inline-block">
                            <img 
                              src={ttdPreview} 
                              alt="Tanda Tangan" 
                              className="img-fluid"
                              style={{ maxHeight: '60px' }}
                            />
                          </div>
                          <button
                            className="btn btn-sm btn-outline-primary mt-2"
                            onClick={() => setShowTTDModal(true)}
                          >
                            <FaEye className="me-1" />
                            Lihat Detail TTD
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF VIEWER SECTION */}
                  {hasPdfFile && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="fw-bold mb-3">
                        <FaFilePdf className="me-2" style={{ color: theme.danger }} />
                        Dokumen Laporan
                      </h6>
                      
                      <div className="alert alert-info border-0 mb-3" 
                           style={{ backgroundColor: `${theme.primary}10` }}>
                        <div className="d-flex align-items-center">
                          <FaFileMedical className="me-3" style={{ color: theme.primary }} />
                          <div>
                            <p className="mb-1 fw-semibold">
                              {pdfType === "signed" 
                                ? "Laporan Telah Ditandatangani" 
                                : "Draft Laporan (Belum Ditandatangani Atasan)"}
                            </p>
                            <p className="small mb-0 text-muted">
                              {pdfType === "signed" 
                                ? "Dokumen resmi yang sudah ditandatangani atasan"
                                : "Draft laporan menunggu persetujuan"}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-danger flex-fill d-flex align-items-center justify-content-center"
                          onClick={() => handleViewPdf(pdfFile)}
                        >
                          <FaEye className="me-2" />
                          Lihat PDF
                        </button>
                        
                        <button
                          className="btn btn-danger flex-fill d-flex align-items-center justify-content-center"
                          onClick={() => handleDownloadPdf(pdfFile)}
                        >
                          <FaDownload className="me-2" />
                          Download
                        </button>
                      </div>
                      
                      <small className="text-muted mt-2 d-block">
                        Format: PDF Diupdate: {laporan_akhir.updatedAt ? 
                          new Date(laporan_akhir.updatedAt).toLocaleDateString('id-ID') : 
                          'Tidak diketahui'}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Pembayaran */}
            <div className="col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100"
                   style={{ 
                     borderLeft: `5px solid ${
                       pembayaran?.status === 'dana_turun' ? theme.success :
                       pembayaran?.status === 'pencairan_dana' ? theme.warning :
                       theme.finance
                     }`
                   }}>
                <div className="card-body">
                  <h5 className="fw-bold mb-3" style={{ color: theme.finance }}>
                    Status Pembayaran
                  </h5>
                  
                  <div className="d-flex align-items-start mb-3">
                    <div className="me-3">
                      <div className="bg-light p-2 rounded">
                        <FaMoneyBillWave size={24} style={{ color: theme.finance }} />
                      </div>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1">
                        {pembayaran?.status === 'dana_turun' ? 'Dana Telah Diturunkan' :
                         pembayaran?.status === 'pencairan_dana' ? 'Sedang Diproses' :
                         'Menunggu Pencairan'}
                      </h6>
                      {pembayaran?.nominal && (
                        <p className="fw-bold h5 mb-2" style={{ color: theme.success }}>
                          Rp {parseInt(pembayaran.nominal).toLocaleString('id-ID')}
                        </p>
                      )}
                      {pembayaran?.tanggal_transfer && (
                        <p className="text-muted small mb-0">
                          Transfer pada: {pembayaran.tanggal_transfer}
                        </p>
                      )}
                    </div>
                  </div>

                  {pembayaran?.bukti_transfer && (
                    <div className="mt-4">
                      <button
                        className="btn btn-success w-100"
                        onClick={() => handleViewBuktiTransfer(pembayaran.bukti_transfer)}
                      >
                        <FaReceipt className="me-2" />
                        Lihat Bukti Transfer
                      </button>
                      <p className="small text-muted text-center mt-2">
                        Bukti transfer dari bendahara keuangan
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUICK ACTION CARD - PDF & TTD ACCESS */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3" style={{ color: theme.primary }}>
              <FaExternalLinkAlt className="me-2" />
              Akses Cepat Dokumen
            </h5>
            
            <div className="row">
              {/* Tanda Tangan Card */}
              <div className="col-md-4 mb-3">
                <div className="card border-0 h-100" 
                     style={{ 
                       backgroundColor: `${theme.signature}10`,
                       borderLeft: `4px solid ${theme.signature}`
                     }}>
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-white p-2 rounded me-3">
                        <FaSignature size={24} style={{ color: theme.signature }} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">Tanda Tangan Digital</h6>
                        <small className="text-muted">
                          {hasTTD ? 'Sudah diupload' : 'Belum diupload'}
                        </small>
                      </div>
                    </div>
                    
                    {hasTTD ? (
                      <div className="text-center mb-3">
                        <div className="bg-white p-3 rounded border d-inline-block mb-2">
                          <img 
                            src={ttdPreview} 
                            alt="Tanda Tangan" 
                            className="img-fluid"
                            style={{ maxHeight: '50px' }}
                          />
                        </div>
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                            onClick={() => setShowTTDModal(true)}
                          >
                            <FaEye className="me-2" />
                            Lihat Detail
                          </button>
                          
                          <button
                            className="btn btn-primary d-flex align-items-center justify-content-center"
                            onClick={() => setShowTTDModal(true)}
                          >
                            <FaSignature className="me-2" />
                            Ganti TTD
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => setShowTTDModal(true)}
                        style={{
                          background: `linear-gradient(135deg, ${theme.signature} 0%, ${theme.primary} 100%)`,
                          border: 'none'
                        }}
                      >
                        <FaUpload className="me-2" />
                        Upload Tanda Tangan
                      </button>
                    )}
                    
                    {laporan_akhir?.tanggal_ttd_pegawai && (
                      <small className="text-muted mt-2 d-block text-center">
                        Diupload: {new Date(laporan_akhir.tanggal_ttd_pegawai).toLocaleDateString('id-ID')}
                      </small>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Laporan PDF Card */}
              <div className="col-md-4 mb-3">
                <div className="card border-0 h-100" 
                     style={{ 
                       backgroundColor: `${theme.primary}10`,
                       borderLeft: `4px solid ${theme.primary}`
                     }}>
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-white p-2 rounded me-3">
                        <FaFilePdf size={24} style={{ color: theme.danger }} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">Laporan PDF</h6>
                        <small className="text-muted">
                          {pdfType === "signed" ? "Versi TTD" : "Draft Laporan"}
                        </small>
                      </div>
                    </div>
                    
                    {hasPdfFile ? (
                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                          onClick={() => handleViewPdf(pdfFile)}
                        >
                          <FaEye className="me-2" />
                          Buka PDF di Browser
                        </button>
                        
                        <button
                          className="btn btn-danger d-flex align-items-center justify-content-center"
                          onClick={() => handleDownloadPdf(pdfFile)}
                        >
                          <FaDownload className="me-2" />
                          Unduh PDF
                        </button>

                        <div className="mt-2 pt-2 border-top"></div>

                        {hasWordFile ? (
                          <>
                            <button
                              className="btn btn-outline-success d-flex align-items-center justify-content-center"
                              onClick={() => handleViewWord(wordFile)}
                            >
                              <FaEye className="me-2" />
                              Buka Word di Browser
                            </button>

                            <button
                              className="btn btn-success d-flex align-items-center justify-content-center"
                              onClick={() => handleDownloadWord(wordFile)}
                            >
                              <FaDownload className="me-2" />
                              Unduh Word
                            </button>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <FaFileWord size={22} className="text-muted mb-2" />
                            <p className="small text-muted mb-0">
                              File Word akan tersedia setelah dikirim
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <FaFilePdf size={24} className="text-muted mb-2" />
                        <p className="small text-muted mb-0">
                          Laporan PDF akan tersedia setelah dikirim
                        </p>
                      </div>
                    )}
                    
                    {laporan_akhir?.updatedAt && (
                      <small className="text-muted mt-2 d-block text-center">
                        Terakhir update: {new Date(laporan_akhir.updatedAt).toLocaleDateString('id-ID')}
                      </small>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Bukti Transfer Card */}
              <div className="col-md-4 mb-3">
                <div className="card border-0 h-100" 
                     style={{ 
                       backgroundColor: `${theme.success}10`,
                       borderLeft: `4px solid ${theme.success}`
                     }}>
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-white p-2 rounded me-3">
                        <FaReceipt size={24} style={{ color: theme.success }} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">Bukti Transfer</h6>
                        <small className="text-muted">
                          {pembayaran?.status === 'dana_turun' ? 'Tersedia' : 'Belum tersedia'}
                        </small>
                      </div>
                    </div>
                    
                    {pembayaran?.bukti_transfer ? (
                      <button
                        className="btn btn-success w-100"
                        onClick={() => handleViewBuktiTransfer(pembayaran.bukti_transfer)}
                      >
                        <FaEye className="me-2" />
                        Lihat Bukti Transfer
                      </button>
                    ) : (
                      <div className="text-center py-3">
                        <FaClock size={24} className="text-muted mb-2" />
                        <p className="small text-muted mb-0">
                          Bukti transfer akan tersedia setelah dana diturunkan
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PegawaiLayout>
  );
};

export default LaporanPerjalanan;


