import { useEffect, useState, useMemo } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/akun.service";
import {
  FaUserPlus,
  FaUserEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaUsers,
  FaSearch,
  FaSpinner,
  FaBuilding,
  FaFilter,
} from "react-icons/fa";
import { confirmAction, showToast } from "../../utils/alerts";
import {
  SATKER_UNIT_KERJA_OPTIONS,
  resolveWilayahAccess,
} from "../../features/surat-tugas/wilayahHierarki";

const normalizeToSatkerOption = (rawUnitKerja) => {
  if (!rawUnitKerja) return "BPS Provinsi Sulawesi Tengah";
  const exact = SATKER_UNIT_KERJA_OPTIONS.find((o) => o.value === rawUnitKerja);
  if (exact) return exact.value;
  const resolved = resolveWilayahAccess(rawUnitKerja);
  return resolved?.satker_label || "BPS Provinsi Sulawesi Tengah";
};

const inputStyle = {
  border: "1.5px solid #cbd5e1",
  borderRadius: "8px",
  padding: "9px 12px",
  height: "42px",
  fontSize: "0.92rem",
  backgroundColor: "#ffffff",
};

const labelStyle = {
  fontSize: "0.84rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "6px",
};

const PengaturanAkun = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");

  // FORM TAMBAH/EDIT USER
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("pegawai");
  const [nip, setNip] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [unitKerja, setUnitKerja] = useState("BPS Provinsi Sulawesi Tengah");

  // EDIT MODE
  const [editId, setEditId] = useState(null);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (!q) return true;
      const wilayah = resolveWilayahAccess(user);
      return (
        user.nama?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.role?.toLowerCase().includes(q) ||
        user.nip?.toLowerCase().includes(q) ||
        user.unit_kerja?.toLowerCase().includes(q) ||
        wilayah?.satker_label?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const resetForm = () => {
    setNama("");
    setEmail("");
    setPassword("");
    setRole("pegawai");
    setNip("");
    setAlamat("");
    setTelepon("");
    setUnitKerja("BPS Provinsi Sulawesi Tengah");
    setEditId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userData = {
        nama,
        email,
        role,
        nip: nip || null,
        alamat: alamat || null,
        telepon: telepon || null,
        unit_kerja: unitKerja || "BPS Provinsi Sulawesi Tengah",
      };

      if (!editId) {
        if (!password) {
          setError("Password harus diisi untuk user baru");
          setLoading(false);
          return;
        }
        userData.password = password;
      }

      if (editId && password.trim() !== "") {
        userData.password = password;
      }

      if (editId) {
        await updateUser(editId, userData);
        showToast("User berhasil diperbarui", { icon: "success" });
      } else {
        await createUser(userData);
        showToast("User berhasil ditambahkan", { icon: "success" });
      }

      resetForm();
      await loadUsers();
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err.response?.data?.message || "Gagal menyimpan data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (u) => {
    setEditId(u.id);
    setNama(u.nama || "");
    setEmail(u.email || "");
    setRole(u.role || "pegawai");
    setNip(u.nip || "");
    setAlamat(u.alamat || "");
    setTelepon(u.telepon || "");
    setUnitKerja(normalizeToSatkerOption(u.unit_kerja));
    setPassword("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmAction("Yakin ingin menghapus user ini?", {
      title: "Hapus User",
      confirmText: "Hapus",
      cancelText: "Batal",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await deleteUser(id);
      await loadUsers();
      showToast("User berhasil dihapus", { icon: "success" });
    } catch (err) {
      console.error("Error deleting user:", err);
      showToast(err.response?.data?.message || "Gagal menghapus user", {
        icon: "error",
      });
    }
  };

  const getRoleColor = (roleVal) => {
    switch (roleVal) {
      case "admin":
        return "#1A56DB";
      case "atasan":
        return "#D97706";
      case "keuangan":
        return "#7C3AED";
      case "pegawai":
        return "#059669";
      default:
        return "#64748B";
    }
  };

  const getRoleName = (roleVal) => {
    switch (roleVal) {
      case "admin":
        return "Administrator";
      case "atasan":
        return "Kepala BPS SULTENG";
      case "keuangan":
        return "Keuangan";
      case "pegawai":
        return "Pegawai";
      default:
        return roleVal;
    }
  };

  return (
    <AdminLayout>
      <div
        style={{
          minHeight: "calc(100vh - 70px)",
          backgroundColor: "#f8fafc",
          padding: "20px 24px",
        }}
      >
        {/* HEADER */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div>
            <h1
              className="mb-1 d-flex align-items-center"
              style={{
                fontSize: "1.55rem",
                fontWeight: "700",
                color: "#0f172a",
              }}
            >
              <FaUsers style={{ color: "#1A56DB", marginRight: "10px" }} />
              Manajemen Akun Pengguna
            </h1>
            <p className="text-muted small mb-0">
              Kelola data pegawai, hak akses role, dan penempatan Satker BPS Provinsi / Kabupaten / Kota
            </p>
          </div>
          <span
            className="badge px-3 py-2"
            style={{
              backgroundColor: "#e0e7ff",
              color: "#1e40af",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Total Terdaftar: {users.length} Akun
          </span>
        </div>

        {/* FORM CARD */}
        <div
          className="card mb-4"
          style={{
            borderRadius: "12px",
            boxShadow: editId
              ? "0 8px 20px rgba(26, 86, 219, 0.12)"
              : "0 2px 10px rgba(15, 23, 42, 0.05)",
            border: editId ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            className="card-header"
            style={{
              background: editId
                ? "linear-gradient(135deg, #1e40af 0%, #0284c7 100%)"
                : "linear-gradient(135deg, #1A56DB 0%, #0EA5E9 100%)",
              color: "white",
              padding: "14px 20px",
              borderBottom: "none",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                {editId ? <FaUserEdit /> : <FaUserPlus />}
                <span>
                  {editId ? `Edit Pengguna — ${nama || email}` : "Tambah Pengguna Baru"}
                </span>
              </h6>
              {editId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-sm d-flex align-items-center gap-1"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: "6px",
                    padding: "4px 12px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  <FaTimes size={12} /> Batal Edit
                </button>
              )}
            </div>
          </div>

          <div className="card-body" style={{ padding: "20px 22px" }}>
            {error && (
              <div className="alert alert-danger py-2 mb-3 small">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Baris 1: 4 Kolom Sejajar */}
                <div className="col-lg-3 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    Nama Lengkap <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masukkan nama lengkap"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@bps.go.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    {editId ? "Password Baru (Opsional)" : "Password *"}{" "}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={
                      editId ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editId}
                    minLength="6"
                    style={inputStyle}
                  />
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    Role Sistem <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="pegawai">Pegawai</option>
                    <option value="admin">Administrator</option>
                    <option value="atasan">Kepala BPS SULTENG</option>
                    <option value="keuangan">Keuangan</option>
                  </select>
                </div>

                {/* Baris 2: NIP, Telepon, Unit Kerja (Single Clean Select), Alamat */}
                <div className="col-lg-2 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    NIP
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nomor Induk Pegawai"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="col-lg-2 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="08xxxxxxxxxx"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="col-lg-4 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    <FaBuilding className="me-1 text-primary" />
                    Unit Kerja / Wilayah Satker
                  </label>
                  <select
                    className="form-select"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    style={inputStyle}
                  >
                    {SATKER_UNIT_KERJA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-lg-4 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    Alamat
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Alamat domisili / kantor"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Footer Tombol Submit di Kanan Bawah Form */}
              <div className="d-flex justify-content-end align-items-center gap-2 mt-3 pt-3 border-top">
                {editId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn"
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "9px 18px",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    <FaTimes className="me-1" />
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="btn d-flex align-items-center justify-content-center"
                  disabled={loading}
                  style={{
                    background: editId
                      ? "linear-gradient(135deg, #059669 0%, #10B981 100%)"
                      : "linear-gradient(135deg, #1A56DB 0%, #2563EB 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 24px",
                    fontWeight: 600,
                    fontSize: "0.92rem",
                    minWidth: "160px",
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
                  }}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner-border spinner-border-sm me-2" />
                      {editId ? "Menyimpan..." : "Menambah..."}
                    </>
                  ) : (
                    <>
                      {editId ? (
                        <FaSave className="me-2" />
                      ) : (
                        <FaUserPlus className="me-2" />
                      )}
                      {editId ? "Simpan Perubahan" : "Tambah Pengguna"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div
          className="card mb-3"
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div className="card-body py-3 px-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-8">
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #cbd5e1",
                      borderRight: "none",
                      borderRadius: "8px 0 0 8px",
                      color: "#64748b",
                    }}
                  >
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari berdasarkan nama, email, NIP, atau Satker..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderLeft: "none",
                      borderRadius: "0 8px 8px 0",
                    }}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #cbd5e1",
                      borderRight: "none",
                      borderRadius: "8px 0 0 8px",
                      color: "#64748b",
                    }}
                  >
                    <FaFilter size={13} />
                  </span>
                  <select
                    className="form-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderLeft: "none",
                      borderRadius: "0 8px 8px 0",
                    }}
                  >
                    <option value="">Semua Role ({users.length})</option>
                    <option value="pegawai">Pegawai</option>
                    <option value="admin">Administrator</option>
                    <option value="atasan">Kepala BPS SULTENG</option>
                    <option value="keuangan">Keuangan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div
          className="card"
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.05)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ backgroundColor: "#f1f5f9" }}>
                <tr>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                      width: "56px",
                    }}
                  >
                    No
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Nama & Email
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    NIP
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Satker / Wilayah Akses
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Telepon
                  </th>
                  <th
                    className="text-end"
                    style={{
                      padding: "13px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                      width: "170px",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      Tidak ada data pengguna yang sesuai pencarian
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const wilayah = resolveWilayahAccess(u);
                    const isKab = wilayah.scope === "kabupaten";
                    const isBeingEdited = editId === u.id;
                    return (
                      <tr
                        key={u.id}
                        style={{
                          backgroundColor: isBeingEdited ? "#eff6ff" : undefined,
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#0f172a",
                              fontSize: "0.93rem",
                            }}
                          >
                            {u.nama}
                          </div>
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "0.82rem",
                            }}
                          >
                            {u.email}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontFamily: "monospace",
                            fontSize: "0.88rem",
                            color: "#334155",
                          }}
                        >
                          {u.nip || "-"}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              backgroundColor: `${getRoleColor(u.role)}15`,
                              color: getRoleColor(u.role),
                              padding: "5px 12px",
                              borderRadius: "999px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            {getRoleName(u.role)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#1e293b",
                              fontSize: "0.88rem",
                            }}
                          >
                            {wilayah.satker_label}
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span
                              style={{
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor: isKab ? "#e0f2fe" : "#f1f5f9",
                                color: isKab ? "#0369a1" : "#475569",
                              }}
                            >
                              {isKab
                                ? `Terkunci: ${wilayah.kabupaten_label}`
                                : "Provinsi (Semua Wilayah)"}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "0.88rem",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.telepon || "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                          }}
                        >
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleEdit(u)}
                              style={{
                                background: "#F59E0B",
                                color: "white",
                                border: "none",
                                padding: "6px 11px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              <FaUserEdit size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleDelete(u.id)}
                              style={{
                                background: "#EF4444",
                                color: "white",
                                border: "none",
                                padding: "6px 11px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              <FaTrash size={12} /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PengaturanAkun;
