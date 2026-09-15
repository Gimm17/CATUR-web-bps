import { useEffect, useState } from "react";
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
  FaEnvelope,
  FaLock,
  FaUserTag,
  FaSearch,
  FaSpinner,
  FaIdCard,
  FaMapMarkerAlt,
  FaPhone,
  FaBuilding
} from "react-icons/fa";
import { confirmAction, showToast } from "../../utils/alerts";

const PengaturanAkun = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  // FORM TAMBAH/EDIT USER
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("pegawai");
  const [nip, setNip] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [unitKerja, setUnitKerja] = useState("");

  // EDIT MODE
  const [editId, setEditId] = useState(null);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user =>
    user.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.nip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.unit_kerja?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setNama("");
    setEmail("");
    setPassword("");
    setRole("pegawai");
    setNip("");
    setAlamat("");
    setTelepon("");
    setUnitKerja("");
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
        unit_kerja: unitKerja || null
      };

      // CREATE -> wajib password
      if (!editId) {
        if (!password) {
          setError("Password harus diisi untuk user baru");
          setLoading(false);
          return;
        }
        userData.password = password;
      }

      // EDIT -> kirim password hanya jika diisi
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

    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error.response?.data?.message || "Gagal menyimpan data";
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
    setUnitKerja(u.unit_kerja || "");
    setPassword("");
    setError("");
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmAction(
      "Yakin ingin menghapus user ini?",
      { title: "Hapus User", confirmText: "Hapus", cancelText: "Batal", icon: "warning" }
    );
    if (!confirmed) return;

    try {
      await deleteUser(id);
      await loadUsers();
      showToast("User berhasil dihapus", { icon: "success" });
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast(error.response?.data?.message || "Gagal menghapus user", { icon: "error" });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#1A56DB';
      case 'atasan': return '#F59E0B';
      case 'keuangan': return '#8B5CF6';
      case 'pegawai': return '#10B981';
      default: return '#64748B';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'atasan': return 'Kepala BPS SULTENG';
      case 'keuangan': return 'Keuangan';
      case 'pegawai': return 'Pegawai';
      default: return role;
    }
  };

  return (
    <AdminLayout>
      <div style={{ 
        minHeight: 'calc(100vh - 70px)',
        backgroundColor: '#f8fafc',
        padding: '20px'
      }}>
        
        {/* HEADER */}
        <div className="mb-4">
          <h1 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '700',
            color: '#1e293b'
          }}>
            <FaUsers style={{ color: '#1A56DB', marginRight: '10px' }} />
            Manajemen Akun Pengguna
          </h1>
        </div>

        {/* FORM */}
        <div className="card mb-4" style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          border: 'none'
        }}>
          <div className="card-header" style={{
            background: 'linear-gradient(135deg, #1A56DB 0%, #0EA5E9 100%)',
            color: 'white',
            padding: '20px'
          }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {editId ? <FaUserEdit /> : <FaUserPlus />}
                {editId ? " Edit Pengguna" : " Tambah Pengguna Baru"}
              </h5>
              {editId && (
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <FaTimes /> Batal
                </button>
              )}
            </div>
          </div>

          <div className="card-body" style={{ padding: '25px' }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Baris 1 */}
                <div className="col-md-3">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-control"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">
                    {editId ? "Password (opsional)" : "Password"}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={editId ? "Kosongkan jika tidak diubah" : "Min. 6 karakter"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editId}
                    minLength="6"
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      height: '46px'
                    }}
                  >
                    <option value="admin">Administrator</option>
                    <option value="atasan">Kepala BPS SULTENG</option>
                    <option value="keuangan">Keuangan</option>
                    <option value="pegawai">Pegawai</option>
                  </select>
                </div>

                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="submit"
                    className="btn w-100"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="spinner-border spinner-border-sm me-2" />
                        {editId ? "Menyimpan..." : "Menambah..."}
                      </>
                    ) : (
                      <>
                        {editId ? <FaSave className="me-2" /> : <FaUserPlus className="me-2" />}
                        {editId ? "Update" : "Tambah"}
                      </>
                    )}
                  </button>
                </div>

                {/* Baris 2 */}
                <div className="col-md-3">
                  <label className="form-label">NIP</label>
                  <input
                    type="text"
                    className="form-control"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Telepon</label>
                  <input
                    type="text"
                    className="form-control"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Unit Kerja</label>
                  <input
                    type="text"
                    className="form-control"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Alamat</label>
                  <input
                    type="text"
                    className="form-control"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px'
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* SEARCH */}
        <div className="card mb-4" style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          border: 'none'
        }}>
          <div className="card-body" style={{ padding: '20px' }}>
            <div className="input-group">
              <span className="input-group-text" style={{
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRight: 'none',
                borderRadius: '10px 0 0 10px'
              }}>
                <FaSearch />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Cari pengguna..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: '2px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRadius: '0 10px 10px 0',
                  padding: '12px'
                }}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="card" style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          border: 'none'
        }}>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '15px' }}>No</th>
                  <th style={{ padding: '15px' }}>Nama</th>
                  <th style={{ padding: '15px' }}>Email</th>
                  <th style={{ padding: '15px' }}>NIP</th>
                  <th style={{ padding: '15px' }}>Role</th>
                  <th style={{ padding: '15px' }}>Unit Kerja</th>
                  <th style={{ padding: '15px' }}>Telepon</th>
                  <th style={{ padding: '15px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Tidak ada data pengguna
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => (
                    <tr key={u.id}>
                      <td style={{ padding: '15px' }}>{index + 1}</td>
                      <td style={{ padding: '15px' }}>{u.nama}</td>
                      <td style={{ padding: '15px' }}>{u.email}</td>
                      <td style={{ padding: '15px' }}>{u.nip || '-'}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          backgroundColor: `${getRoleColor(u.role)}20`,
                          color: getRoleColor(u.role),
                          padding: '6px 15px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {getRoleName(u.role)}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>{u.unit_kerja || '-'}</td>
                      <td style={{ padding: '15px' }}>{u.telepon || '-'}</td>
                      <td style={{ padding: '15px' }}>
                        <button
                          className="btn btn-sm me-2"
                          onClick={() => handleEdit(u)}
                          style={{
                            background: '#F59E0B',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            marginRight: '5px'
                          }}
                        >
                          <FaUserEdit /> Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleDelete(u.id)}
                          style={{
                            background: '#EF4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px'
                          }}
                        >
                          <FaTrash /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))
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
