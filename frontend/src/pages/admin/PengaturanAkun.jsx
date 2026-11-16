import { useEffect, useState, useMemo, useRef } from "react";
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
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaCheck,
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
  padding: "8px 12px",
  height: "40px",
  fontSize: "0.9rem",
  backgroundColor: "#ffffff",
};

const labelStyle = {
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "5px",
};

/**
 * Custom dropdown terkunci searah ke bawah & lebarnya 100% mengikuti lebar tombol trigger
 * agar tidak pernah melebar atau terlempar ke atas seperti native <select> OS.
 */
const AdminDropdownSelect = ({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  searchable = false,
  searchPlaceholder = "Cari...",
  prefixIcon = null,
  triggerStyle = {},
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            if (!prev) setQuery("");
            return !prev;
          });
        }}
        aria-expanded={open}
        className="w-100 d-flex align-items-center justify-content-between text-start"
        style={{
          ...inputStyle,
          width: "100%",
          cursor: "pointer",
          borderColor: open ? "#3b82f6" : "#cbd5e1",
          boxShadow: open ? "0 0 0 3px rgba(59, 130, 246, 0.14)" : "none",
          ...triggerStyle,
        }}
      >
        <span
          className="d-flex align-items-center gap-2"
          style={{ minWidth: 0, flex: 1 }}
        >
          {prefixIcon && (
            <span style={{ color: "#64748b", flexShrink: 0, display: "inline-flex" }}>
              {prefixIcon}
            </span>
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: selectedOption ? "#0f172a" : "#64748b",
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <FaChevronDown
          size={11}
          style={{
            color: "#64748b",
            flexShrink: 0,
            marginLeft: "8px",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            zIndex: 1055,
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
            overflow: "hidden",
          }}
        >
          {searchable && (
            <div
              style={{
                padding: "8px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div className="input-group input-group-sm">
                <span
                  className="input-group-text bg-white border-end-0"
                  style={{ borderColor: "#cbd5e1", color: "#64748b" }}
                >
                  <FaSearch size={11} />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  style={{
                    borderColor: "#cbd5e1",
                    fontSize: "0.84rem",
                    boxShadow: "none",
                  }}
                />
              </div>
            </div>
          )}

          <div
            role="listbox"
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              padding: "4px",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="text-center text-muted small py-3">
                Tidak ada opsi cocok
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="w-100 border-0 text-start d-flex align-items-center justify-content-between gap-2"
                    style={{
                      padding: "8px 10px",
                      borderRadius: "7px",
                      fontSize: "0.86rem",
                      lineHeight: 1.35,
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                      color: isSelected ? "#1d4ed8" : "#1e293b",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <FaCheck size={11} style={{ color: "#1d4ed8", flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ROLE_OPTIONS = [
  { value: "pegawai", label: "Pegawai" },
  { value: "admin", label: "Administrator" },
  { value: "atasan", label: "Kepala BPS SULTENG" },
  { value: "keuangan", label: "Keuangan" },
];

const PengaturanAkun = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

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
          padding: "18px 24px 28px",
        }}
      >
        {/* HEADER */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div>
            <h1
              className="mb-1 d-flex align-items-center"
              style={{
                fontSize: "1.45rem",
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
              fontSize: "0.84rem",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Total Terdaftar: {users.length} Akun
          </span>
        </div>

        {/* FORM CARD (Grid 4 Kolom Sejajar Presisi + Tombol di Header) */}
        <form onSubmit={handleSubmit}>
          <div
            className="card mb-3"
            style={{
              borderRadius: "12px",
              boxShadow: editId
                ? "0 8px 20px rgba(26, 86, 219, 0.12)"
                : "0 2px 10px rgba(15, 23, 42, 0.05)",
              border: editId ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
              overflow: "visible",
            }}
          >
            <div
              className="card-header"
              style={{
                background: editId
                  ? "linear-gradient(135deg, #1e40af 0%, #0284c7 100%)"
                  : "linear-gradient(135deg, #1A56DB 0%, #0EA5E9 100%)",
                color: "white",
                padding: "12px 20px",
                borderBottom: "none",
                borderRadius: "11px 11px 0 0",
              }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  {editId ? <FaUserEdit /> : <FaUserPlus />}
                  <span>
                    {editId
                      ? `Edit Pengguna — ${nama || email}`
                      : "Tambah Pengguna Baru"}
                  </span>
                </h6>

                <div className="d-flex align-items-center gap-2">
                  {editId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn btn-sm d-flex align-items-center gap-1"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.35)",
                        borderRadius: "7px",
                        padding: "6px 14px",
                        fontSize: "0.84rem",
                        fontWeight: 600,
                      }}
                    >
                      <FaTimes size={12} /> Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-sm d-flex align-items-center gap-2"
                    disabled={loading}
                    style={{
                      background: editId
                        ? "#10b981"
                        : "#ffffff",
                      color: editId ? "#ffffff" : "#1A56DB",
                      border: "none",
                      borderRadius: "7px",
                      padding: "6px 16px",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
                    }}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="spinner-border spinner-border-sm" />
                        <span>{editId ? "Menyimpan..." : "Menambah..."}</span>
                      </>
                    ) : (
                      <>
                        {editId ? <FaSave /> : <FaUserPlus />}
                        <span>{editId ? "Simpan Perubahan" : "Tambah Pengguna"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: "18px 20px" }}>
              {error && (
                <div className="alert alert-danger py-2 mb-3 small">
                  {error}
                </div>
              )}

              {/* Grid 4 Kolom x 2 Baris — 100% Sejajar Lurus Atas-Bawah */}
              <div className="row g-3">
                {/* Baris 1: 3 - 3 - 3 - 3 */}
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
                    {editId ? "Password Baru (Opsional)" : "Password *"}
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
                  <AdminDropdownSelect
                    value={role}
                    onChange={setRole}
                    options={ROLE_OPTIONS}
                    placeholder="Pilih role sistem..."
                  />
                </div>

                {/* Baris 2: 3 - 3 - 3 - 3 (Lurus Presisi dengan Baris 1) */}
                <div className="col-lg-3 col-md-6">
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

                <div className="col-lg-3 col-md-6">
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

                <div className="col-lg-3 col-md-6">
                  <label className="form-label" style={labelStyle}>
                    <FaBuilding className="me-1 text-primary" />
                    Unit Kerja / Wilayah Satker
                  </label>
                  <AdminDropdownSelect
                    value={unitKerja}
                    onChange={setUnitKerja}
                    searchable
                    searchPlaceholder="Cari satker..."
                    options={SATKER_UNIT_KERJA_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: `${opt.label} (${opt.badge})`,
                    }))}
                    placeholder="Pilih Satker BPS..."
                  />
                </div>

                <div className="col-lg-3 col-md-6">
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
            </div>
          </div>
        </form>

        {/* DAFTAR PENGGUNA CARD (Menyatu dengan Search, Filter, Tabel & Pagination) */}
        <div
          className="card"
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.05)",
            border: "1px solid #e2e8f0",
            overflow: "visible",
          }}
        >
          {/* Toolbar Search & Filter di Atas Tabel */}
          <div
            className="card-header bg-white"
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #e2e8f0",
              borderRadius: "11px 11px 0 0",
            }}
          >
            <div className="row g-2 align-items-center">
              <div className="col-lg-6 col-md-6">
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
                    <FaSearch size={13} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari nama, email, NIP, atau Satker..."
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

              <div className="col-lg-3 col-md-3">
                <AdminDropdownSelect
                  value={roleFilter}
                  onChange={setRoleFilter}
                  prefixIcon={<FaFilter size={12} />}
                  options={[
                    { value: "", label: `Semua Role (${users.length})` },
                    ...ROLE_OPTIONS,
                  ]}
                />
              </div>

              <div className="col-lg-3 col-md-3">
                <AdminDropdownSelect
                  value={pageSize}
                  onChange={(val) => setPageSize(Number(val))}
                  options={[
                    { value: 10, label: "Tampilkan 10 baris / halaman" },
                    { value: 25, label: "Tampilkan 25 baris / halaman" },
                    { value: 50, label: "Tampilkan 50 baris / halaman" },
                    { value: 500, label: `Tampilkan Semua (${filteredUsers.length})` },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ backgroundColor: "#f1f5f9" }}>
                <tr>
                  <th
                    style={{
                      padding: "11px 16px",
                      fontSize: "0.78rem",
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
                      padding: "11px 16px",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Nama & Email
                  </th>
                  <th
                    style={{
                      padding: "11px 16px",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    NIP
                  </th>
                  <th
                    style={{
                      padding: "11px 16px",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      padding: "11px 16px",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#475569",
                    }}
                  >
                    Satker / Wilayah Akses
                  </th>
                  <th
                    style={{
                      padding: "11px 16px",
                      fontSize: "0.78rem",
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
                      padding: "11px 16px",
                      fontSize: "0.78rem",
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
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      Tidak ada data pengguna yang sesuai pencarian
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const rowNumber = (safePage - 1) * pageSize + idx + 1;
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
                            padding: "10px 16px",
                            color: "#64748b",
                            fontWeight: 600,
                            fontSize: "0.88rem",
                          }}
                        >
                          {rowNumber}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#0f172a",
                              fontSize: "0.9rem",
                            }}
                          >
                            {u.nama}
                          </div>
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "0.8rem",
                            }}
                          >
                            {u.email}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "monospace",
                            fontSize: "0.86rem",
                            color: "#334155",
                          }}
                        >
                          {u.nip || "-"}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              backgroundColor: `${getRoleColor(u.role)}15`,
                              color: getRoleColor(u.role),
                              padding: "4px 11px",
                              borderRadius: "999px",
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            {getRoleName(u.role)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#1e293b",
                              fontSize: "0.86rem",
                            }}
                          >
                            {wilayah.satker_label}
                          </div>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              padding: "1px 7px",
                              borderRadius: "4px",
                              backgroundColor: isKab ? "#e0f2fe" : "#f1f5f9",
                              color: isKab ? "#0369a1" : "#64748b",
                              display: "inline-block",
                              marginTop: "2px",
                            }}
                          >
                            {isKab
                              ? `Terkunci: ${wilayah.kabupaten_label}`
                              : "Provinsi (Semua Wilayah)"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: "0.86rem",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.telepon || "-"}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
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
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              <FaUserEdit size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleDelete(u.id)}
                              style={{
                                background: "#EF4444",
                                color: "white",
                                border: "none",
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              <FaTrash size={11} /> Hapus
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

          {/* Footer Pagination */}
          {filteredUsers.length > 0 && (
            <div
              className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <span className="text-muted small">
                Menampilkan{" "}
                <strong>{(safePage - 1) * pageSize + 1}</strong> –{" "}
                <strong>
                  {Math.min(safePage * pageSize, filteredUsers.length)}
                </strong>{" "}
                dari <strong>{filteredUsers.length}</strong> akun
              </span>

              {totalPages > 1 && (
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ borderRadius: "6px", padding: "5px 10px" }}
                  >
                    <FaChevronLeft size={11} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - safePage) <= 1
                    )
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-muted small"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className="btn btn-sm"
                          style={{
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontWeight: 600,
                            fontSize: "0.82rem",
                            backgroundColor:
                              safePage === item ? "#1A56DB" : "#f8fafc",
                            color: safePage === item ? "#ffffff" : "#334155",
                            border:
                              safePage === item
                                ? "1px solid #1A56DB"
                                : "1px solid #cbd5e1",
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    style={{ borderRadius: "6px", padding: "5px 10px" }}
                  >
                    <FaChevronRight size={11} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PengaturanAkun;
