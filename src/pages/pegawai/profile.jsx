import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaUserTag,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaBuilding,
  FaEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaIdCard,
  FaHistory,
  FaLock,
  FaArrowLeft
} from "react-icons/fa";
import { getProfil } from "../../services/akun.service";
import { updateUser } from "../../services/akun.service";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    email: "",
    role: "",
    nip: "",
    telepon: "",
    alamat: "",
    unit_kerja: "",
    jabatan: ""
  });

  // Tema Sensus Ekonomi 2026
  const theme = {
    primary: "#1A56DB",
    secondary: "#0EA5E9",
    accent: "#F89039",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    dark: "#1E293B",
    light: "#F8FAFC",
    medium: "#64748B"
  };

  // Fungsi untuk kembali ke dashboard
  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Untuk profil sendiri
        if (!id) {
          // Ambil profil user yang login
          const userData = await getProfil();
          console.log("Profil user yang login:", userData);
          
          setUser(userData);
          setForm({
            nama: userData.nama || "",
            email: userData.email || "",
            role: userData.role || "",
            nip: userData.nip || "",
            telepon: userData.telepon || "",
            alamat: userData.alamat || "",
            unit_kerja: userData.unit_kerja || "",
            jabatan: userData.jabatan || ""
          });
        } else {
          // Jika ada ID di URL, berarti admin melihat profil user lain
          console.log("Mencoba mengambil profil dengan ID:", id);
          
          // Sementara gunakan getProfil() untuk user yang login
          const userData = await getProfil();
          setUser(userData);
          setForm({
            nama: userData.nama || "",
            email: userData.email || "",
            role: userData.role || "",
            nip: userData.nip || "",
            telepon: userData.telepon || "",
            alamat: userData.alamat || "",
            unit_kerja: userData.unit_kerja || "",
            jabatan: userData.jabatan || ""
          });
        }
        
      } catch (err) {
        console.error("Error fetching user profile:", err);
        
        // Tampilkan error yang lebih spesifik
        if (err.response) {
          if (err.response.status === 401) {
            setError("Session expired. Silakan login kembali.");
          } else if (err.response.status === 403) {
            setError("Akses ditolak. Anda tidak memiliki izin.");
          } else if (err.response.status === 404) {
            setError("Profil tidak ditemukan.");
          } else {
            setError(`Error ${err.response.status}: ${err.response.data?.message || 'Gagal memuat data profil'}`);
          }
        } else if (err.request) {
          setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
        } else {
          setError(err.message || "Gagal memuat data profil.");
        }
        
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      
      let response;
      
      if (id) {
        // Update user lain (admin)
        response = await updateUser(id, form);
      } else {
        // Update profil sendiri
        if (user && user.id) {
          response = await updateUser(user.id, form);
        } else {
          throw new Error("User ID tidak ditemukan");
        }
      }
      
      console.log("Update response:", response);
      
      // Update data user dengan data baru
      setUser(prevUser => ({
        ...prevUser,
        ...form
      }));
      
      setEditing(false);
      setSuccessMessage("Profil berhasil diperbarui!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error updating user:", err);
      
      if (err.response) {
        setError(`Error ${err.response.status}: ${err.response.data?.message || 'Gagal memperbarui profil'}`);
      } else {
        setError("Gagal memperbarui profil. Silakan coba lagi.");
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError("");
      
      // Catatan: Anda perlu menambahkan endpoint upload foto di backend
      const formData = new FormData();
      formData.append('foto_profil', file);

      // Sementara, kita tampilkan pesan bahwa fitur ini belum tersedia
      console.log("Upload photo:", file);
      
      // Simulasi upload
      setTimeout(() => {
        // Simulasi URL foto di browser tanpa path lokal server
        const simulatedPhotoUrl = URL.createObjectURL(file);
        setUser({ ...user, foto_profil: simulatedPhotoUrl });
        setSuccessMessage("Foto profil berhasil diunggah! (Simulasi)");
        setUploadingPhoto(false);
        setTimeout(() => setSuccessMessage(""), 3000);
      }, 1500);
      
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError("Fitur upload foto belum tersedia. Silakan hubungi administrator.");
      setUploadingPhoto(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return theme.primary;
      case 'atasan': return theme.accent;
      case 'keuangan': return "#8B5CF6";
      case 'pegawai': return theme.success;
      default: return theme.medium;
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'atasan': return 'Atasan';
      case 'keuangan': return 'Keuangan';
      case 'pegawai': return 'Pegawai';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="profile-loading" style={{ 
        background: theme.light, 
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div className="text-center">
          <FaSpinner className="spinner" style={{ 
            fontSize: '3rem', 
            color: theme.primary,
            animation: 'spin 1s linear infinite'
          }} />
          <h3 style={{ color: theme.dark, marginTop: '20px' }}>
            Memuat data profil...
          </h3>
          <button 
            onClick={handleBackToDashboard}
            className="btn mt-3"
            style={{
              background: theme.light,
              color: theme.primary,
              border: `1px solid ${theme.primary}`,
              borderRadius: '10px',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            <FaArrowLeft />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Jika error dan user null
  if (error && !user) {
    return (
      <div className="profile-error" style={{ 
        background: theme.light, 
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div className="text-center" style={{ maxWidth: '500px' }}>
          <FaExclamationTriangle style={{ 
            fontSize: '4rem', 
            color: theme.danger,
            marginBottom: '20px'
          }} />
          <h3 style={{ color: theme.dark, marginBottom: '15px' }}>
            Gagal Memuat Profil
          </h3>
          <p style={{ color: theme.medium, marginBottom: '25px' }}>
            {error}
          </p>
          <div className="d-flex gap-3 justify-content-center">
            <button 
              onClick={() => window.location.reload()}
              className="btn"
              style={{
                background: theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 30px',
                fontWeight: '600'
              }}
            >
              Coba Lagi
            </button>
            <button 
              onClick={handleBackToDashboard}
              className="btn"
              style={{
                background: theme.light,
                color: theme.primary,
                border: `1px solid ${theme.primary}`,
                borderRadius: '10px',
                padding: '12px 30px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaArrowLeft />
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Jika user null (tidak ada data)
  if (!user) {
    return (
      <div className="profile-no-data" style={{ 
        background: theme.light, 
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div className="text-center">
          <FaUser style={{ 
            fontSize: '4rem', 
            color: theme.medium,
            marginBottom: '20px'
          }} />
          <h3 style={{ color: theme.dark, marginBottom: '15px' }}>
            Profil Tidak Ditemukan
          </h3>
          <p style={{ color: theme.medium, marginBottom: '25px' }}>
            Data pengguna tidak ditemukan.
          </p>
          <button 
            onClick={handleBackToDashboard}
            className="btn"
            style={{
              background: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 30px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaArrowLeft />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container" style={{ 
      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header dengan tombol kembali */}
      <div className="profile-header" style={{
        marginBottom: '30px'
      }}>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <button
            onClick={handleBackToDashboard}
            className="btn"
            style={{
              background: theme.light,
              color: theme.primary,
              border: `1px solid ${theme.primary}`,
              borderRadius: '10px',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = `${theme.primary}15`;
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = theme.light;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <FaArrowLeft />
            Kembali ke Dashboard
          </button>
          
          {id && user && (
            <div style={{
              display: 'inline-block',
              background: `${theme.warning}15`,
              color: theme.warning,
              padding: '5px 15px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              Mode Admin: Melihat profil user ID {id}
            </div>
          )}
        </div>

        <h1 style={{ 
          color: theme.dark,
          fontWeight: '800',
          marginBottom: '10px'
        }}>
          <FaUser className="me-2" style={{ color: theme.primary }} />
          Profil Pengguna
        </h1>
        <p style={{ color: theme.medium }}>
          Sistem Presensi Dinas - Sensus Ekonomi 2026
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message" style={{
          background: `${theme.success}15`,
          border: `1px solid ${theme.success}`,
          color: theme.success,
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FaCheckCircle />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{
          background: `${theme.danger}15`,
          border: `1px solid ${theme.danger}`,
          color: theme.danger,
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      <div className="row">
        {/* Left Column - Photo & Basic Info */}
        <div className="col-md-4 mb-4">
          <div className="card profile-photo-card" style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            <div className="card-body text-center p-4">
              {/* Profile Photo */}
              <div className="profile-photo-wrapper" style={{
                position: 'relative',
                width: '150px',
                height: '150px',
                margin: '0 auto 20px'
              }}>
                {user?.foto_profil ? (
                  <img 
                    src={user.foto_profil} 
                    alt={user.nama}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      border: `5px solid ${theme.light}`,
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
                    }}
                    onError={(e) => {
                      // Fallback jika gambar gagal dimuat
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `5px solid ${theme.light}`,
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
                  }}>
                    <FaUser style={{ fontSize: '4rem', color: 'white' }} />
                  </div>
                )}
                
                {/* Photo Upload Overlay - hanya untuk user sendiri */}
                {!id && (
                  <label 
                    htmlFor="photo-upload"
                    className="photo-upload-overlay"
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      background: theme.primary,
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: `3px solid white`,
                      color: 'white'
                    }}
                  >
                    {uploadingPhoto ? (
                      <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <FaCamera />
                    )}
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* User Name */}
              <h3 style={{ 
                color: theme.dark,
                fontWeight: '700',
                marginBottom: '5px'
              }}>
                {user?.nama}
              </h3>
              
              {/* Role Badge */}
              <div style={{
                display: 'inline-block',
                background: getRoleBadgeColor(user?.role),
                color: 'white',
                padding: '5px 15px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '20px'
              }}>
                {getRoleName(user?.role)}
              </div>

              {/* Stats */}
              <div className="row text-center mt-4">
                <div className="col-4">
                  <div style={{
                    background: `${theme.primary}15`,
                    padding: '12px',
                    borderRadius: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: theme.primary
                    }}>
                      {user?.total_perjalanan || 0}
                    </div>
                    <small style={{ color: theme.medium }}>Dinas</small>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{
                    background: `${theme.success}15`,
                    padding: '12px',
                    borderRadius: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: theme.success
                    }}>
                      {user?.rating || '-'}
                    </div>
                    <small style={{ color: theme.medium }}>Rating</small>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{
                    background: `${theme.accent}15`,
                    padding: '12px',
                    borderRadius: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: theme.accent
                    }}>
                      {user?.status === 'aktif' ? '✓' : '✗'}
                    </div>
                    <small style={{ color: theme.medium }}>Status</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details & Edit Form */}
        <div className="col-md-8">
          <div className="card profile-details-card" style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            <div className="card-header" style={{
              background: 'linear-gradient(135deg, #1A56DB 0%, #0EA5E9 100%)',
              color: 'white',
              padding: '20px',
              border: 'none'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <FaUserTag className="me-2" />
                  Informasi Detail
                </h4>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '10px',
                      padding: '8px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <FaEdit />
                    Edit Profil
                  </button>
                )}
              </div>
            </div>

            <div className="card-body p-4">
              {editing ? (
                <form onSubmit={handleEdit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaUser className="me-2" style={{ color: theme.primary }} />
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        name="nama"
                        value={form.nama}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem',
                          transition: 'all 0.3s'
                        }}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaEnvelope className="me-2" style={{ color: theme.primary }} />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem'
                        }}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaIdCard className="me-2" style={{ color: theme.primary }} />
                        NIP
                      </label>
                      <input
                        type="text"
                        name="nip"
                        value={form.nip}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaPhone className="me-2" style={{ color: theme.primary }} />
                        Telepon
                      </label>
                      <input
                        type="tel"
                        name="telepon"
                        value={form.telepon}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    <div className="col-12 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaMapMarkerAlt className="me-2" style={{ color: theme.primary }} />
                        Alamat
                      </label>
                      <textarea
                        name="alamat"
                        value={form.alamat}
                        onChange={handleChange}
                        className="form-control"
                        rows="3"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaBuilding className="me-2" style={{ color: theme.primary }} />
                        Unit Kerja
                      </label>
                      <input
                        type="text"
                        name="unit_kerja"
                        value={form.unit_kerja}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label style={{ 
                        color: theme.dark,
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        <FaUserTag className="me-2" style={{ color: theme.primary }} />
                        Jabatan
                      </label>
                      <input
                        type="text"
                        name="jabatan"
                        value={form.jabatan}
                        onChange={handleChange}
                        className="form-control"
                        style={{
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <button
                      type="button"
                      onClick={handleBackToDashboard}
                      className="btn"
                      style={{
                        background: 'transparent',
                        color: theme.primary,
                        border: `1px solid ${theme.primary}`,
                        borderRadius: '12px',
                        padding: '12px 20px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = `${theme.primary}15`;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <FaArrowLeft />
                      Kembali
                    </button>
                    
                    <div className="d-flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="btn"
                        style={{
                          background: theme.light,
                          color: theme.dark,
                          border: `2px solid ${theme.light}`,
                          borderRadius: '12px',
                          padding: '12px 30px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#E2E8F0';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = theme.light;
                        }}
                      >
                        <FaTimes />
                        Batal
                      </button>
                      
                      <button
                        type="submit"
                        className="btn"
                        style={{
                          background: `linear-gradient(135deg, ${theme.success}, #0CA678)`,
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 30px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s',
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        <FaSave />
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaUser className="me-2" style={{ color: theme.primary }} />
                        Nama Lengkap
                      </div>
                      <div className="info-value">{user?.nama}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaEnvelope className="me-2" style={{ color: theme.primary }} />
                        Email
                      </div>
                      <div className="info-value">{user?.email}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaIdCard className="me-2" style={{ color: theme.primary }} />
                        NIP
                      </div>
                      <div className="info-value">{user?.nip || '-'}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaPhone className="me-2" style={{ color: theme.primary }} />
                        Telepon
                      </div>
                      <div className="info-value">{user?.telepon || '-'}</div>
                    </div>
                  </div>

                  <div className="col-12 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaMapMarkerAlt className="me-2" style={{ color: theme.primary }} />
                        Alamat
                      </div>
                      <div className="info-value">{user?.alamat || '-'}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaBuilding className="me-2" style={{ color: theme.primary }} />
                        Unit Kerja
                      </div>
                      <div className="info-value">{user?.unit_kerja || '-'}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaUserTag className="me-2" style={{ color: theme.primary }} />
                        Jabatan
                      </div>
                      <div className="info-value">{user?.jabatan || '-'}</div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaCalendarAlt className="me-2" style={{ color: theme.primary }} />
                        Tanggal Bergabung
                      </div>
                      <div className="info-value">
                        {user?.created_at ? 
                          new Date(user.created_at).toLocaleDateString('id-ID') : 
                          '-'}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="info-item">
                      <div className="info-label">
                        <FaUserTag className="me-2" style={{ color: theme.primary }} />
                        Status
                      </div>
                      <div className="info-value">
                        <span style={{
                          color: theme.success,
                          fontWeight: '600'
                        }}>
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol kembali di bawah form (jika tidak editing) */}
            {!editing && (
              <div className="card-footer" style={{
                background: theme.light,
                borderTop: `1px solid ${theme.light}`,
                padding: '20px',
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                <button
                  onClick={handleBackToDashboard}
                  className="btn"
                  style={{
                    background: 'transparent',
                    color: theme.primary,
                    border: `1px solid ${theme.primary}`,
                    borderRadius: '12px',
                    padding: '10px 25px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = `${theme.primary}15`;
                    e.currentTarget.style.transform = 'translateX(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <FaArrowLeft />
                  Kembali ke Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Additional Info Cards */}
          <div className="row mt-4">
            <div className="col-md-6 mb-4">
              <div className="card h-100" style={{
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)',
                border: 'none'
              }}>
                <div className="card-body">
                  <h5 style={{ 
                    color: theme.dark,
                    fontWeight: '600',
                    marginBottom: '15px'
                  }}>
                    <FaHistory className="me-2" style={{ color: theme.primary }} />
                    Aktivitas Terbaru
                  </h5>
                  <div className="activity-list">
                    <div className="activity-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 0'
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: theme.success,
                        marginRight: '15px'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: theme.dark, fontWeight: '500' }}>
                          Melihat Profil
                        </div>
                        <small style={{ color: theme.medium }}>Sekarang</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card h-100" style={{
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)',
                border: 'none'
              }}>
                <div className="card-body">
                  <h5 style={{ 
                    color: theme.dark,
                    fontWeight: '600',
                    marginBottom: '15px'
                  }}>
                    <FaLock className="me-2" style={{ color: theme.primary }} />
                    Keamanan Akun
                  </h5>
                  <div className="security-list">
                    <div className="security-item" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0'
                    }}>
                      <div>
                        <div style={{ color: theme.dark, fontWeight: '500' }}>
                          Status Akun
                        </div>
                        <small style={{ color: theme.success }}>
                          Terverifikasi
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS inline untuk spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        .info-label {
          color: #64748B;
          font-size: 0.9rem;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
        }
        
        .info-value {
          color: #1E293B;
          font-size: 1rem;
          font-weight: 500;
          padding: 8px 12px;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }
        
        .form-control:focus {
          border-color: #1A56DB !important;
          box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
