import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";

export default function Login() {
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // State untuk visibility password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Deteksi layar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    nip: "",
    telepon: "",
    alamat: "",
    unit_kerja: ""
  });

  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password || (isRegister && !form.nama)) {
      return setError("Semua field wajib diisi");
    }

    // Validasi tambahan untuk register
    if (isRegister) {
      if (!form.nip || !form.telepon || !form.alamat || !form.unit_kerja) {
        return setError("Semua field registrasi wajib diisi");
      }
      if (form.password.length < 6) {
        return setError("Password minimal 6 karakter");
      }
      if (form.password !== confirmPassword) {
        return setError("Konfirmasi password tidak cocok");
      }
    }

    try {
      setLoading(true);

      // ================= REGISTER =================
      if (isRegister) {
        await api.post("/auth/register", form);
        alert("Registrasi berhasil, silakan login");
        setIsRegister(false);
        setForm({ 
          nama: "", 
          email: "", 
          password: "", 
          nip: "",
          telepon: "",
          alamat: "",
          unit_kerja: ""
        });
        setConfirmPassword("");
        return;
      }

      // ================= LOGIN =================
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      console.log("LOGIN RESPONSE:", res.data);

      // AMBIL TOKEN
      const token =
        res.data.token ||
        res.data.data?.token ||
        res.data.accessToken;

      // AMBIL USER
      const user =
        res.data.user ||
        res.data.data?.user;

      if (!token || !user) {
        console.error("RESPONSE TIDAK SESUAI:", res.data);
        throw new Error("Format response login tidak sesuai backend");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // REDIRECT ROLE
      if (user.role === "admin") {
        window.location.href = "/dashboard-admin";
      } else if (user.role === "atasan") {
        window.location.href = "/dashboard-atasan";
      } 
      else if (user.role === "keuangan") {
        window.location.href = "/dashboard-keuangan";
      } else {
        window.location.href = "/dashboard";
      }

    } catch (err) {
      console.log("LOGIN ERROR:", err);
      console.log("RESPONSE:", err.response);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Proses gagal"
      );
    } finally {
      setLoading(false);
    }
  };

  // TAMPILAN MOBILE YANG BERBEDA
  if (isMobile) {
    return (
      <>
        <style>{mobileCss}</style>
        <div className="mobile-auth">
          {/* Dekorasi Atas */}
          <div className="mobile-decoration">
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
          </div>

          {/* Header dengan Logo */}
          <div className="mobile-header">
            <div className="logo-wrapper">
              <div className="logo-icon">📊</div>
            </div>
            <h1>CATUR</h1>
            <p>Control Activity And Time Use Record</p>
          </div>

          {/* Card Utama */}
          <div className="mobile-card">
            {/* Tab Switcher */}
            <div className="tab-switcher">
              <button 
                className={`tab-btn ${!isRegister ? 'active' : ''}`}
                onClick={() => setIsRegister(false)}
              >
                Masuk
              </button>
              <button 
                className={`tab-btn ${isRegister ? 'active' : ''}`}
                onClick={() => setIsRegister(true)}
              >
                Daftar
              </button>
            </div>

            {/* Form Container dengan Animasi */}
            <div className="form-container-mobile">
              {/* FORM LOGIN */}
              <div className={`form-wrapper login-wrapper ${!isRegister ? 'active' : ''}`}>
                <form onSubmit={handleSubmit}>
                  <h2>Selamat Datang Kembali</h2>
                  <p className="form-subtitle">Silakan masuk ke akun Anda</p>
                  
                  {error && <div className="error-message">{error}</div>}

                  <div className="input-group">
                    <span className="input-icon">📧</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group password-group">
                    <span className="input-icon">🔒</span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>

                  <div className="form-options">
                    <label className="checkbox-label">
                      <input type="checkbox" /> Ingat saya
                    </label>
                    <Link to="/Resetpassword" className="forgot-link">
                      Lupa Password?
                    </Link>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Memproses..." : "Masuk"}
                  </button>
                </form>
              </div>

              {/* FORM REGISTER */}
              <div className={`form-wrapper register-wrapper ${isRegister ? 'active' : ''}`}>
                <form onSubmit={handleSubmit}>
                  <h2>Buat Akun Baru</h2>
                  <p className="form-subtitle">Daftar untuk menggunakan CATUR</p>
                  
                  {error && <div className="error-message">{error}</div>}

                  <div className="input-group">
                    <span className="input-icon">👤</span>
                    <input
                      name="nama"
                      placeholder="Nama Lengkap"
                      value={form.nama}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-icon">📧</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-icon">🆔</span>
                    <input
                      name="nip"
                      placeholder="NIP"
                      value={form.nip}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-icon">📞</span>
                    <input
                      name="telepon"
                      placeholder="Telepon"
                      value={form.telepon}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-icon">📍</span>
                    <input
                      name="alamat"
                      placeholder="Alamat"
                      value={form.alamat}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-icon">🏢</span>
                    <input
                      name="unit_kerja"
                      placeholder="Unit Kerja"
                      value={form.unit_kerja}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group password-group">
                    <span className="input-icon">🔒</span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>

                  <div className="input-group password-group">
                    <span className="input-icon">✓</span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Konfirmasi Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Memproses..." : "Daftar"}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="mobile-footer">
              <p>Dengan mendaftar, Anda menyetujui</p>
              <div className="footer-links">
                <Link to="#">Syarat & Ketentuan</Link>
                <span>•</span>
                <Link to="#">Kebijakan Privasi</Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // TAMPILAN DESKTOP (PERSIS SEPERTI ASLI)
  return (
    <>
      <style>{desktopCss}</style>

      <div className="auth-page">
        {/* LEFT BACKGROUND */}
        <div className="auth-left">
          {/* optional logo / text */}
        </div>

        {/* RIGHT LOGIN */}
        <div className="auth-right">
          <div className={`container ${isRegister ? "right-panel-active" : ""}`}>
            {/* REGISTER */}
            <div className="form-container register-container">
              <form onSubmit={handleSubmit}>
                <h1>Registrasi</h1>
                {error && <p className="error">{error}</p>}

                <input
                  name="nama"
                  placeholder="Nama Lengkap"
                  value={form.nama}
                  onChange={handleChange}
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                />
                <input
                  name="nip"
                  placeholder="NIP"
                  value={form.nip}
                  onChange={handleChange}
                />
                <input
                  name="telepon"
                  placeholder="Telepon"
                  value={form.telepon}
                  onChange={handleChange}
                />
                <input
                  name="alamat"
                  placeholder="Alamat"
                  value={form.alamat}
                  onChange={handleChange}
                />
                <input
                  name="unit_kerja"
                  placeholder="Unit Kerja"
                  value={form.unit_kerja}
                  onChange={handleChange}
                />
                <div className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-desktop"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-desktop"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? "Memproses..." : "Registrasi"}
                </button>
              </form>
            </div>

            {/* LOGIN */}
            <div className="form-container login-container">
              <form onSubmit={handleSubmit}>
                <h1>Masuk</h1>
                {error && <p className="error">{error}</p>}

                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                />
                <div className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-desktop"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                <div className="content">
                  <label>
                    <input type="checkbox" /> Remember me
                  </label>
                  <Link
                    to="/Resetpassword"
                    className={location.pathname === "/Resetpassword" ? "active" : ""}
                  >
                    Lupa Password?
                  </Link>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? "Masuk..." : "Masuk"}
                </button>
              </form>
            </div>

            {/* OVERLAY */}
            <div className="overlay-container">
              <div className="overlay">
                <div className="overlay-panel overlay-left">
                  <h1>Hallo Teman BPS</h1>
                  <p>Sudah punya akun?</p>
                  <button className="ghost" onClick={() => setIsRegister(false)}>
                    Masuk
                  </button>
                </div>

                <div className="overlay-panel overlay-right">
                  <h1 >Welcome To CATUR</h1>
                  <h2>Control Activity And Time Use Record</h2>
                  <p>Belum punya akun?</p>
                  <button className="ghost" onClick={() => setIsRegister(true)}>
                    Registrasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= CSS DESKTOP (PERSIS ASLI) ================= */
const desktopCss = `
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap");

* {
  box-sizing: border-box;
  font-family: "Poppins", sans-serif;
}

.auth-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* LEFT */
.auth-left {
  flex: 1;
  background-image: url("../img/cover.png");
  background-size: cover;
  background-position: center;
}

/* RIGHT */
.auth-right {
  width: 50%;
  min-width: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  
}

/* CARD */
.container {
  background: #fff;
  border-radius: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
  width: 800px;
  max-width: 95%;
  min-height: 520px;
}

.form-container {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  transition: 0.6s;
}

.login-container {
  left: 0;
  z-index: 2;
}

.register-container {
  left: 0;
  opacity: 0;
  z-index: 1;
}

.container.right-panel-active .login-container {
  transform: translateX(100%);
}

.container.right-panel-active .register-container {
  transform: translateX(100%);
  opacity: 1;
  z-index: 5;
}

form {
  background: #fff;
  height: 100%;
  padding: 0 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

input {
  background: #eee;
  border: none;
  padding: 12px;
  margin: 8px 0;
  border-radius: 10px;
  width: 100%;
}

.password-field {
  position: relative;
  width: 100%;
  margin: 8px 0;
}

.password-field input {
  margin: 0;
  padding-right: 45px;
}

.password-toggle-desktop {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  margin: 0;
  color: #666;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle-desktop:hover {
  background: transparent;
  color: #ff6f0f;
}

button {
  margin-top: 15px;
  border-radius: 20px;
  border: none;
  padding: 12px;
  background: #ff6f0f;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button.ghost {
  background: transparent;
  border: 2px solid white;
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
}

.overlay {
  background: linear-gradient(to right, #ff6f0f, #ff8f40);
  color: white;
  position: relative;
  left: -100%;
  width: 200%;
  height: 100%;
  transition: 0.6s;
}

.container.right-panel-active .overlay {
  transform: translateX(50%);
}

.overlay-panel {
  position: absolute;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.overlay-right {
  right: 0;
}

.content {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
* {
  box-sizing: border-box;
}


h1 {
  font-weight: 700;
  letter-spacing: -1.5px;
  margin: 0;
  margin-bottom: 15px;
}

h1.title {
  font-size: 45px;
  line-height: 45px;
  margin: 0;
  text-shadow: 0 0 10px rgba(16, 64, 74, 0.5);
}

p {
  font-size: 14px;
  font-weight: 100;
  line-height: 20px;
  letter-spacing: 0.5px;
  margin: 20px 0 30px;
  text-shadow: 0 0 10px rgba(16, 64, 74, 0.5);
}

span {
  font-size: 14px;
  margin-top: 25px;
}

a {
  color: #333;
  font-size: 14px;
  text-decoration: none;
  margin: 15px 0;
  transition: 0.3s ease-in-out;
}

a:hover {
  color: #4bb6b7;
}

.content {
  display: flex;
  width: 120%;
  height: 50px;
  align-items: center;
  justify-content: space-around;
}

.content .checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.content input {
  accent-color: #333;
  width: 12px;
  height: 12px;
}

.content label {
  font-size: 14px;
  user-select: none;
  padding-left: 5px;
}

button {
  position: relative;
  border-radius: 20px;
  border: 1px solid #FF6F0F;
  background-color: #FF6F0F;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  margin: 10px;
  padding: 12px 80px;
  letter-spacing: 1px;
  text-transform: capitalize;
  transition: 0.3s ease-in-out;
}

button:hover {
  letter-spacing: 3px;
}

button:active {
  transform: scale(0.95);
}

button:focus {
  outline: none;
}

button.ghost {
  background-color: rgba(225, 225, 225, 0.2);
  border: 2px solid #fff;
  color: #fff;
}

button.ghost i{
  position: absolute;
  opacity: 0;
  transition: 0.3s ease-in-out;
}

button.ghost i.register{
  right: 70px;
}

button.ghost i.login{
  left: 70px;
}

button.ghost:hover i.register{
  right: 40px;
  opacity: 1;
}

button.ghost:hover i.login{
  left: 40px;
  opacity: 1;
}

form {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 50px;
  height: 100%;
  text-align: center;
}

input {
  background-color: #eee;
  border-radius: 10px;
  border: none;
  padding: 12px 15px;
  margin: 8px 0;
  width: 100%;
}

.container {
  background-color: #fff;
  border-radius: 25px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
              0 10px 10px rgba(0, 0, 0, 0.22);
  position: relative;
  overflow: hidden;

  width: 820px;
  max-width: 95%;
  min-height: 650px;

  transform: translateY(40px); /* TURUNKAN SEDIKIT */
}


.form-container {
  position: absolute;
  top: 0;
  height: 100%;
  transition: all 0.6s ease-in-out;
}

.login-container {
  left: 0;
  width: 50%;
  z-index: 2;
}

.container.right-panel-active .login-container {
  transform: translateX(100%);
}

.register-container {
  left: 0;
  width: 50%;
  opacity: 0;
  z-index: 1;
}

.container.right-panel-active .register-container {
  transform: translateX(100%);
  opacity: 1;
  z-index: 5;
  animation: show 0.6s;
}

@keyframes show {
  0%,
  49.99% {
    opacity: 0;
    z-index: 1;
  }

  50%,
  100% {
    opacity: 1;
    z-index: 5;
  }
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
  transition: transform 0.6s ease-in-out;
  z-index: 100;
}

.container.right-panel-active .overlay-container {
  transform: translate(-100%);
}

.overlay {
  background-image: url('../img/logo.jpg');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: 0 0;
  color: #fff;
  position: relative;
  left: -100%;
  height: 100%;
  width: 200%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(
    to top,
    rgba(46, 94, 109, 0.4) 40%,
    rgba(46, 94, 109, 0)
  );
}

.container.right-panel-active .overlay {
  transform: translateX(50%);
}

.overlay-panel {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 40px;
  text-align: center;
  top: 0;
  height: 100%;
  width: 50%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay-left {
  transform: translateX(-20%);
}

.container.right-panel-active .overlay-left {
  transform: translateX(0);
}

.overlay-right {
  right: 0;
  transform: translateX(0);
}

.container.right-panel-active .overlay-right {
  transform: translateX(20%);
}

.social-container {
  margin: 20px 0;
}

.social-container a {
  border: 1px solid #dddddd;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin: 0 5px;
  height: 40px;
  width: 40px;
  transition: 0.3s ease-in-out;
}

.social-container a:hover {
  border: 1px solid #4e8b95;
}
@media (max-width: 768px) {
  body {
    align-items: flex-start;
    padding-top: 30px;
  }

  .container {
    width: 95%;
    min-height: auto;
    transform: none;
  }

  .overlay-container {
    display: none;
  }

  .login-container,
  .register-container {
    width: 100%;
    position: relative;
    transform: none !important;
  }

  form {
    padding: 30px 20px;
  }

  button {
    padding: 12px 40px;
  }
}

@media (max-width: 1024px) {
  .container {
    width: 90%;
    min-height: auto;
  }
}
.error {
  color: red;
  font-size: 14px;
}

/* RESPONSIVE */
@media (max-width: 992px) {
  .auth-left {
    display: none;
  }

  .auth-right {
    width: 100%;
    min-width: 100%;
  }
}
`;

/* ================= CSS MOBILE YANG MENARIK ================= */
const mobileCss = `
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap");

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Poppins", sans-serif;
}

body {
  background: #f8fafc;
}

.mobile-auth {
  min-height: 100vh;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  position: relative;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Dekorasi Lingkaran */
.mobile-decoration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6f0f20 0%, #ff8f4020 100%);
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  background: linear-gradient(135deg, #ff6f0f15 0%, #ff8f4015 100%);
}

.circle-2 {
  width: 250px;
  height: 250px;
  bottom: -50px;
  left: -100px;
  background: linear-gradient(135deg, #ff8f4015 0%, #ff6f0f15 100%);
}

/* Header */
.mobile-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.logo-wrapper {
  margin-bottom: 15px;
}

.logo-icon {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #ff6f0f, #ff8f40);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 35px;
  color: white;
  box-shadow: 0 10px 25px rgba(255,111,15,0.3);
  transform: rotate(-5deg);
  transition: transform 0.3s ease;
}

.logo-icon:hover {
  transform: rotate(0deg);
}

.mobile-header h1 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6f0f, #ff8f40);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 5px;
  letter-spacing: -0.5px;
}

.mobile-header p {
  color: #64748b;
  font-size: 14px;
  font-weight: 400;
}

/* Card Utama */
.mobile-card {
  background: white;
  border-radius: 30px;
  padding: 25px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.5);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Tab Switcher */
.tab-switcher {
  display: flex;
  background: #f1f5f9;
  border-radius: 15px;
  padding: 5px;
  margin-bottom: 25px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  color: #64748b;
  transition: all 0.3s ease;
  cursor: pointer;
}

.tab-btn.active {
  background: white;
  color: #ff6f0f;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

/* Form Container */
.form-container-mobile {
  position: relative;
  min-height: 400px;
  overflow: hidden;
}

.form-wrapper {
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateX(50px);
  pointer-events: none;
}

.form-wrapper.active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: all;
  position: relative;
}

.login-wrapper {
  transform: translateX(-50px);
}

.login-wrapper.active {
  transform: translateX(0);
}

.register-wrapper {
  transform: translateX(50px);
}

.register-wrapper.active {
  transform: translateX(0);
}

/* Form Styling */
form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

form h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 5px;
}

.form-subtitle {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 15px;
}

/* Input Group */
.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 15px;
  font-size: 18px;
  color: #94a3b8;
  z-index: 1;
}

.input-group input {
  width: 100%;
  padding: 15px 15px 15px 50px;
  border: 2px solid #e2e8f0;
  border-radius: 15px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.input-group input:focus {
  outline: none;
  border-color: #ff6f0f;
  background: white;
  box-shadow: 0 0 0 4px rgba(255,111,15,0.1);
}

.input-group input::placeholder {
  color: #94a3b8;
}

/* Password Group */
.password-group {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 15px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  color: #94a3b8;
  transition: color 0.3s ease;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.password-toggle:hover {
  color: #ff6f0f;
  background: rgba(255,111,15,0.1);
}

.password-toggle:active {
  transform: scale(0.95);
}

/* Form Options */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  font-size: 13px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #ff6f0f;
}

.forgot-link {
  color: #ff6f0f;
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

/* Submit Button */
.submit-btn {
  background: linear-gradient(135deg, #ff6f0f, #ff8f40);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 15px;
  font-weight: 600;
  font-size: 16px;
  margin-top: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255,111,15,0.3);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255,111,15,0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
  cursor: not-allowed;
}

/* Error Message */
.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 15px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 15px;
  border-left: 4px solid #dc2626;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Footer */
.mobile-footer {
  margin-top: 25px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.mobile-footer p {
  color: #64748b;
  font-size: 12px;
  margin-bottom: 10px;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
}

.footer-links a {
  color: #ff6f0f;
  text-decoration: none;
  font-weight: 500;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-links span {
  color: #cbd5e1;
}

/* Animasi Input */
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255,111,15,0.4); }
  70% { box-shadow: 0 0 0 5px rgba(255,111,15,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,111,15,0); }
}

.input-group input:focus {
  animation: pulse 1s infinite;
}

/* Loading Animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.submit-btn:disabled::after {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-left: 10px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Responsive Adjustments */
@media (max-width: 480px) {
  .mobile-card {
    padding: 20px;
  }
  
  form h2 {
    font-size: 20px;
  }
  
  .input-group input {
    padding: 12px 12px 12px 45px;
  }
  
  .input-icon {
    left: 12px;
    font-size: 16px;
  }
  
  .submit-btn {
    padding: 14px;
  }
  
  .password-toggle {
    right: 12px;
    font-size: 18px;
  }
}

@media (max-width: 360px) {
  .mobile-header h1 {
    font-size: 28px;
  }
  
  .logo-icon {
    width: 60px;
    height: 60px;
    font-size: 30px;
  }
  
  .form-options {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
`;