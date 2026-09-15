//RAFI NAUFAL YASSAR RAMADHAN 
//CONTACT PERSON : 082273370260
import { useState, useEffect, useMemo } from "react";
import api from "../../api/axios";
import AdminLayout from "../../layouts/AdminLayout";
import LocationPicker from "./LocationPicker";
import {
  FaMapMarkerAlt,
  FaSave,
  FaCrosshairs,
  FaGlobeAsia,
  FaEdit,
  FaTrash,
  FaDatabase,
  FaDrawPolygon,
  FaDotCircle,
  FaInfoCircle,
  FaLayerGroup,
  FaSyncAlt
} from "react-icons/fa";
import { confirmAction, showToast } from "../../utils/alerts";
import "../../css/AdminDaerah.css";

const defaultForm = {
  id: null,
  nama_daerah: "",
  titik_lokasi: "",
  latitude: "",
  longitude: "",
  radius: 200,
  geojson: "",
};

export default function AdminDaerah() {
  const [form, setForm] = useState(defaultForm);
  const [inputMode, setInputMode] = useState("radius");
  const [daerahList, setDaerahList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mapKey, setMapKey] = useState(Date.now());
  const [syncing, setSyncing] = useState(false);

  const radiusPresets = useMemo(() => [50, 100, 200, 500, 1000, 2000], []);
  const normalizeLevel = (value) => String(value || "").trim().toLowerCase();
  const getLevelLabel = (value) => {
    const normalized = normalizeLevel(value);
    if (normalized === "kabupaten") return "Kabupaten/Kota";
    if (normalized === "kecamatan") return "Kecamatan";
    if (normalized === "lainnya") return "Lainnya";
    return value || "-";
  };

  useEffect(() => {
    fetchDaerah();
  }, []);

  const fetchDaerah = async () => {
    try {
      setLoading(true);
      const response = await api.get("/daerah");
      setDaerahList(response.data);
    } catch (error) {
      console.error("Gagal mengambil data daerah:", error);
      showToast("Gagal mengambil data daerah", { icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = ({ lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setInputMode("radius");
    setMapKey(Date.now());
  };

  const validateGeojson = (raw) => {
    try {
      const parsed = JSON.parse(raw);
      const validTypes = ["Feature", "FeatureCollection", "Polygon", "MultiPolygon"];
      if (!parsed || !parsed.type || !validTypes.includes(parsed.type)) {
        return { ok: false, message: "GeoJSON harus berupa Feature/FeatureCollection/Polygon/MultiPolygon" };
      }
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, message: "Format GeoJSON tidak valid" };
    }
  };

  const getGeojsonCenter = (raw) => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed) return null;

      const features = parsed.type === "FeatureCollection"
        ? parsed.features || []
        : parsed.type === "Feature"
          ? [parsed]
          : [{ geometry: parsed }];

      const points = [];
      const collect = (value) => {
        if (!Array.isArray(value)) return;
        if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
          points.push([value[0], value[1]]);
          return;
        }
        value.forEach(collect);
      };

      features.forEach((feature) => collect(feature?.geometry?.coordinates));
      if (!points.length) return null;

      const lngList = points.map((item) => item[0]);
      const latList = points.map((item) => item[1]);

      return {
        latitude: (Math.min(...latList) + Math.max(...latList)) / 2,
        longitude: (Math.min(...lngList) + Math.max(...lngList)) / 2,
      };
    } catch {
      return null;
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.nama_daerah.trim()) {
      alert("Nama daerah harus diisi");
      return;
    }

    if (!form.titik_lokasi) {
      alert("Level wilayah harus dipilih");
      return;
    }

    if (inputMode === "radius" && (!form.latitude || !form.longitude)) {
      alert("Silakan pilih lokasi di peta");
      return;
    }

    if (inputMode === "radius" && Number(form.radius) <= 0) {
      alert("Radius harus lebih dari 0 meter");
      return;
    }

    let parsedGeojson = null;
    if (inputMode === "geojson") {
      if (!form.geojson.trim()) {
        alert("GeoJSON wajib diisi untuk mode polygon");
        return;
      }
      const result = validateGeojson(form.geojson.trim());
      if (!result.ok) {
        alert(result.message);
        return;
      }
      parsedGeojson = result.value;
    }

    const geojsonCenter = inputMode === "geojson" ? getGeojsonCenter(parsedGeojson) : null;
    const finalLatitude = inputMode === "geojson"
      ? (form.latitude ?? geojsonCenter?.latitude ?? "")
      : form.latitude;
    const finalLongitude = inputMode === "geojson"
      ? (form.longitude ?? geojsonCenter?.longitude ?? "")
      : form.longitude;

    if (finalLatitude === "" || finalLongitude === "") {
      alert("Titik tengah area tidak bisa dihitung dari data yang diberikan");
      return;
    }

    try {
      const dataToSend = {
        nama_daerah: form.nama_daerah,
        titik_lokasi: form.titik_lokasi,
        latitude: finalLatitude,
        longitude: finalLongitude,
        radius: inputMode === "radius" ? Number(form.radius) : 0,
        geojson: inputMode === "geojson" ? parsedGeojson : null,
      };

      if (editingId) {
        await api.put(`/daerah/${editingId}`, dataToSend);
        showToast("Daerah berhasil diupdate", { icon: "success" });
      } else {
        await api.post("/daerah", dataToSend);
        showToast("Daerah berhasil disimpan", { icon: "success" });
      }

      resetForm();
      fetchDaerah();
    } catch (error) {
      console.error(error);
      showToast(`Gagal ${editingId ? "mengupdate" : "menyimpan"} daerah`, { icon: "error" });
    }
  };

  const handleEdit = (daerah) => {
    const geojsonValue = daerah.geojson
      ? typeof daerah.geojson === "string"
        ? daerah.geojson
        : JSON.stringify(daerah.geojson, null, 2)
      : "";

    setForm({
      id: daerah.id,
      nama_daerah: daerah.nama_daerah,
      titik_lokasi: daerah.titik_lokasi || daerah.level || daerah.titikLokasi || "",
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius ?? 0,
      geojson: geojsonValue,
    });

    setInputMode(daerah.geojson ? "geojson" : "radius");
    setEditingId(daerah.id);
    setMapKey(Date.now());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, namaDaerah) => {
    const confirmed = await confirmAction(
      `Apakah Anda yakin ingin menghapus daerah "${namaDaerah}"?`,
      { title: "Hapus Daerah", confirmText: "Hapus", cancelText: "Batal", icon: "warning" }
    );
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/daerah/${id}`);
      showToast(`Daerah "${namaDaerah}" berhasil dihapus`, { icon: "success" });
      fetchDaerah();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Gagal menghapus daerah:", error);
      showToast("Gagal menghapus daerah", { icon: "error" });
    }
  };

  const handleSyncGeojson = async () => {
    try {
      setSyncing(true);
      await api.post("/daerah/sync-geojson?level=all");
      await fetchDaerah();
      showToast("Sinkronisasi GeoJSON selesai", { icon: "success" });
    } catch (error) {
      console.error("Gagal sinkronisasi GeoJSON:", error);
      showToast("Gagal sinkronisasi GeoJSON", { icon: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const isGeojsonMode = inputMode === "geojson";
  const isRadiusMode = inputMode === "radius";
  const radiusSliderMin = Math.min(50, Number(form.radius) || 50);
  const radiusSliderMax = Math.max(50000, Number(form.radius) || 0);

  return (
    <AdminLayout>
      <div className="admin-daerah-container">
        <div className="header-section">
          <h1 className="page-title">
            <FaGlobeAsia className="title-icon" />
            Kelola Daerah Presensi
          </h1>
          <p className="page-subtitle">
            Atur wilayah presensi dengan dua metode: radius (lingkaran) atau GeoJSON polygon untuk presisi area.
          </p>
        </div>

        <div className="row mt-4">
          <div className="col-lg-5 mb-4">
            <div className="form-card">
              <div className="form-header">
                <div className="card-title">
                  <FaMapMarkerAlt className="me-2" />
                  {editingId ? "Edit Daerah Presensi" : "Input Daerah Presensi"}
                </div>
                <small>
                  Lengkapi data wilayah dan pilih metode area yang diinginkan.
                </small>
              </div>

              <div className="p-4">
                {editingId && (
                  <div className="alert alert-warning mb-3">
                    <small>Anda sedang mengedit data. Klik simpan untuk memperbarui.</small>
                  </div>
                )}

                <form onSubmit={submit}>
                  <div className="form-group">
                    <label className="form-label">
                      Nama Daerah <span className="required">*</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder="Contoh: Kabupaten Donggala"
                      value={form.nama_daerah}
                      onChange={(e) => setForm({ ...form, nama_daerah: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Level Wilayah</label>
                    <select
                      className="form-control"
                      value={form.titik_lokasi}
                      onChange={(e) => setForm({ ...form, titik_lokasi: e.target.value })}
                    >
                      <option value="">-- Pilih Level --</option>
                      <option value="kabupaten">Kabupaten/Kota</option>
                      <option value="kecamatan">Kecamatan</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Metode Area</label>
                    <div className="input-mode-toggle">
                      <button
                        type="button"
                        className={`mode-btn ${isRadiusMode ? "active" : ""}`}
                        onClick={() => setInputMode("radius")}
                      >
                        <FaDotCircle className="me-2" />
                        Radius
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${isGeojsonMode ? "active" : ""}`}
                        onClick={() => setInputMode("geojson")}
                      >
                        <FaDrawPolygon className="me-2" />
                        GeoJSON Polygon
                      </button>
                    </div>
                    <small className="form-text">
                      {isRadiusMode
                        ? "Gunakan radius jika hanya butuh area lingkaran sederhana."
                        : "Gunakan GeoJSON untuk batas wilayah yang presisi."}
                    </small>
                  </div>

                  {isRadiusMode && (
                    <div className="form-group">
                      <div className="radius-header">
                        <label className="form-label mb-0">Radius Presensi</label>
                        <div className="radius-conversion">
                          <span>≈</span>
                          <span className="radius-display-value">{(Number(form.radius) / 1000).toFixed(2)} km</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        className="radius-slider"
                        min={radiusSliderMin}
                        max={radiusSliderMax}
                        step="1"
                        value={form.radius}
                        onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        className="form-control mt-3"
                        min="1"
                        step="1"
                        value={form.radius}
                        onChange={(e) => setForm({ ...form, radius: Math.max(1, Number(e.target.value) || 0) })}
                        placeholder="Masukkan radius bebas dalam meter"
                      />
                      <div className="radius-scale">
                        <small>50m</small>
                        <small>1km</small>
                        <small>3km</small>
                        <small>50km+</small>
                      </div>
                      <div className="radius-presets d-flex flex-wrap gap-2 mt-3">
                        {radiusPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`radius-preset-btn ${Number(form.radius) === preset ? "active" : ""}`}
                            onClick={() => setForm({ ...form, radius: Number(preset) })}
                          >
                            {preset >= 1000 ? `${preset / 1000} km` : `${preset} m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isGeojsonMode && (
                    <div className="form-group">
                      <label className="form-label">
                        GeoJSON <span className="required">*</span>
                      </label>
                      <textarea
                        className="form-control geojson-input"
                        rows="6"
                        placeholder="Tempel GeoJSON Polygon/FeatureCollection di sini"
                        value={form.geojson}
                        onChange={(e) => setForm({ ...form, geojson: e.target.value })}
                      />
                      <small className="form-text">
                        Format valid: Feature, FeatureCollection, Polygon, atau MultiPolygon.
                        Titik tengah area akan dihitung otomatis, jadi Anda tidak wajib klik peta terlebih dahulu.
                      </small>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">Latitude</label>
                        <input
                          className="form-control coordinate-input"
                          placeholder="Akan terisi otomatis"
                          value={form.latitude}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">Longitude</label>
                        <input
                          className="form-control coordinate-input"
                          placeholder="Akan terisi otomatis"
                          value={form.longitude}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn-submit" disabled={loading}>
                      <FaSave className="me-2" />
                      {editingId ? "Update" : "Simpan"} Daerah
                    </button>
                    {editingId && (
                      <button type="button" className="btn-reset" onClick={resetForm}>
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="map-card">
              <div className="map-header">
                <div className="card-title">
                  <FaCrosshairs className="me-2" />
                  Pilih Lokasi di Peta
                </div>
                <small>
                  Klik peta untuk menentukan pusat area. Radius akan tampil jika mode radius aktif.
                </small>
              </div>

              <div >
                <LocationPicker
                  key={mapKey}
                  onSelect={handleMapSelect}
                  radius={isRadiusMode ? Number(form.radius) : 0}
                  initialLocation={
                    form.latitude && form.longitude
                      ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
                      : null
                  }
                  showMarker={Boolean(form.latitude && form.longitude)}
                  showCircle={isRadiusMode}
                />

                {!form.latitude && (
                  <div className="map-instructions">
                    <FaCrosshairs className="instructions-icon" />
                    <h5>Pilih Lokasi Presensi</h5>
                    <p>Klik pada peta untuk menentukan titik pusat area presensi.</p>
                    <div className="instruction-steps">
                      <div className="instruction-step">
                        <span className="step-number">1</span>
                        <span>Klik lokasi di peta</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">2</span>
                        <span>Atur radius/isi GeoJSON</span>
                      </div>
                    </div>
                  </div>
                )}

                {form.latitude && (
                  <div className="selection-info">
                    <h6>
                      <FaMapMarkerAlt /> Lokasi Terpilih
                    </h6>
                    <div className="location-name">
                      {form.nama_daerah || "Belum diberi nama"}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap">
                      <div className="text-muted">
                        Lat: {form.latitude} | Lng: {form.longitude}
                      </div>
                      {isRadiusMode && (
                        <div className="radius-badge">
                          Radius: <strong>{form.radius} m</strong>
                        </div>
                      )}
                      {isGeojsonMode && (
                        <div className="radius-badge" style={{ background: "#1A56DB" }}>
                          GeoJSON Aktif
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-lg-4 mb-3">
            <div className="info-item info-item-primary">
              <h6>
                <FaInfoCircle className="me-2" /> GeoJSON Presisi
              </h6>
              <p>Gunakan GeoJSON untuk area presensi yang mengikuti batas administrasi.</p>
            </div>
          </div>
          <div className="col-lg-4 mb-3">
            <div className="info-item info-item-success">
              <h6>
                <FaLayerGroup className="me-2" /> Sinkronisasi Cepat
              </h6>
              <p>Tarik data kabupaten/kecamatan dari folder GeoJSON dengan sekali klik.</p>
            </div>
          </div>
          <div className="col-lg-4 mb-3">
            <div className="info-item info-item-accent">
              <h6>
                <FaDotCircle className="me-2" /> Radius Fleksibel
              </h6>
              <p>Radius cocok untuk area kecil seperti kantor atau titik kumpul.</p>
            </div>
          </div>
        </div>

        <div className="table-container mt-4">
          <div className="table-header">
            <h5 className="mb-0">
              <FaDatabase className="me-2" />
              Data Daerah Presensi
            </h5>
            <div className="d-flex gap-2 align-items-center">
              <span className="badge bg-primary">Total: {daerahList.length} daerah</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={handleSyncGeojson}
                disabled={syncing}
              >
                <FaSyncAlt className={`me-2 ${syncing ? "spin" : ""}`} />
                {syncing ? "Menyinkronkan..." : "Sinkronisasi GeoJSON"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Memuat data...</p>
            </div>
          ) : daerahList.length === 0 ? (
            <div className="text-center py-5 bg-light rounded">
              <FaDatabase size={40} className="text-muted mb-3" />
              <p className="text-muted">Belum ada data daerah presensi</p>
              <small>Silakan tambahkan daerah baru menggunakan form di atas</small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Daerah</th>
                    <th>Level</th>
                    <th>Metode</th>
                    <th>Radius (m)</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daerahList.map((daerah, index) => {
                    const metode = daerah.geojson ? "GeoJSON" : "Radius";
                    return (
                      <tr key={daerah.id} className={editingId === daerah.id ? "table-primary" : ""}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{daerah.nama_daerah}</strong>
                          {editingId === daerah.id && (
                            <span className="badge bg-warning ms-2">Sedang diedit</span>
                          )}
                        </td>
                      <td>{getLevelLabel(daerah.titik_lokasi || daerah.level || daerah.titikLokasi)}</td>
                        <td>
                          <span className={`badge ${metode === "GeoJSON" ? "bg-primary" : "bg-success"}`}>
                            {metode}
                          </span>
                        </td>
                        <td>{metode === "Radius" ? daerah.radius || 0 : "-"}</td>
                        <td>{daerah.latitude}</td>
                        <td>{daerah.longitude}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEdit(daerah)}
                              className="btn btn-sm btn-warning me-2"
                              title="Edit data"
                              disabled={editingId && editingId !== daerah.id}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(daerah.id, daerah.nama_daerah)}
                              className="btn btn-sm btn-danger"
                              title="Hapus data"
                              disabled={editingId && editingId === daerah.id}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
