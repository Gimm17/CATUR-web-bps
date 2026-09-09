import { useEffect, useState } from "react";
import PegawaiLayout from "../../layouts/PegawaiLayout";
import api from "../../api/axios";
import { getAllSuratTugas } from "../../services/suratTugas.service";
import { getUser } from "../../utils/auth";
import { FaFileAlt, FaClipboardList } from "react-icons/fa";
import "../../css/dashboard.css";

const ReportLaporanPegawai = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const user = getUser();
        if (!user?.id) {
          setRows([]);
          setError("User belum login.");
          return;
        }

        const suratRes = await getAllSuratTugas(user.id);
        const suratList = Array.isArray(suratRes)
          ? suratRes
          : Array.isArray(suratRes?.data)
            ? suratRes.data
            : [];

        const laporanBySurat = await Promise.all(
          suratList.map(async (surat) => {
            try {
              const laporanResponse = await api.get(`/laporan/surat/${surat.id}`, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });

              const data = laporanResponse.data || laporanResponse;
              let laporanList = [];
              if (Array.isArray(data)) laporanList = data;
              else if (Array.isArray(data.data)) laporanList = data.data;
              else if (Array.isArray(data.laporan)) laporanList = data.laporan;

              return { surat, laporan: laporanList };
            } catch (err) {
              console.error("Error load laporan surat:", err);
              return { surat, laporan: [] };
            }
          })
        );

        const flattened = [];
        laporanBySurat.forEach(({ surat, laporan }) => {
          if (!Array.isArray(laporan) || laporan.length === 0) {
            flattened.push({ surat, laporan: null });
            return;
          }
          laporan.forEach((item) => {
            flattened.push({ surat, laporan: item });
          });
        });

        setRows(flattened);
      } catch (err) {
        console.error("Error loading report:", err);
        setError("Gagal memuat data laporan. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatTanggalPerjadin = (suratTugas) => {
    if (!suratTugas) return "-";
    const start = suratTugas.tanggal_mulai ? new Date(suratTugas.tanggal_mulai) : null;
    const end = suratTugas.tanggal_selesai ? new Date(suratTugas.tanggal_selesai) : null;
    const options = { day: "2-digit", month: "short", year: "numeric" };
    if (start && end) {
      return `${start.toLocaleDateString("id-ID", options)} - ${end.toLocaleDateString("id-ID", options)}`;
    }
    if (start) return start.toLocaleDateString("id-ID", options);
    return "-";
  };

  const formatTanggalWaktu = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deriveStatusLaporan = (laporan) => {
    if (!laporan) return null;
    const status = laporan.status;
    const hasCatatan = Boolean(laporan.catatan_keuangan && String(laporan.catatan_keuangan).trim());
    if (status === "dikirim" && hasCatatan) return "ditolak";
    if (status === "dikirim") return "dikirim";
    if (status === "dicek_keuangan") return "dicek_keuangan";
    if (["disetujui_keuangan", "ditandatangani", "pencairan_dana", "dana_turun"].includes(status)) {
      return "completed";
    }
    return status || null;
  };

  const formatStatusLaporan = (laporan) => {
    const normalized = deriveStatusLaporan(laporan);
    const statusMap = {
      dikirim: "Laporan Dikirim",
      ditolak: "Perlu Perbaikan",
      dicek_keuangan: "Pengecekan Laporan",
      completed: "Completed",
    };
    return statusMap[normalized] || laporan?.status || "-";
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
    return number.toLocaleString("id-ID");
  };

  const getStatusBadgeStyle = (laporan) => {
    const normalized = deriveStatusLaporan(laporan);
    const styles = {
      dikirim: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
      ditolak: { bg: "#ffe4e6", text: "#be123c", border: "#fecdd3" },
      dicek_keuangan: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
      completed: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
    };
    const palette = styles[normalized] || { bg: "#f1f5f9", text: "#0f172a", border: "#e2e8f0" };
    return {
      backgroundColor: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.border}`,
      padding: "5px 10px",
      borderRadius: "12px",
      fontSize: "0.85rem",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };
  };

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "dikirim", label: "Laporan Dikirim" },
    { value: "ditolak", label: "Perlu Perbaikan" },
    { value: "dicek_keuangan", label: "Pengecekan Laporan" },
    { value: "completed", label: "Completed" },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const normalizedStatus = deriveStatusLaporan(row?.laporan);
    const matchesStatus = statusFilter === "all" ? true : normalizedStatus === statusFilter;
    if (!normalizedSearch) return matchesStatus;
    const tujuan = row.surat?.daerah_tujuan?.toLowerCase() || "";
    const kegiatan = row.surat?.nama_kegiatan?.toLowerCase() || "";
    return matchesStatus && (tujuan.includes(normalizedSearch) || kegiatan.includes(normalizedSearch));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rows.length]);

  return (
    <PegawaiLayout>
      <div style={{ minHeight: "calc(100vh - 70px)", backgroundColor: "#f8fafc", padding: "20px" }}>
        <section className="content-header">
          <div className="container-fluid">
            <div className="row mb-4">
              <div className="col-sm-12">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "5px" }}>
                      Report Laporan Pegawai
                    </h1>
                    <p style={{ color: "#64748b", marginBottom: "0", fontSize: "0.95rem" }}>
                      Rekap semua laporan perjalanan dinas Anda
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: "white",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FaClipboardList style={{ color: "#0ea5e9" }} />
                    <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.95rem" }}>
                      Total: {filteredRows.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="content">
          <div className="container-fluid">
            <div className="card" style={{
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              border: "none"
            }}>
              <div className="card-header" style={{
                backgroundColor: "white",
                borderBottom: "1px solid #e2e8f0",
                padding: "20px",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <h5 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "0" }}>
                    <FaFileAlt style={{ color: "#0ea5e9", marginRight: "8px" }} />
                    Tabel Laporan
                  </h5>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-control form-control-sm"
                      placeholder="Cari tujuan perjadin..."
                      style={{ minWidth: "220px" }}
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="form-select form-select-sm"
                      style={{ minWidth: "170px" }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card-body" style={{ padding: "0" }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: "15px", color: "#64748b" }}>Memuat data laporan...</p>
                  </div>
                ) : error ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <p style={{ color: "#ef4444", marginBottom: "0" }}>{error}</p>
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <h6 style={{ color: "#1e293b", fontWeight: "600", marginBottom: "10px" }}>
                      {rows.length === 0 ? "Belum Ada Data Laporan" : "Data Tidak Ditemukan"}
                    </h6>
                    <p style={{ color: "#64748b", marginBottom: "0" }}>
                      {rows.length === 0
                        ? "Laporan perjalanan dinas Anda akan tampil di sini."
                        : "Coba ubah kata kunci atau filter status."}
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead style={{ backgroundColor: "#f8fafc" }}>
                        <tr>
                          <th style={{ width: "5%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>No</th>
                          <th style={{ width: "18%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Nama Kegiatan</th>
                          <th style={{ width: "18%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Lokasi/Tujuan Perjadin</th>
                          <th style={{ width: "16%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Tanggal Perjadin</th>
                          <th style={{ width: "14%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Status Laporan</th>
                          <th style={{ width: "17%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Pengiriman Laporan</th>
                          <th style={{ width: "13%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Pencairan Anggaran</th>
                          <th style={{ width: "12%", fontWeight: "600", color: "#1e293b", padding: "15px", borderBottom: "2px solid #e2e8f0" }}>Nilai Pencairan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, index) => (
                          <tr key={`${row.laporan?.id || "laporan"}-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "15px", fontWeight: "600", textAlign: "center", color: "#1e293b" }}>
                              {startIndex + index + 1}
                            </td>
                            <td style={{ padding: "15px", color: "#1e293b" }}>
                              {row.surat?.nama_kegiatan || "-"}
                            </td>
                            <td style={{ padding: "15px", color: "#1e293b" }}>
                              {row.surat?.daerah_tujuan || "-"}
                            </td>
                            <td style={{ padding: "15px", color: "#1e293b" }}>
                              {formatTanggalPerjadin(row.surat)}
                            </td>
                            <td style={{ padding: "15px" }}>
                              <span style={getStatusBadgeStyle(row.laporan)}>
                                {formatStatusLaporan(row.laporan)}
                              </span>
                            </td>
                            <td style={{ padding: "15px", color: "#64748b" }}>
                              {formatTanggalWaktu(row.laporan?.tanggal_kirim || row.laporan?.created_at)}
                            </td>
                            <td style={{ padding: "15px", color: "#64748b" }}>
                              {formatPencairanAnggaran(row.laporan?.status)}
                            </td>
                            <td style={{ padding: "15px", fontWeight: "600", color: "#1e293b" }}>
                              Rp {formatRupiah(row.laporan?.nominal_dana)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {!loading && rows.length > 0 && (
                <div className="card-footer" style={{
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  padding: "15px 20px"
                }}>
                  <div className="d-flex justify-content-between align-items-center" style={{ gap: "12px", flexWrap: "wrap" }}>
                    <small style={{ color: "#64748b" }}>
                      Menampilkan {filteredRows.length} laporan
                    </small>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={safePage <= 1}
                      >
                        Prev
                      </button>
                      <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                        Halaman {safePage} dari {totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
        </section>
      </div>
    </PegawaiLayout>
  );
};

export default ReportLaporanPegawai;
