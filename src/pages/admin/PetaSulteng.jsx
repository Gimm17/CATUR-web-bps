import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../api/axios";
import "../../css/peta.sulteng.css";

const LEVEL_OPTIONS = [
  { value: "all", label: "Semua Wilayah" },
  { value: "kabupaten", label: "Kabupaten/Kota" },
  { value: "kecamatan", label: "Kecamatan" },
];

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const EARTH_RADIUS = 6378137;

const ringArea = (coords) => {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i += 1) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % coords.length];
    area += (lon2 - lon1) * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return (area * Math.PI / 180) * (EARTH_RADIUS * EARTH_RADIUS / 2);
};

const geometryArea = (geometry) => {
  if (!geometry) return 0;
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates || [];
    const outerArea = Math.abs(ringArea(outer || []));
    const holesArea = holes.reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0);
    return Math.max(0, outerArea - holesArea);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).reduce((sum, polygon) => {
      const [outer, ...holes] = polygon || [];
      const outerArea = Math.abs(ringArea(outer || []));
      const holesArea = holes.reduce((acc, ring) => acc + Math.abs(ringArea(ring)), 0);
      return sum + Math.max(0, outerArea - holesArea);
    }, 0);
  }
  return 0;
};

const pickColor = (label, level) => {
  const base = level === "kabupaten" ? 200 : 20; // kab: biru-hijau, kec: oranye-merah
  const spread = 260; // sebaran hue luas agar kontras
  const hue = (base + (hashString(label) % spread)) % 360;
  const saturation = 65 + (hashString(label + level) % 25);
  const lightness = 42 + (hashString(level + label) % 18);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const FitBoundsToGeojson = ({ features }) => {
  const map = useMap();

  useEffect(() => {
    if (!features || features.length === 0) return;
    try {
      const layer = L.geoJSON({ type: "FeatureCollection", features });
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (error) {
      console.error("Fit bounds error:", error);
    }
  }, [map, features]);

  return null;
};

export default function PetaSulteng() {
  const [daerah, setDaerah] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get("/daerah");
        setDaerah(response.data || []);
      } catch (err) {
        console.error("Gagal memuat daerah:", err);
        setError("Gagal memuat data peta");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredDaerah = useMemo(() => {
    const term = search.trim().toLowerCase();
    return daerah.filter((item) => {
      if (!item.geojson) return false;
      if (levelFilter !== "all" && item.titik_lokasi !== levelFilter) return false;
      if (!term) return true;
      return String(item.nama_daerah || "").toLowerCase().includes(term);
    });
  }, [daerah, levelFilter, search]);

  const colorMap = useMemo(() => {
    const map = new Map();
    filteredDaerah.forEach((item) => {
      const key = item.id || item.nama_daerah;
      if (map.has(key)) return;
      map.set(key, pickColor(item.nama_daerah || String(key), item.titik_lokasi));
    });
    return map;
  }, [filteredDaerah]);

  const features = useMemo(() => {
    const out = [];
    filteredDaerah.forEach((item) => {
      if (!item.geojson) return;
      const parsed = typeof item.geojson === "string" ? JSON.parse(item.geojson) : item.geojson;
      if (!parsed) return;
      const featureList = parsed.type === "FeatureCollection"
        ? parsed.features || []
        : parsed.type === "Feature"
          ? [parsed]
          : [{ type: "Feature", geometry: parsed, properties: {} }];
      featureList.forEach((feature) => {
        out.push({
          ...feature,
          properties: {
            ...(feature.properties || {}),
            regionLabel: item.nama_daerah,
            level: item.titik_lokasi,
            regionKey: item.id || item.nama_daerah,
          },
        });
      });
    });
    return out;
  }, [filteredDaerah]);

  const regionStats = useMemo(() => {
    const map = new Map();
    filteredDaerah.forEach((item) => {
      const key = item.id || item.nama_daerah;
      map.set(key, {
        key,
        nama: item.nama_daerah,
        level: item.titik_lokasi,
        area: 0,
        parts: 0,
      });
    });
    features.forEach((feature) => {
      const key = feature?.properties?.regionKey;
      if (!map.has(key)) return;
      const area = geometryArea(feature.geometry);
      const current = map.get(key);
      current.area += area;
      current.parts += 1;
      map.set(key, current);
    });
    return map;
  }, [filteredDaerah, features]);

  const stats = useMemo(() => {
    const normalize = (value) => String(value || "").toLowerCase();
    const kab = daerah.filter((d) => normalize(d.titik_lokasi).includes("kab")).length;
    const kec = daerah.filter((d) => normalize(d.titik_lokasi).includes("kec")).length;
    const total = daerah.length;
    return { kab, kec, total };
  }, [daerah]);

  const labelPoints = useMemo(() => {
    return filteredDaerah.map((item) => ({
      key: item.id || item.nama_daerah,
      name: item.nama_daerah,
      level: item.titik_lokasi,
      lat: Number(item.latitude),
      lon: Number(item.longitude),
    })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
  }, [filteredDaerah]);

  return (
    <AdminLayout>
      <div className="sulteng-map-page">
        <div className="sulteng-header">
          <div className="sulteng-title">
            <h1>Peta Administratif Sulawesi Tengah</h1>
            <p>Wilayah kabupaten/kota dan kecamatan sesuai GeoJSON yang tersedia.</p>
          </div>
          <div className="sulteng-stats">
            <div className="stat-card">
              <span className="stat-label">Kab/Kota</span>
              <span className="stat-value" style={{ color: "black" }}>
                {stats.kab}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Kecamatan</span>
              <span className="stat-value" style={{ color: "black" }}>
                {stats.kec}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total</span>
              <span className="stat-value" style={{ color: "black" }}>
                {stats.total}
              </span>
            </div>
          </div>
        </div>

        <div className="sulteng-controls">
          <div className="level-toggle">
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`toggle-btn ${levelFilter === option.value ? "active" : ""}`}
                onClick={() => setLevelFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="Cari nama wilayah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="label-toggle">
            <label>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Tampilkan Label
            </label>
          </div>
        </div>

        <div className={`sulteng-map-card ${isFullscreen ? "fullscreen" : ""}`}>
          {loading ? (
            <div className="sulteng-state">Memuat peta...</div>
          ) : error ? (
            <div className="sulteng-state error">{error}</div>
          ) : (
            <MapContainer
              center={[-1.2, 120.2]}
              zoom={7}
              className="sulteng-map"
              zoomControl
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <div className="map-overlay">
                <button
                  type="button"
                  className="map-overlay-btn"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
                </button>
                <div className="map-legend">
                  <div className="legend-title">Wilayah</div>
                  <div className="legend-item">
                    <span className="legend-dot kab"></span>
                    Kabupaten/Kota
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot kec"></span>
                    Kecamatan
                  </div>
                </div>
              </div>
              <FitBoundsToGeojson features={features} />
              <GeoJSON
                data={{ type: "FeatureCollection", features }}
                style={(feature) => {
                  const key = feature?.properties?.regionKey;
                  const fill = colorMap.get(key) || "#3B82F6";
                  const isKab = feature?.properties?.level === "kabupaten";
                  return {
                    color: isKab ? "#0f172a" : "#1f2937",
                    weight: isKab ? 2 : 1,
                    fillColor: fill,
                    fillOpacity: 0.55,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const label = feature?.properties?.regionLabel || "Wilayah";
                  const level = feature?.properties?.level || "-";
                  const key = feature?.properties?.regionKey;
                  const info = regionStats.get(key);
                  const areaKm = info ? (info.area / 1_000_000).toFixed(2) : "-";
                  layer.bindPopup(`<strong>${label}</strong><br/>Level: ${level}<br/>Luas: ${areaKm} km²`);

                  layer.on("mouseover", () => {
                    layer.setStyle({
                      weight: 3,
                      fillOpacity: 0.75,
                    });
                  });
                  layer.on("mouseout", () => {
                    layer.setStyle({
                      weight: level === "kabupaten" ? 2 : 1,
                      fillOpacity: 0.55,
                    });
                  });
                  layer.on("click", () => {
                    if (!info) return;
                    setSelectedRegion({
                      name: info.nama,
                      level: info.level,
                      areaKm: (info.area / 1_000_000).toFixed(2),
                      parts: info.parts,
                    });
                  });
                }}
              />
              {showLabels && labelPoints.map((item) => (
                <Marker
                  key={`label-${item.key}`}
                  position={[item.lat, item.lon]}
                  icon={L.divIcon({
                    className: "sulteng-label",
                    html: `<span class="label-pill ${item.level === "kabupaten" ? "kab" : "kec"}">${item.name}</span>`,
                  })}
                />
              ))}
            </MapContainer>
          )}
        </div>

        <div className="sulteng-footer">
          <div className="legend-card">
            <h4>Wilayah</h4>
            <div className="legend-row">
              <span className="legend-swatch kab"></span>
              <div>
                <strong>Kabupaten/Kota</strong>
                <p>Garis batas lebih tebal, warna biru-hijau.</p>
              </div>
            </div>
            <div className="legend-row">
              <span className="legend-swatch kec"></span>
              <div>
                <strong>Kecamatan</strong>
                <p>Garis batas tipis, warna ungu-pink.</p>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h4>Detail Wilayah</h4>
            {selectedRegion ? (
              <div className="detail-content">
                <div className="detail-name">{selectedRegion.name}</div>
                <div className="detail-meta">
                  <span className={`badge ${selectedRegion.level === "kabupaten" ? "kab" : "kec"}`}>
                    {selectedRegion.level === "kabupaten" ? "Kabupaten/Kota" : "Kecamatan"}
                  </span>
                  <span className="detail-item">Luas: {selectedRegion.areaKm} km²</span>
                  <span className="detail-item">Bagian: {selectedRegion.parts}</span>
                </div>
              </div>
            ) : (
              <p>Klik area peta untuk melihat detail.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
