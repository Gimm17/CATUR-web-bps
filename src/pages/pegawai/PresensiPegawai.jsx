import { useEffect, useRef, useState } from "react";
import { submitPresensi, cekStatusPresensi, submitLaporan } from "../../services/presensiService";
import { getSuratTugasAktif } from "../../services/surat.service";
import { getProfil } from "../../services/akun.service";
import PegawaiLayout from "../../layouts/PegawaiLayout";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Circle,
  useMap,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  FaMapMarkerAlt, 
  FaCamera, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaLocationArrow,
  FaSpinner,
  FaFileAlt,
  FaMapPin,
  FaCrosshairs,
  FaInfoCircle,
  FaCalendarDay,
  FaClock,
  FaPen,
  FaImage,
  FaUserCheck,
  FaRegClock,
  FaArrowRight,
  FaCheckDouble,
  FaSearchMinus,
  FaSearchPlus
} from "react-icons/fa";

// Import komponen RichTextEditor
import RichTextEditor from "./RichTextEditor";
import { getDaerah, getDaerahById } from "../../services/daerahService";
import { toPublicFileUrl } from "../../utils/fileUrl";
import { showToast } from "../../utils/alerts";

/* ================= FIX ICON LEAFLET ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const targetIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const paluIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/* ================= KONFIGURASI WILAYAH ================= */
const KOTA_PALU_COORDINATES = {
  latitude: -0.8983014661969085,
  longitude: 119.89089223877535,
  nama: "Kota Palu",
};

const LOCAL_AREAS = ["palu", "sigi", "donggala"];
const PRESENSI_PAGE_STYLE_ID = "presensi-pegawai-inline-styles";
const SUPPORTED_PRESENSI_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"];
const PRESENSI_ACCEPT_ATTRIBUTE = "image/*,.jpg,.jpeg,.png,.heic,.heif,.webp";
const PRESENSI_PAGE_STYLES = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes popIn {
    0% { transform: scale(0); }
    80% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .leaflet-container {
    height: 100%;
    width: 100%;
    z-index: 1;
  }
  .popup-content {
    padding: 4px;
  }
  .popup-content strong {
    display: block;
    marginBottom: 4px;
  }
  .popup-content p {
    margin: 2px 0;
    font-size: 12px;
  }
  .text-success {
    color: #10b981;
  }
  .ql-editor {
    min-height: 200px;
    font-size: 14px;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
    touch-action: manipulation;
  }
  .laporan-summary-content,
  .laporan-summary-content * {
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .ql-toolbar {
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    background: #f9fafb;
    border: none !important;
    border-bottom: 2px solid #e5e7eb !important;
  }
  .ql-container {
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    background: white;
    border: none !important;
  }
  @media (max-width: 1024px) {
    .grid-class {
      grid-template-columns: 1fr !important;
    }
    .right-column-class {
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }
  }
  @media (max-width: 768px) {
    .container-class {
      padding: 16px !important;
    }
    .map-container-class {
      height: 250px !important;
    }
    .info-grid-class {
      grid-template-columns: 1fr !important;
    }
    .header-class {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  .btn-icon-hover:hover {
    background: #4361ee;
    color: white;
    border-color: #4361ee;
  }
  .presensi-history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .presensi-history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid #e5e7eb;
  }
  .presensi-history-item.today {
    background: #e0f2fe;
    border-color: #7dd3fc;
  }
  .presensi-history-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .presensi-history-day {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .presensi-history-date {
    font-size: 12px;
    color: #64748b;
  }
  .presensi-history-status {
    flex-shrink: 0;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
  }
  .presensi-history-status.done {
    background: #dcfce7;
    color: #166534;
  }
  .presensi-history-status.pending {
    background: #fff7ed;
    color: #c2410c;
  }
  `;

/* ================= MAP RESIZE FIX ================= */
const ResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
};

/* ================= MODIFIED FIT BOUNDS COMPONENT ================= */
const FitBoundsToMarkers = ({ userPos, targetPos, shouldFitBounds = false }) => {
  const map = useMap();
  
  useEffect(() => {
    if (userPos && targetPos && shouldFitBounds) {
      try {
        const bounds = L.latLngBounds([
          [userPos.latitude, userPos.longitude],
          [targetPos.latitude, targetPos.longitude]
        ]);
        
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error("Error fit bounds:", error);
      }
    }
  }, [map, userPos, targetPos, shouldFitBounds]);
  
  return null;
};

/* ================= COMPONENT UTAMA ================= */
const PresensiPegawai = () => {
  const [user, setUser] = useState(null);
  const [surat, setSurat] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [fotoFiles, setFotoFiles] = useState([]);
  const [laporan, setLaporan] = useState("");
  const [diArea, setDiArea] = useState(false);
  const [loading, setLoading] = useState({ 
    awal: true, 
    submitAbsen: false, 
    submitLaporan: false,
    cekStatus: false 
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hariKe, setHariKe] = useState(1);
  const [targetPresensiHariIni, setTargetPresensiHariIni] = useState(null);
  const [isHariPertama, setIsHariPertama] = useState(true);
  const [suratStatus, setSuratStatus] = useState(null);
  
  // State untuk tracking waktu absen
  const [waktuAbsen, setWaktuAbsen] = useState(null);
  const [batasWaktuLaporan, setBatasWaktuLaporan] = useState(null);
  const [sisaWaktuLaporan, setSisaWaktuLaporan] = useState("");
  
  // State untuk tracking status presensi hari ini
  const [sudahAbsen, setSudahAbsen] = useState(false);
  const [sudahLaporan, setSudahLaporan] = useState(false);
  const [dataPresensiHariIni, setDataPresensiHariIni] = useState(null);
  
  // State untuk mengelola step
  const [currentStep, setCurrentStep] = useState(1); // 1: Absen, 2: Laporan, 3: Selesai

  // State untuk kontrol map
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [mapZoom, setMapZoom] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  // State untuk menyimpan semua riwayat presensi
  const [riwayatPresensi, setRiwayatPresensi] = useState([]);
  const [areaGeojson, setAreaGeojson] = useState(null);
  const [areaNama, setAreaNama] = useState("");
  const [areaPaluGeojson, setAreaPaluGeojson] = useState(null);
  const [areaTargetGeojson, setAreaTargetGeojson] = useState(null);
  const [areaRadiusMeters, setAreaRadiusMeters] = useState(0);
  const [areaPaluRadiusMeters, setAreaPaluRadiusMeters] = useState(0);
  const [daerahCache, setDaerahCache] = useState([]);
  const fileInputRef = useRef(null);

  const uploadedFotoList = Array.isArray(dataPresensiHariIni?.foto_list) ? dataPresensiHariIni.foto_list : [];
  const uploadedFotoCount = uploadedFotoList.length;
  const selectedFotoCount = fotoFiles.length;
  const totalFotoHariIni = uploadedFotoCount + selectedFotoCount;
  const isFotoLengkapHariIni = uploadedFotoCount >= 2;
  const canOpenLaporan = sudahAbsen && isFotoLengkapHariIni;
  const maxFotoPerHari = 5;
  const fotoProgressLabel = `${uploadedFotoCount}/2 foto sudah tersimpan`;
  const hasValidLokasi = Boolean(
    lokasi &&
    Number.isFinite(Number(lokasi.latitude)) &&
    Number.isFinite(Number(lokasi.longitude))
  );
  const gpsAccuracyMeters = Number.isFinite(Number(lokasi?.accuracy))
    ? Math.round(Number(lokasi.accuracy))
    : null;
  const todayDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const canSelectFoto = Boolean(suratStatus?.isActive) && !loading.submitAbsen;
  const canSubmitAbsen =
    Boolean(suratStatus?.isActive) &&
    hasValidLokasi &&
    selectedFotoCount > 0 &&
    !loading.submitAbsen &&
    !isFotoLengkapHariIni;
  const uploadedFotoPreviewList = uploadedFotoList.map((foto, index) => ({
    key: `uploaded-${index}-${foto}`,
    src: toPublicFileUrl(foto, { legacyDir: "uploads/presensi" }),
    label: index === 0 ? "Foto pertama" : `Foto ke-${index + 1}`,
  }));

  const resetSelectedFotos = () => {
    fotoFiles.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setFotoFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isSupportedFotoFile = (file) => {
    if (!(file instanceof File)) return false;

    const mimeType = String(file.type || "").toLowerCase();
    if (mimeType.startsWith("image/")) {
      return true;
    }

    const fileName = String(file.name || "").toLowerCase();
    return SUPPORTED_PRESENSI_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  };

  const normalizeFotoForUpload = async (file) => {
    if (!isSupportedFotoFile(file)) {
      return file;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Gagal membaca file gambar"));
        img.src = objectUrl;
      });

      const sourceWidth = Number(image.width) || 0;
      const sourceHeight = Number(image.height) || 0;
      if (!sourceWidth || !sourceHeight) {
        return file;
      }

      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        return file;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        return file;
      }

      const safeBaseName = String(file.name || "foto")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-");

      return new File([blob], `${safeBaseName || "foto"}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } catch (err) {
      console.warn("Normalisasi foto dilewati:", err.message);
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleTambahFoto = async (event) => {
    const pickedFiles = Array.from(event.target.files || []);
    if (!pickedFiles.length) return;

    const unsupportedFiles = pickedFiles.filter((file) => !isSupportedFotoFile(file));
    if (unsupportedFiles.length > 0) {
      setError("Ada file yang bukan gambar didukung. Gunakan JPG, JPEG, PNG, HEIC, HEIF, atau WEBP.");
      event.target.value = "";
      return;
    }

    const sisaSlot = Math.max(0, maxFotoPerHari - uploadedFotoCount - fotoFiles.length);
    if (sisaSlot <= 0) {
      setError(`Maksimal ${maxFotoPerHari} foto untuk presensi hari ini.`);
      event.target.value = "";
      return;
    }

    const normalizedFiles = await Promise.all(
      pickedFiles.map((file) => normalizeFotoForUpload(file))
    );

    const mappedFiles = normalizedFiles.map((file) => ({
      file,
      key: `${file.name}-${file.size}-${file.lastModified}`,
      previewUrl: URL.createObjectURL(file),
    }));
    const combinedFiles = [...fotoFiles, ...mappedFiles].filter(Boolean);
    const uniqueFiles = combinedFiles.filter((item, index, array) => {
      return index === array.findIndex((entry) => entry.key === item.key);
    });
    const nextFiles = uniqueFiles.slice(0, sisaSlot + fotoFiles.length);

    combinedFiles.forEach((item) => {
      if (!nextFiles.some((entry) => entry.key === item.key) && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    if (uniqueFiles.length > nextFiles.length) {
      setError(`Maksimal ${maxFotoPerHari} foto untuk presensi hari ini.`);
    } else {
      setError("");
    }

    setFotoFiles(nextFiles);
    event.target.value = "";
  };

  const handleHapusFoto = (indexToRemove) => {
    setFotoFiles((prev) => {
      const target = prev[indexToRemove];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };


  /* ===== FUNGSI UTILITAS ===== */
  const calculateSuratStatus = (suratData) => {
    if (!suratData) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tanggalMulai = suratData.tanggal_mulai ? new Date(suratData.tanggal_mulai) : null;
    const tanggalSelesai = suratData.tanggal_selesai ? new Date(suratData.tanggal_selesai) : null;
    
    if (!tanggalMulai || !tanggalSelesai) {
      return { status: 'unknown', label: 'Tidak diketahui', color: 'secondary', isActive: false };
    }

    tanggalMulai.setHours(0, 0, 0, 0);
    tanggalSelesai.setHours(0, 0, 0, 0);
    
    if (today < tanggalMulai) {
      const daysUntil = Math.ceil((tanggalMulai - today) / (1000 * 60 * 60 * 24));
      return {
        status: 'upcoming',
        label: `Mulai ${daysUntil} hari lagi`,
        color: 'info',
        isActive: false,
        isExpired: false,
        isUpcoming: true
      };
    } else if (today > tanggalSelesai) {
      const daysOverdue = Math.ceil((today - tanggalSelesai) / (1000 * 60 * 60 * 24));
      return {
        status: 'expired',
        label: `Berakhir ${daysOverdue} hari lalu`,
        color: 'danger',
        isActive: false,
        isExpired: true,
        isUpcoming: false
      };
    } else {
      const hariBerjalan = Math.ceil((today - tanggalMulai) / (1000 * 60 * 60 * 24)) + 1;
      const sisaHari = Math.ceil((tanggalSelesai - today) / (1000 * 60 * 60 * 24));
      return {
        status: 'active',
        label: `${sisaHari} hari tersisa`,
        color: 'success',
        isActive: true,
        isExpired: false,
        isUpcoming: false,
        hariBerjalan,
        sisaHari
      };
    }
  };

  const isLocalArea = (daerahTujuan) => {
    if (!daerahTujuan) return false;
    const daerahLower = daerahTujuan.toLowerCase();
    return LOCAL_AREAS.some((area) => daerahLower.includes(area));
  };

  const hitungHariKe = (tanggalMulai, suratStatus) => {
    if (!tanggalMulai || suratStatus?.isExpired) return 0;
    try {
      const mulai = new Date(tanggalMulai);
      const sekarang = new Date();
      
      // Reset jam ke 00:00:00
      mulai.setHours(0, 0, 0, 0);
      sekarang.setHours(0, 0, 0, 0);
      
      const selisihHari = Math.floor((sekarang - mulai) / (1000 * 60 * 60 * 24));
      
      // Hari ke-1 adalah hari pertama (selisih 0), hari ke-2 selisih 1, dst
      return Math.max(1, selisihHari + 1);
    } catch {
      return 1;
    }
  };

  const hitungDurasiHari = (tanggalMulai, tanggalSelesai) => {
    if (!tanggalMulai || !tanggalSelesai) return 0;
    try {
      const mulai = new Date(tanggalMulai);
      const selesai = new Date(tanggalSelesai);
      mulai.setHours(0, 0, 0, 0);
      selesai.setHours(0, 0, 0, 0);
      return Math.floor((selesai - mulai) / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 0;
    }
  };

  const tentukanTargetPresensiHariIni = (suratData, hariKeDinas, suratStatus) => {
    if (!suratData || suratStatus?.isExpired) return null;
    const durasiHari = hitungDurasiHari(suratData.tanggal_mulai, suratData.tanggal_selesai);
    const isHariGabungan =
      !isLocalArea(suratData.daerah_tujuan) &&
      (hariKeDinas === 1 || (durasiHari > 0 && hariKeDinas === durasiHari));

    if (isHariGabungan) {
      return {
        type: "GABUNGAN",
        coordinates: { 
          latitude: parseFloat(suratData.latitude) || KOTA_PALU_COORDINATES.latitude, 
          longitude: parseFloat(suratData.longitude) || KOTA_PALU_COORDINATES.longitude 
        },
        nama: suratData.daerah_tujuan,
        secondary: KOTA_PALU_COORDINATES,
        keterangan: hariKeDinas === 1
          ? "Hari pertama - Presensi bisa di Kota Palu atau daerah tujuan"
          : "Hari terakhir - Presensi bisa di Kota Palu atau daerah tujuan"
      };
    }

    return {
      type: "DAERAH_TUJUAN",
      coordinates: { 
        latitude: parseFloat(suratData.latitude) || KOTA_PALU_COORDINATES.latitude, 
        longitude: parseFloat(suratData.longitude) || KOTA_PALU_COORDINATES.longitude 
      },
      nama: suratData.daerah_tujuan,
      keterangan: `Hari ke-${hariKeDinas} - Presensi di daerah tujuan`
    };
  };

  /* ===== FUNGSI HITUNG CENTER MAP ===== */
  const hitungCenterMap = (userPos, targetPos) => {
    if (userPos && targetPos) {
      return [
        (userPos.latitude + targetPos.latitude) / 2,
        (userPos.longitude + targetPos.longitude) / 2
      ];
    }
    return userPos ? [userPos.latitude, userPos.longitude] : [-0.8983, 119.8908];
  };

  const buildGeojson = (raw) => {
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed) return null;
    if (parsed.type === "FeatureCollection" || parsed.type === "Feature") return parsed;
    return { type: "Feature", geometry: parsed, properties: {} };
  };

  const isPointInRing = (point, ring) => {
    if (!Array.isArray(ring) || ring.length < 3) return false;
    const [x, y] = point; // [lng, lat]
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] || [];
      const [xj, yj] = ring[j] || [];
      if (![xi, yi, xj, yj].every((v) => typeof v === "number")) continue;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  };

  const isPointInPolygonCoords = (point, polygonCoords) => {
    if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) return false;
    const [outer, ...holes] = polygonCoords;
    if (!isPointInRing(point, outer)) return false;
    for (const hole of holes) {
      if (isPointInRing(point, hole)) return false;
    }
    return true;
  };

  const isPointInGeojson = (point, geojson) => {
    if (!geojson) return false;

    const checkGeometry = (geometry) => {
      if (!geometry) return false;
      if (geometry.type === "Polygon") {
        return isPointInPolygonCoords(point, geometry.coordinates);
      }
      if (geometry.type === "MultiPolygon") {
        return (geometry.coordinates || []).some((poly) => isPointInPolygonCoords(point, poly));
      }
      return false;
    };

    if (geojson.type === "FeatureCollection") {
      return (geojson.features || []).some((f) => checkGeometry(f?.geometry));
    }

    if (geojson.type === "Feature") {
      return checkGeometry(geojson.geometry);
    }

    return checkGeometry(geojson);
  };

  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000;
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  const isWithinRadius = (lat, lon, centerLat, centerLon, radiusMeters) => {
    if (
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lon)) ||
      !Number.isFinite(Number(centerLat)) ||
      !Number.isFinite(Number(centerLon)) ||
      !Number.isFinite(Number(radiusMeters)) ||
      Number(radiusMeters) <= 0
    ) {
      return false;
    }

    return (
      calculateDistanceMeters(
        Number(lat),
        Number(lon),
        Number(centerLat),
        Number(centerLon)
      ) <= Number(radiusMeters)
    );
  };

  /* ===== FUNGSI HITUNG SISA WAKTU ===== */
  const hitungSisaWaktu = (batasWaktu) => {
    if (!batasWaktu) return "";
    
    const sekarang = new Date().getTime();
    const batas = new Date(batasWaktu).getTime();
    const selisih = batas - sekarang;
    
    if (selisih <= 0) return "Waktu habis";
    
    const jam = Math.floor(selisih / (1000 * 60 * 60));
    const menit = Math.floor((selisih % (1000 * 60 * 60)) / (1000 * 60));
    
    if (jam > 0) {
      return `${jam} jam ${menit} menit`;
    } else {
      return `${menit} menit`;
    }
  };

  /* ===== FUNGSI CEK STATUS PRESENSI ===== */
  const cekStatusHariIni = async () => {
    setLoading(prev => ({ ...prev, cekStatus: true }));
    try {
      const response = await cekStatusPresensi();
      console.log("Response dari backend:", response.data);
      
      if (!response.data?.success && response.data?.success !== undefined) {
        throw new Error(response.data?.message || 'Gagal memuat data');
      }
      
      // Simpan semua riwayat presensi
      const allPresensi = response.data?.data || [];
      const hariKeSekarang = response.data?.hari_ke_sekarang || hariKe;
      const dataHariIni = response.data?.data_hari_ini;
      const fotoLengkapHariIni =
        response.data?.is_foto_lengkap_hari_ini ??
        (Array.isArray(dataHariIni?.foto_list) && dataHariIni.foto_list.length >= 2);
      
      setRiwayatPresensi(allPresensi);
      
      // Update hariKe jika berbeda
      if (hariKeSekarang !== hariKe) {
        setHariKe(hariKeSekarang);
        setIsHariPertama(hariKeSekarang === 1);
        
        // Update target presensi untuk hari baru
        if (surat) {
          const targetBaru = tentukanTargetPresensiHariIni(surat, hariKeSekarang, suratStatus);
          setTargetPresensiHariIni(targetBaru);
        }
      }

      console.log(`Data untuk hari ini:`, dataHariIni);
      console.log(`Hari ke sekarang: ${hariKeSekarang}`);

      if (dataHariIni) {
        setSudahAbsen(true);
        setDataPresensiHariIni(dataHariIni);
        
        // Set waktu absen
        const waktuAbsenData = dataHariIni.created_at || dataHariIni.createdAt || new Date().toISOString();
        setWaktuAbsen(waktuAbsenData);
        
        const batasWaktu = new Date(waktuAbsenData);
        batasWaktu.setHours(batasWaktu.getHours() + 24);
        setBatasWaktuLaporan(batasWaktu.toISOString());
        
        // Cek laporan
        if (dataHariIni.laporan && dataHariIni.laporan.trim() !== '') {
          setSudahLaporan(true);
          setCurrentStep(3);
          setLaporan(dataHariIni.laporan);
          resetSelectedFotos();
        } else {
          setSudahLaporan(false);
          setCurrentStep(fotoLengkapHariIni ? 2 : 1);
          if (fotoLengkapHariIni) {
            resetSelectedFotos();
          }
        }
      } else {
        setSudahAbsen(false);
        setSudahLaporan(false);
        setCurrentStep(1);
        setDataPresensiHariIni(null);
        setWaktuAbsen(null);
        setBatasWaktuLaporan(null);
        setLaporan("");
        resetSelectedFotos();
      }
      
    } catch (error) {
      console.error("❌ Gagal cek status:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       "Gagal memeriksa status presensi";
      
      setError(errorMsg);
      setCurrentStep(1);
      setSudahAbsen(false);
      setSudahLaporan(false);
      
    } finally {
      setLoading(prev => ({ ...prev, cekStatus: false }));
    }
  };

  /* ===== UPDATE SISA WAKTU ===== */
  useEffect(() => {
    if (sudahAbsen && !sudahLaporan && batasWaktuLaporan) {
      const interval = setInterval(() => {
        const sisa = hitungSisaWaktu(batasWaktuLaporan);
        setSisaWaktuLaporan(sisa);
        
        // Cek jika waktu sudah habis
        if (sisa === "Waktu habis") {
          setError("Batas waktu pengisian laporan telah habis (24 jam)");
        }
      }, 60000); // Update setiap menit
      
      return () => clearInterval(interval);
    }
  }, [sudahAbsen, sudahLaporan, batasWaktuLaporan]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let styleElement = document.getElementById(PRESENSI_PAGE_STYLE_ID);
    let created = false;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = PRESENSI_PAGE_STYLE_ID;
      styleElement.textContent = PRESENSI_PAGE_STYLES;
      document.head.appendChild(styleElement);
      created = true;
    }

    return () => {
      if (created && styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  /* ===== UPDATE MAP SETTINGS ===== */
  useEffect(() => {
    if (targetPresensiHariIni) {
      setMapZoom(12);
      
      // Hitung center map
      if (lokasi) {
        const center = hitungCenterMap(lokasi, targetPresensiHariIni.coordinates);
        setMapCenter(center);
      } else {
        setMapCenter([targetPresensiHariIni.coordinates.latitude, targetPresensiHariIni.coordinates.longitude]);
      }
    }
  }, [targetPresensiHariIni, lokasi]);

  /* ===== LOAD DATA ===== */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadDataAwal = async () => {
      setLoading(prev => ({ ...prev, awal: true }));
      setError("");

      try {
        // Load profil
        const profilData = await getProfil();
        setUser(profilData);

        // Load lokasi GPS
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLokasi({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              });
            },
            (err) => {
              console.error("GPS Error:", err);
              setError("Gagal mengambil lokasi GPS. Pastikan GPS diaktifkan.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          setError("Browser tidak mendukung geolocation");
        }

        // Load surat tugas
        try {
          const response = await getSuratTugasAktif();
          console.log("Surat tugas response:", response);
          
          let suratData = null;
          if (response?.id) {
            suratData = response;
          } else if (response?.data) {
            suratData = response.data;
          } else if (Array.isArray(response) && response.length > 0) {
            suratData = response[0];
          }
          
          if (suratData) {
            const status = calculateSuratStatus(suratData);
            setSuratStatus(status);
            
            const hariKeDinas = hitungHariKe(suratData.tanggal_mulai, status);
            setHariKe(hariKeDinas);
            setIsHariPertama(hariKeDinas === 1);
            
            if (status.isActive) {
              const targetPresensi = tentukanTargetPresensiHariIni(suratData, hariKeDinas, status);
              setTargetPresensiHariIni(targetPresensi);
            }
            
            setSurat(suratData);
          } else {
            setError("Tidak ada surat tugas aktif");
          }
        } catch (apiError) {
          console.error("Error load surat:", apiError);
          setError("Gagal memuat data surat tugas");
        }
      } catch (error) {
        console.error("Error load data:", error);
        setError("Gagal memuat data");
      } finally {
        setLoading(prev => ({ ...prev, awal: false }));
      }
    };

    loadDataAwal();
  }, [retryCount]);

  /* ===== CEK STATUS PRESENSI SETELAH SURAT DAN HARI KE DAPAT ===== */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (surat && suratStatus?.isActive) {
      cekStatusHariIni();
    }
  }, [surat, suratStatus]);

  /* ===== CEK STATUS LOKASI ===== */
  useEffect(() => {
    if (!suratStatus?.isActive) {
      setDiArea(false);
      return;
    }

    if (!lokasi || !targetPresensiHariIni) {
      setDiArea(false);
      return;
    }

    const latitude = Number(lokasi.latitude);
    const longitude = Number(lokasi.longitude);
    const point = [longitude, latitude];
    if (!point.every(Number.isFinite)) {
      setDiArea(false);
      return;
    }

    const insidePolygon = areaGeojson ? isPointInGeojson(point, areaGeojson) : false;
    const insidePrimaryRadius = isWithinRadius(
      latitude,
      longitude,
      targetPresensiHariIni.coordinates?.latitude,
      targetPresensiHariIni.coordinates?.longitude,
      areaRadiusMeters
    );
    const insidePaluRadius =
      targetPresensiHariIni.type === "GABUNGAN" &&
      isWithinRadius(
        latitude,
        longitude,
        KOTA_PALU_COORDINATES.latitude,
        KOTA_PALU_COORDINATES.longitude,
        areaPaluRadiusMeters
      );

    setDiArea(Boolean(insidePolygon || insidePrimaryRadius || insidePaluRadius));
  }, [lokasi, suratStatus, areaGeojson, targetPresensiHariIni, areaRadiusMeters, areaPaluRadiusMeters]);

  /* ===== LOAD GEOJSON AREA ===== */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadGeojson = async () => {
      try {
        if (!targetPresensiHariIni || !suratStatus?.isActive) {
          setAreaGeojson(null);
          setAreaNama("");
          setAreaRadiusMeters(0);
          setAreaPaluRadiusMeters(0);
          return;
        }

        if (targetPresensiHariIni.type === "GABUNGAN") {
          let list = daerahCache;
          if (!list.length) {
            const data = await getDaerah();
            list = Array.isArray(data) ? data : [];
            setDaerahCache(list);
          }
          const palu = list.find((d) =>
            String(d.nama_daerah || "").toLowerCase().includes("kota palu")
          );
          const daerahId = surat?.daerah_id || surat?.daerah?.id;
          let targetData = null;
          if (daerahId) {
            targetData = await getDaerahById(daerahId);
          } else {
            targetData = list.find((d) =>
              String(d.nama_daerah || "").toLowerCase().includes(
                String(targetPresensiHariIni.nama || "").toLowerCase()
              )
            );
          }

          const paluGeo = buildGeojson(palu?.geojson);
          const targetGeo = buildGeojson(targetData?.geojson);

          setAreaPaluGeojson(paluGeo);
          setAreaTargetGeojson(targetGeo);
          setAreaRadiusMeters(Number(targetData?.radius || surat?.radius || 0));
          setAreaPaluRadiusMeters(Number(palu?.radius || 0));

          const features = [];
          if (paluGeo?.type === "FeatureCollection") {
            features.push(...(paluGeo.features || []));
          } else if (paluGeo) {
            features.push(paluGeo);
          }

          if (targetGeo?.type === "FeatureCollection") {
            features.push(...(targetGeo.features || []));
          } else if (targetGeo) {
            features.push(targetGeo);
          }

          setAreaGeojson({ type: "FeatureCollection", features });
          setAreaNama(`${targetPresensiHariIni.nama} + Kota Palu`);
          return;
        }

        const daerahId = surat?.daerah_id || surat?.daerah?.id;
        if (daerahId) {
          const daerahData = await getDaerahById(daerahId);
          const geo = buildGeojson(daerahData?.geojson);
          if (geo) {
            setAreaGeojson(geo);
          } else {
            setAreaGeojson(null);
          }
          setAreaPaluGeojson(null);
          setAreaTargetGeojson(null);
          setAreaRadiusMeters(Number(daerahData?.radius || surat?.radius || 0));
          setAreaPaluRadiusMeters(0);
          setAreaNama(daerahData?.nama_daerah || targetPresensiHariIni.nama);
          if (!geo && String(targetPresensiHariIni.nama || "").toLowerCase().includes("palu")) {
            let list = daerahCache;
            if (!list.length) {
              const data = await getDaerah();
              list = Array.isArray(data) ? data : [];
              setDaerahCache(list);
            }
            const palu = list.find((d) =>
              String(d.nama_daerah || "").toLowerCase().includes("kota palu")
            );
            const paluGeo = buildGeojson(palu?.geojson);
            if (paluGeo) {
              setAreaGeojson(paluGeo);
              setAreaNama(palu?.nama_daerah || targetPresensiHariIni.nama);
            }
          }
          return;
        }

        let list = daerahCache;
        if (!list.length) {
          const data = await getDaerah();
          list = Array.isArray(data) ? data : [];
          setDaerahCache(list);
        }
        const match = list.find((d) =>
          String(d.nama_daerah || "").toLowerCase().includes(
            String(targetPresensiHariIni.nama || "").toLowerCase()
          )
        );
        const geo = buildGeojson(match?.geojson);
        setAreaGeojson(geo);
        setAreaPaluGeojson(null);
        setAreaTargetGeojson(null);
        setAreaRadiusMeters(Number(match?.radius || surat?.radius || 0));
        setAreaPaluRadiusMeters(0);
        setAreaNama(match?.nama_daerah || targetPresensiHariIni.nama);
      } catch (err) {
        console.error("Gagal memuat geojson:", err);
        setAreaGeojson(null);
        setAreaNama("");
        setAreaPaluGeojson(null);
        setAreaTargetGeojson(null);
        setAreaRadiusMeters(Number(surat?.radius || 0));
        setAreaPaluRadiusMeters(0);
      }
    };

    loadGeojson();
  }, [targetPresensiHariIni, suratStatus, surat]);

  /* ===== HANDLE ABSEN ===== */
  const handleAbsen = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.activeElement?.blur?.();
    setError("");
    setSuccess("");

    // Kalau foto hari ini sudah lengkap, presensi hari ini dianggap selesai.
    if (sudahAbsen && isFotoLengkapHariIni) {
      setError("Anda sudah melengkapi presensi untuk hari ini");
      return;
    }

    if (!suratStatus?.isActive) {
      setError("Surat tugas tidak aktif");
      return;
    }

    if (!fotoFiles.length) {
      setError("Ambil minimal 1 foto terlebih dahulu. Total presensi hari ini wajib 2 foto.");
      return;
    }

    if (!lokasi) {
      setError("Lokasi tidak tersedia");
      return;
    }

    const formData = new FormData();
    formData.append("latitude", lokasi.latitude);
    formData.append("longitude", lokasi.longitude);
    fotoFiles.forEach((item) => {
      formData.append("foto", item.file);
    });
    if (surat?.id) formData.append("surat_tugas_id", surat.id);

    try {
      setLoading(prev => ({ ...prev, submitAbsen: true }));
      
      console.log("📤 Mengirim Data Tagging untuk hari ke-" + hariKe);
      const response = await submitPresensi(formData);
      console.log("📥 Response Tagging lokasi:", response.data);

      if (response.data?.message || response.data?.data) {
        const fotoLengkap = Boolean(
          response.data?.data?.is_foto_lengkap ??
          response.data?.can_submit_laporan
        );
        setSuccess(
          response.data?.message || (
          fotoLengkap
            ? `✅ Tagging lokasi hari ke-${hariKe} berhasil. Minimal 2 foto sudah terpenuhi, silakan isi laporan kegiatan.`
            : `✅ Foto berhasil disimpan. Silakan tambahkan foto lagi sampai total minimal 2 foto untuk hari ke-${hariKe}.`
        ));
        
        showToast(
          fotoLengkap
            ? "Foto presensi tersimpan. Silakan isi laporan kegiatan."
            : "Foto presensi berhasil disimpan.",
          { icon: "success" }
        );

        // Refresh status presensi
        await cekStatusHariIni();
        
        // Reset foto
        resetSelectedFotos();
      }
    } catch (err) {
      console.error("❌ Error absen:", err);
      console.error("Error response:", err.response?.data);
      
      const errorMsg = err.response?.data?.message || err.message || "Tagging lokasi gagal";
      setError(errorMsg);
      showToast(errorMsg, { icon: "error", position: "top" });
    } finally {
      setLoading(prev => ({ ...prev, submitAbsen: false }));
    }
  };

  /* ===== HANDLE LAPORAN ===== */
  const handleLaporan = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.activeElement?.blur?.();
    setError("");
    setSuccess("");

    if (!sudahAbsen) {
      setError("Anda harus melakukan Tagging lokasi terlebih dahulu");
      return;
    }

    // Cek batas waktu 24 jam
    if (batasWaktuLaporan) {
      const sekarang = new Date().getTime();
      const batas = new Date(batasWaktuLaporan).getTime();
      
      if (sekarang > batas) {
        setError("Batas waktu pengisian laporan 24 jam telah habis");
        return;
      }
    }

    // Strip HTML tags untuk menghitung panjang teks sebenarnya
    const textContent = laporan.replace(/<[^>]*>/g, '');
    
    if (!textContent.trim()) {
      setError("Laporan kegiatan wajib diisi");
      return;
    }

    if (textContent.length < 10) {
      setError("Laporan terlalu pendek (minimal 10 karakter)");
      return;
    }

    const data = {
      laporan: laporan, // Kirim dalam format HTML
      presensi_id: dataPresensiHariIni?.id,
      surat_tugas_id: surat?.id
    };

    try {
      setLoading(prev => ({ ...prev, submitLaporan: true }));
      
      console.log("📤 Mengirim data laporan untuk hari ke-" + hariKe, data);
      const response = await submitLaporan(data);
      console.log("📥 Response laporan:", response.data);

      if (response.data?.message || response.data?.data) {
        setSuccess("✅ Laporan berhasil disimpan!");
        
        showToast("Laporan harian berhasil disimpan.", { icon: "success" });

        // Refresh status presensi
        await cekStatusHariIni();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("❌ Error laporan:", err);
      console.error("Error response:", err.response?.data);
      
      const errorMsg = err.response?.data?.message || err.message || "Gagal menyimpan laporan";
      setError(errorMsg);
      showToast(errorMsg, { icon: "error", position: "top" });
    } finally {
      setLoading(prev => ({ ...prev, submitLaporan: false }));
    }
  };

  /* ===== HANDLE REFRESH LOKASI ===== */
  const handleRefreshLokasi = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLokasi({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
          setSuccess("Lokasi diperbarui");
          setTimeout(() => setSuccess(""), 3000);
        },
        () => setError("Gagal memperbarui lokasi"),
        { enableHighAccuracy: true }
      );
    }
  };

  /* ===== HANDLE FIT BOUNDS ===== */
  const handleFitBounds = () => {
    setShouldFitBounds(true);
    // Reset setelah selesai
    setTimeout(() => setShouldFitBounds(false), 500);
  };

  /* ===== HANDLE ZOOM IN/OUT ===== */
  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
    setShouldFitBounds(false);
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 5));
    setShouldFitBounds(false);
  };

  // Styles (sama seperti kode asli Anda, tidak perlu diubah)
  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e5e7eb',
      flexWrap: 'wrap',
      gap: '12px'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 600,
      color: '#1f2937',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    headerDate: {
      fontSize: '14px',
      color: '#6b7280',
      background: '#f9fafb',
      padding: '4px 12px',
      borderRadius: '20px'
    },
    headerUser: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#eef2ff',
      padding: '8px 16px',
      borderRadius: '30px',
      color: '#4361ee',
      fontWeight: 500
    },
    alertMessage: {
      padding: '16px 20px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      fontWeight: 500,
      gap: '12px'
    },
    alertSuccess: {
      background: '#d1fae5',
      color: '#10b981',
      borderLeft: '4px solid #10b981'
    },
    alertError: {
      background: '#fee2e2',
      color: '#ef4444',
      borderLeft: '4px solid #ef4444'
    },
    btnRetry: {
      marginLeft: 'auto',
      padding: '4px 12px',
      background: 'white',
      border: '1px solid currentColor',
      borderRadius: '20px',
      fontSize: '12px',
      cursor: 'pointer',
      color: 'inherit'
    },
    alertCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px 20px',
      borderRadius: '12px',
      marginBottom: '24px',
      background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb'
    },
    alertCardExpired: {
      borderLeft: '4px solid #ef4444'
    },
    alertCardUpcoming: {
      borderLeft: '4px solid #3b82f6'
    },
    alertCardActive: {
      borderLeft: '4px solid #10b981'
    },
    alertIcon: {
      fontSize: '24px',
      color: '#6b7280'
    },
    alertContent: {
      flex: 1
    },
    alertContentH5: {
      fontSize: '16px',
      fontWeight: 600,
      margin: '0 0 4px 0',
      color: '#1f2937'
    },
    alertContentP: {
      fontSize: '14px',
      color: '#6b7280',
      margin: 0
    },
    suratBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#eef2ff',
      color: '#4361ee',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 500
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '24px',
      marginTop: '20px'
    },
    leftColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    rightColumn: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      height: 'fit-content'
    },
    mapPanel: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    },
    mapHeader: {
      padding: '16px 20px',
      background: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px'
    },
    mapTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    mapTitleIcon: {
      color: '#4361ee',
      fontSize: '20px'
    },
    mapTitleH3: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1f2937',
      margin: 0
    },
    mapControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    },
    locationBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'white',
      padding: '6px 12px',
      borderRadius: '30px',
      fontSize: '13px',
      color: '#4b5563',
      border: '1px solid #e5e7eb'
    },
    badge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600
    },
    badgePrimary: {
      background: '#eef2ff',
      color: '#4361ee'
    },
    badgeSuccess: {
      background: '#d1fae5',
      color: '#10b981'
    },
    btnIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'white',
      border: '1px solid #e5e7eb',
      color: '#4361ee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontSize: '16px'
    },
    mapContainer: {
      height: '350px',
      width: '100%'
    },
    mapFooter: {
      padding: '16px 20px',
      background: '#f9fafb',
      borderTop: '1px solid #e5e7eb'
    },
    dayOneLegend: {
      padding: '12px 16px',
      background: 'white',
      borderRadius: '8px',
      border: '1px dashed #c7d2fe',
      margin: '0 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    dayOneLegendTitle: {
      fontWeight: 600,
      fontSize: '13px',
      color: '#1f2937'
    },
    dayOneLegendRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: '#4b5563'
    },
    dayOneLegendSwatch: {
      width: '14px',
      height: '14px',
      borderRadius: '4px',
      border: '1px solid #111827'
    },
    mapActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      marginBottom: '12px'
    },
    mapActionBtn: {
      padding: '8px 12px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      color: '#4b5563',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s ease'
    },
    statusCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'white'
    },
    statusSuccess: {
      background: '#d1fae5'
    },
    statusWarning: {
      background: '#fef3c7'
    },
    statusCompleted: {
      background: '#eef2ff'
    },
    statusIcon: {
      fontSize: '24px'
    },
    statusInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    statusLabel: {
      fontWeight: 600,
      fontSize: '14px'
    },
    statusDistance: {
      fontSize: '13px',
      color: '#6b7280',
      marginTop: '2px'
    },
    infoPanel: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    },
    infoHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: '1px solid #e5e7eb'
    },
    infoHeaderIcon: {
      color: '#3b82f6',
      fontSize: '20px'
    },
    infoHeaderH4: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1f2937',
      margin: 0
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '16px'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    infoLabel: {
      fontSize: '12px',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#1f2937'
    },
    badgeWarning: {
      display: 'inline-block',
      background: '#fef3c7',
      color: '#f59e0b',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      marginLeft: '8px'
    },
    valueStatus: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 500
    },
    valueStatusSuccess: {
      background: '#d1fae5',
      color: '#10b981'
    },
    valueStatusWarning: {
      background: '#fef3c7',
      color: '#f59e0b'
    },
    valueStatusCompleted: {
      background: '#eef2ff',
      color: '#4361ee'
    },
    infoRule: {
      display: 'flex',
      gap: '12px',
      background: '#f9fafb',
      padding: '16px',
      borderRadius: '8px',
      marginTop: '8px'
    },
    ruleIcon: {
      color: '#4361ee',
      fontSize: '16px'
    },
    ruleText: {
      fontSize: '14px',
      color: '#4b5563',
      lineHeight: 1.5
    },
    historyPanel: {
      marginTop: '16px',
      padding: '14px',
      background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    },
    historyTitle: {
      fontSize: '13px',
      fontWeight: 700,
      margin: '0 0 12px 0',
      color: '#374151'
    },
    stepIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px',
      padding: '0 10px'
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      flex: 1
    },
    stepNumber: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: '#e5e7eb',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      transition: 'all 0.3s ease'
    },
    stepActive: {
      background: '#4361ee',
      color: 'white'
    },
    stepCompleted: {
      background: '#10b981',
      color: 'white'
    },
    stepLabel: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#6b7280',
      textAlign: 'center'
    },
    stepConnector: {
      height: '2px',
      flex: 0.5,
      background: '#e5e7eb',
      margin: '0 10px',
      marginBottom: '25px'
    },
    connectorActive: {
      background: '#4361ee'
    },
    formSection: {
      animation: 'slideIn 0.3s ease'
    },
    formHeader: {
      marginBottom: '24px'
    },
    formHeaderH3: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#1f2937',
      margin: '0 0 4px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    formSubtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: 0
    },
    formSubtitleSuccess: {
      color: '#10b981',
      background: '#d1fae5',
      padding: '8px 12px',
      borderRadius: '8px'
    },
    areaWarning: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: '#fef3c7',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      color: '#f59e0b'
    },
    formGroup: {
      marginBottom: '24px'
    },
    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      marginBottom: '8px',
      color: '#1f2937'
    },
    required: {
      color: '#ef4444',
      marginLeft: '4px'
    },
    uploadArea: {
      position: 'relative',
      border: '2px dashed #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    uploadAreaDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    uploadPlaceholder: {
      padding: '30px 20px',
      textAlign: 'center',
      background: '#f9fafb'
    },
    uploadIcon: {
      fontSize: '32px',
      color: '#4361ee',
      marginBottom: '8px'
    },
    uploadPlaceholderSpan: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: '#4b5563',
      marginBottom: '4px'
    },
    uploadPlaceholderSmall: {
      display: 'block',
      fontSize: '12px',
      color: '#6b7280'
    },
    photoCounter: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '12px',
      flexWrap: 'wrap'
    },
    photoCounterBadge: {
      background: '#eef2ff',
      color: '#4361ee',
      padding: '6px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600
    },
    photoCounterTarget: {
      background: '#fff7ed',
      color: '#ea580c',
      padding: '6px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600
    },
    photoCounterTargetDone: {
      background: '#dcfce7',
      color: '#166534'
    },
    previewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginTop: '12px'
    },
    previewCard: {
      marginTop: '12px',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid #e5e7eb',
      background: '#fff'
    },
    previewImage: {
      width: '100%',
      height: '160px',
      objectFit: 'contain',
      objectPosition: 'center',
      background: '#f8fafc',
      borderRadius: '8px'
    },
    previewMeta: {
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    previewMetaName: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#1f2937',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    previewMetaSize: {
      fontSize: '11px',
      color: '#6b7280'
    },
    btnRemove: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    quillContainer: {
      marginBottom: '8px',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    formHint: {
      marginTop: '8px',
      fontSize: '12px',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    warningHint: {
      background: '#fef3c7',
      color: '#f59e0b',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #f59e0b'
    },
    charCounter: {
      marginTop: '4px',
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'right'
    },
    btnSubmit: {
      width: '100%',
      padding: '14px 20px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    btnPrimary: {
      background: '#4361ee',
      color: 'white'
    },
    btnDisabled: {
      background: '#e5e7eb',
      color: '#6b7280',
      cursor: 'not-allowed'
    },
    spinner: {
      animation: 'spin 1s linear infinite'
    },
    completionMessage: {
      textAlign: 'center',
      padding: '30px 20px'
    },
    completionIcon: {
      fontSize: '60px',
      color: '#10b981',
      marginBottom: '20px',
      animation: 'popIn 0.5s ease'
    },
    completionMessageH3: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#1f2937',
      margin: '0 0 8px 0'
    },
    completionMessageP: {
      color: '#6b7280',
      marginBottom: '24px'
    },
    completionDetails: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    detailItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#f9fafb',
      padding: '8px 16px',
      borderRadius: '30px',
      fontSize: '14px',
      color: '#4b5563'
    },
    laporanSummary: {
      background: '#f9fafb',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '24px',
      textAlign: 'left'
    },
    laporanSummaryH4: {
      fontSize: '14px',
      fontWeight: 600,
      margin: '0 0 8px 0',
      color: '#1f2937'
    },
    laporanHtml: {
      fontSize: '14px',
      color: '#4b5563',
      margin: 0,
      lineHeight: 1.6,
      maxWidth: '100%',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word'
    },
    completionActions: {
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    },
    btnOutline: {
      padding: '10px 24px',
      background: 'white',
      border: '2px solid #4361ee',
      color: '#4361ee',
      borderRadius: '8px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    btnOutlineDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      borderColor: '#9ca3af',
      color: '#9ca3af'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    },
    emptyIcon: {
      fontSize: '60px',
      color: '#9ca3af',
      marginBottom: '20px'
    },
    emptyStateH3: {
      fontSize: '20px',
      fontWeight: 600,
      margin: '0 0 8px 0',
      color: '#1f2937'
    },
    emptyStateP: {
      color: '#6b7280',
      marginBottom: '24px'
    },
    btnPrimary2: {
      padding: '12px 30px',
      background: '#4361ee',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    },
    loadingScreen: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '20px'
    },
    loadingSpinner: {
      width: '50px',
      height: '50px',
      border: '4px solid #e5e7eb',
      borderTopColor: '#4361ee',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    statusLoading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '20px',
      color: '#6b7280'
    }
  };

  /* ===== RENDER LOADING ===== */
  if (loading.awal) {
    return (
      <PegawaiLayout>
        <div style={styles.loadingScreen}>
          <div style={styles.loadingSpinner}></div>
          <h4 style={{ color: '#1f2937', margin: 0 }}>Memuat data presensi...</h4>
          <p style={{ color: '#6b7280', margin: 0 }}>Mohon tunggu sebentar</p>
        </div>
      </PegawaiLayout>
    );
  }

  /* ===== RENDER UTAMA ===== */
  return (
    <PegawaiLayout>
      <div style={styles.container} className="container-class">
        
        {/* Header */}
        <div style={styles.header} className="header-class">
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>
              <FaLocationArrow />
              <span style={{ fontSize: '1.2rem' }}>
                <span style={{ fontStyle: 'italic' }}>Tagging</span> Lokasi Perjalanan Dinas
              </span>
            </h1>
            <span style={styles.headerDate}>
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
          {user && (
            <div style={styles.headerUser}>
              <FaUserCheck />
              <span>{user.nama}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        {success && (
          <div style={{...styles.alertMessage, ...styles.alertSuccess}}>
            <FaCheckCircle />
            {success}
          </div>
        )}

        {error && !suratStatus?.isExpired && (
          <div style={{...styles.alertMessage, ...styles.alertError}}>
            <FaExclamationTriangle />
            {error}
            <button style={styles.btnRetry} onClick={() => setRetryCount(prev => prev + 1)}>
              Coba Lagi
            </button>
          </div>
        )}

        {/* Surat Info */}
        {surat && suratStatus && (
          <div style={{
            ...styles.alertCard,
            ...(suratStatus.isExpired ? styles.alertCardExpired :
               suratStatus.isUpcoming ? styles.alertCardUpcoming :
               styles.alertCardActive)
          }}>
            <div style={styles.alertIcon}>
              {suratStatus.isExpired ? <FaExclamationTriangle /> :
               suratStatus.isUpcoming ? <FaClock /> :
               <FaFileAlt />}
            </div>
            <div style={styles.alertContent}>
              <h5 style={styles.alertContentH5}>
                {suratStatus.isExpired ? 'Surat Tugas Berakhir' :
                 suratStatus.isUpcoming ? 'Surat Tugas Belum Aktif' :
                 'Surat Tugas Aktif'}
              </h5>
              <p style={styles.alertContentP}>
                {suratStatus.label} • {surat.nama_kegiatan} • {surat.daerah_tujuan}
              </p>
            </div>
            {suratStatus.isActive && (
              <div style={styles.suratBadge}>
                <FaCalendarDay />
                <span>Hari ke-{hariKe}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        {!surat ? (
          <div style={styles.emptyState}>
            <FaFileAlt style={styles.emptyIcon} />
            <h3 style={styles.emptyStateH3}>Tidak Ada Surat Tugas Aktif</h3>
            <p style={styles.emptyStateP}>Anda tidak memiliki surat tugas yang aktif saat ini</p>
            <button style={styles.btnPrimary2} onClick={() => setRetryCount(prev => prev + 1)}>
              <FaCrosshairs /> Refresh
            </button>
          </div>
        ) : suratStatus?.isExpired || suratStatus?.isUpcoming ? (
          <div style={styles.emptyState}>
            {suratStatus.isExpired ? (
              <>
                <FaExclamationTriangle style={styles.emptyIcon} />
                <h3 style={styles.emptyStateH3}>Surat Tugas Telah Berakhir</h3>
              </>
            ) : (
              <>
                <FaClock style={styles.emptyIcon} />
                <h3 style={styles.emptyStateH3}>Surat Tugas Belum Aktif</h3>
              </>
            )}
            <p style={styles.emptyStateP}>{suratStatus.label}</p>
          </div>
        ) : (
          <div style={{...styles.grid, ...{gridTemplateColumns: '1fr 400px'}}} className="grid-class">
            {/* Left Column - Map & Info */}
            <div style={styles.leftColumn}>
              {/* Map Panel */}
              {lokasi && targetPresensiHariIni && suratStatus?.isActive && mapZoom && mapCenter && (
                <div style={styles.mapPanel}>
                  <div style={styles.mapHeader}>
                    <div style={styles.mapTitle}>
                      <FaMapMarkerAlt style={styles.mapTitleIcon} />
                      <h3 style={styles.mapTitleH3}>Lokasi Presensi</h3>
                    </div>
                    <div style={styles.mapControls}>
                      <div style={styles.locationBadge}>
                        <FaMapPin />
                        <span>{targetPresensiHariIni.nama}</span>
                        <span style={{
                          ...styles.badge,
                          ...(targetPresensiHariIni.type === "KOTA_PALU" ? styles.badgeSuccess : styles.badgePrimary)
                        }}>
                          {targetPresensiHariIni.type}
                        </span>
                      </div>
                      <button 
                        style={{...styles.btnIcon, ...{marginLeft: '4px'}}}
                        onClick={handleRefreshLokasi}
                        title="Perbarui lokasi"
                        className="btn-icon-hover"
                      >
                        <FaCrosshairs />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{...styles.mapContainer, height: '350px'}} className="map-container-class">
                    <MapContainer
                      key={`map-${mapZoom}-${mapCenter[0]}-${mapCenter[1]}`}
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <ResizeFix />
                      <FitBoundsToMarkers 
                        userPos={lokasi} 
                        targetPos={targetPresensiHariIni.coordinates}
                        shouldFitBounds={shouldFitBounds}
                      />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {targetPresensiHariIni.type === "GABUNGAN" ? (
                        <>
                          {areaTargetGeojson && (
                            <GeoJSON
                              data={areaTargetGeojson}
                              style={{
                                color: "#0f172a",
                                weight: 2,
                                fillColor: "#2563eb",
                                fillOpacity: 0.35,
                              }}
                            />
                          )}
                          {areaRadiusMeters > 0 && (
                            <Circle
                              center={[
                                targetPresensiHariIni.coordinates.latitude,
                                targetPresensiHariIni.coordinates.longitude,
                              ]}
                              radius={Number(areaRadiusMeters)}
                              pathOptions={{
                                color: "#2563eb",
                                weight: 2,
                                fillColor: "#2563eb",
                                fillOpacity: 0.15,
                              }}
                            />
                          )}
                          {areaPaluGeojson && (
                            <GeoJSON
                              data={areaPaluGeojson}
                              style={{
                                color: "#0f172a",
                                weight: 2,
                                fillColor: "#7c3aed",
                                fillOpacity: 0.35,
                              }}
                            />
                          )}
                          {areaPaluRadiusMeters > 0 && (
                            <Circle
                              center={[
                                KOTA_PALU_COORDINATES.latitude,
                                KOTA_PALU_COORDINATES.longitude,
                              ]}
                              radius={Number(areaPaluRadiusMeters)}
                              pathOptions={{
                                color: "#7c3aed",
                                weight: 2,
                                fillColor: "#7c3aed",
                                fillOpacity: 0.15,
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {areaGeojson && (
                            <GeoJSON
                              data={areaGeojson}
                              style={{
                                color: "#0f172a",
                                weight: 2,
                                fillColor: targetPresensiHariIni.type === "KOTA_PALU" ? "#7c3aed" : "#2563eb",
                                fillOpacity: 0.35,
                              }}
                            />
                          )}
                          {areaRadiusMeters > 0 && (
                            <Circle
                              center={[
                                targetPresensiHariIni.coordinates.latitude,
                                targetPresensiHariIni.coordinates.longitude,
                              ]}
                              radius={Number(areaRadiusMeters)}
                              pathOptions={{
                                color: targetPresensiHariIni.type === "KOTA_PALU" ? "#7c3aed" : "#2563eb",
                                weight: 2,
                                fillColor: targetPresensiHariIni.type === "KOTA_PALU" ? "#7c3aed" : "#2563eb",
                                fillOpacity: 0.15,
                              }}
                            />
                          )}
                        </>
                      )}
                      
                      <Marker 
                        position={[targetPresensiHariIni.coordinates.latitude, targetPresensiHariIni.coordinates.longitude]}
                        icon={sudahAbsen ? targetIcon : (targetPresensiHariIni.type === "KOTA_PALU" ? paluIcon : targetIcon)}
                      >
                        <Popup>
                          <div className="popup-content">
                            <strong>{targetPresensiHariIni.nama}</strong>
                            <p>{targetPresensiHariIni.keterangan}</p>
                            {sudahAbsen && <p className="text-success">✓ Sudah absen hari ini</p>}
                          </div>
                        </Popup>
                      </Marker>

                      {targetPresensiHariIni.type === "GABUNGAN" && (
                        <Marker
                          position={[KOTA_PALU_COORDINATES.latitude, KOTA_PALU_COORDINATES.longitude]}
                          icon={paluIcon}
                        >
                          <Popup>
                            <div className="popup-content">
                              <strong>Kota Palu</strong>
                              <p>{isHariPertama ? "Hari pertama" : "Hari terakhir"} - Alternatif tagging</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      <Marker position={[lokasi.latitude, lokasi.longitude]} icon={userIcon}>
                        <Popup>
                          <div className="popup-content">
                            <strong>Posisi Anda</strong>
                            <p>Akurasi: ±{Math.round(lokasi.accuracy)} m</p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  <div style={styles.mapFooter}>
                    {/* Map Action Buttons */}
                    <div style={styles.mapActions}>
                      <button
                        type="button"
                        style={styles.mapActionBtn}
                        onClick={handleFitBounds}
                        title="Tampilkan kedua marker"
                      >
                        <FaCrosshairs /> Fit Both
                      </button>
                      <button
                        type="button"
                        style={styles.mapActionBtn}
                        onClick={handleZoomIn}
                        title="Perbesar"
                      >
                        <FaSearchPlus /> Zoom In
                      </button>
                      <button
                        type="button"
                        style={styles.mapActionBtn}
                        onClick={handleZoomOut}
                        title="Perkecil"
                      >
                        <FaSearchMinus /> Zoom Out
                      </button>
                    </div>

                    {/* Status Card */}
                    <div style={{
                      ...styles.statusCard,
                      ...(diArea ? styles.statusSuccess : styles.statusWarning),
                      ...(isFotoLengkapHariIni ? styles.statusCompleted : {})
                    }}>
                      <div style={styles.statusIcon}>
                        {isFotoLengkapHariIni ? <FaCheckCircle /> : (diArea ? <FaMapPin /> : <FaExclamationTriangle />)}
                      </div>
                      <div style={styles.statusInfo}>
                        <span style={styles.statusLabel}>
                          {isFotoLengkapHariIni
                            ? "Presensi hari ini sudah lengkap"
                            : (sudahAbsen
                              ? `${fotoProgressLabel}, silakan tambah foto berikutnya`
                              : (diArea ? "Di dalam zona tagging" : "Kamu berada di luar area tagging, silakan ke area tagging."))}
                        </span>
                      </div>
                    </div>
                  </div>
                  {targetPresensiHariIni.type === "GABUNGAN" && (
                    <div style={styles.dayOneLegend}>
                      <div style={styles.dayOneLegendTitle}>
                        {isHariPertama ? "Hari Pertama: Dua Area Aktif" : "Hari Terakhir: Dua Area Aktif"}
                      </div>
                      <div style={styles.dayOneLegendRow}>
                        <span style={{ ...styles.dayOneLegendSwatch, background: "#2563eb" }}></span>
                        <span>Daerah Tujuan</span>
                      </div>
                      <div style={styles.dayOneLegendRow}>
                        <span style={{ ...styles.dayOneLegendSwatch, background: "#7c3aed" }}></span>
                        <span>Kota Palu</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Panel */}
              {surat && targetPresensiHariIni && suratStatus?.isActive && (
                <div style={styles.infoPanel}>
                  <div style={styles.infoHeader}>
                    <FaInfoCircle style={styles.infoHeaderIcon} />
                    <h4 style={styles.infoHeaderH4}>Informasi Presensi Hari Ini</h4>
                  </div>
                  
                  <div style={styles.infoBody}>
                    <div style={{...styles.infoGrid, ...{gridTemplateColumns: 'repeat(2, 1fr)'}}} className="info-grid-class">
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Hari ke-</span>
                        <span style={styles.infoValue}>{hariKe}</span>
                        {isHariPertama && <span style={styles.badgeWarning}>HARI PERTAMA</span>}
                      </div>
                      
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Target Presensi</span>
                        <span style={styles.infoValue}>{targetPresensiHariIni.nama}</span>
                      </div>

                      {areaNama && (
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Area Polygon</span>
                          <span style={styles.infoValue}>{areaNama}</span>
                        </div>
                      )}
                      
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Status</span>
                        <span style={{
                          ...styles.valueStatus,
                          ...(isFotoLengkapHariIni ? styles.valueStatusCompleted : (diArea ? styles.valueStatusSuccess : styles.valueStatusWarning))
                        }}>
                          {isFotoLengkapHariIni
                            ? 'Presensi lengkap'
                            : (sudahAbsen
                              ? `${fotoProgressLabel}, menunggu foto berikutnya`
                              : (diArea ? 'Di dalam zona tagging' : 'Kamu berada di luar area tagging, silakan ke area tagging.'))}
                        </span>
                      </div>

                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Foto Hari Ini</span>
                        <span style={styles.infoValue}>
                          {isFotoLengkapHariIni ? '2/2 foto tersimpan' : fotoProgressLabel}
                        </span>
                      </div>

                      {gpsAccuracyMeters !== null && (
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Akurasi GPS</span>
                          <span style={styles.infoValue}>± {gpsAccuracyMeters} meter</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.infoRule}>
                      <div style={styles.ruleIcon}>
                        <FaArrowRight />
                      </div>
                      <div style={styles.ruleText}>
                        {(() => {
                          if (targetPresensiHariIni?.type === "GABUNGAN") {
                            return (
                              <>
                                <span>
                                  {isHariPertama ? "Hari pertama" : "Hari terakhir"} presensi bisa di <strong>Kota Palu</strong> atau <strong>{surat.daerah_tujuan}</strong>
                                </span>
                                <br />
                                <small style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {isHariPertama
                                    ? `Mulai besok presensi di ${surat.daerah_tujuan}`
                                    : "Area gabungan aktif sampai akhir penugasan hari ini"}
                                </small>
                              </>
                            );
                          }
                          return <>Presensi di <strong>{surat.daerah_tujuan}</strong></>;
                        })()}
                      </div>
                    </div>

                    {riwayatPresensi.length > 0 && (
                      <div style={styles.historyPanel}>
                        <p style={styles.historyTitle}>
                          Presensi Harian Selama Surat Aktif
                        </p>
                        <div className="presensi-history-list">
                          {riwayatPresensi.map((item, index) => {
                            const hariKeRiwayat = item.hari_ke || index + 1;
                            const isToday = item.tanggal_presensi === todayDateString;

                            return (
                              <div key={`history-mobile-${index}`} className={`presensi-history-item${isToday ? ' today' : ''}`}>
                                <div className="presensi-history-meta">
                                  <span className="presensi-history-day">Hari ke-{hariKeRiwayat}</span>
                                  <span className="presensi-history-date">
                                    {item.tanggal_presensi
                                      ? new Date(item.tanggal_presensi).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                      : '-'}
                                    {isToday ? ' • Hari ini' : ''}
                                  </span>
                                </div>
                                <span className={`presensi-history-status ${item.laporan ? 'done' : 'pending'}`}>
                                  {item.laporan ? 'Laporan selesai' : 'Belum laporan'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Informasi Riwayat Presensi */}
                    {riwayatPresensi.length < 0 && (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0', color: '#374151' }}>
                          Riwayat Presensi:
                        </p>
                        {riwayatPresensi.map((item, index) => {
                          // Hitung hari ke berdasarkan urutan (index + 1)
                          const hariKeRiwayat = item.hari_ke || index + 1;
                          const isToday = item.tanggal_presensi === todayDateString;
                          
                          return (
                            <div key={index} style={{ 
                              fontSize: '12px', 
                              color: '#4b5563', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              marginBottom: '4px',
                              padding: '4px 8px',
                              backgroundColor: isToday ? '#e0f2fe' : 'transparent',
                              borderRadius: '4px',
                              fontWeight: isToday ? 500 : 'normal'
                            }}>
                              <span>Hari ke-{hariKeRiwayat}</span>
                              <span>
                                {item.tanggal_presensi 
                                  ? new Date(item.tanggal_presensi).toLocaleDateString('id-ID', { 
                                      day: 'numeric', 
                                      month: 'short' 
                                    }) 
                                  : '-'}
                              </span>
                              <span style={{ 
                                color: item.laporan ? '#10b981' : '#f59e0b', 
                                fontWeight: item.laporan ? 'normal' : 'bold' 
                              }}>
                                {item.laporan ? '✓ Laporan' : '⏳ Belum laporan'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Form */}
            <div style={styles.rightColumn} className="right-column-class">
              {/* Loading status */}
              {loading.cekStatus && (
                <div style={styles.statusLoading}>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                  Memeriksa status presensi...
                </div>
              )}

              {/* Step Indicator */}
              {!loading.cekStatus && suratStatus?.isActive && (
                <div style={styles.stepIndicator}>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepNumber,
                      ...(currentStep >= 1 ? styles.stepActive : {}),
                      ...(isFotoLengkapHariIni ? styles.stepCompleted : {})
                    }}>
                      {isFotoLengkapHariIni ? <FaCheckCircle /> : '1'}
                    </div>
                    <div style={styles.stepLabel}>Absen + Foto</div>
                  </div>
                  <div style={{
                    ...styles.stepConnector,
                    ...(currentStep >= 2 ? styles.connectorActive : {})
                  }}></div>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepNumber,
                      ...(currentStep >= 2 ? styles.stepActive : {}),
                      ...(sudahLaporan ? styles.stepCompleted : {})
                    }}>
                      {sudahLaporan ? <FaCheckCircle /> : '2'}
                    </div>
                    <div style={styles.stepLabel}>Laporan Kegiatan</div>
                  </div>
                  <div style={{
                    ...styles.stepConnector,
                    ...(currentStep >= 3 ? styles.connectorActive : {})
                  }}></div>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepNumber,
                      ...(currentStep >= 3 ? styles.stepActive : {}),
                      ...(sudahLaporan ? styles.stepCompleted : {})
                    }}>
                      {sudahLaporan ? <FaCheckCircle /> : '3'}
                    </div>
                    <div style={styles.stepLabel}>Selesai</div>
                  </div>
                </div>
              )}

              {/* Form Container */}
              {!loading.cekStatus && (
                <div style={styles.formContainer}>
                  {/* STEP 1: ABSEN + FOTO */}
                  {currentStep === 1 && (!sudahAbsen || !isFotoLengkapHariIni) && (
                    <div style={styles.formSection}>
                      <div style={styles.formHeader}>
                        <h3 style={styles.formHeaderH3}>
                          <FaCamera />
                          Step 1: Absen + Foto
                        </h3>
                        <p style={styles.formSubtitle}>
                          {sudahAbsen && !isFotoLengkapHariIni
                            ? `${fotoProgressLabel}. Sekarang silakan tambah foto kedua untuk melengkapi presensi.`
                            : 'Ambil lalu simpan foto pertama terlebih dahulu.'}
                        </p>
                      </div>

                      <form onSubmit={handleAbsen}>
                        {/* Status Area Warning */}
                        {!diArea && (
                          <div style={styles.areaWarning}>
                            <FaExclamationTriangle />
                            <div>
                              <strong>Kamu berada di luar area tagging, silakan ke area tagging.</strong>
                              <div style={{ marginTop: '4px', fontSize: '13px', opacity: 0.9 }}>
                                Refresh lokasi lalu coba lagi lebih dekat ke area {targetPresensiHariIni?.nama || 'presensi'}. Jika area memakai radius atau polygon, sistem akan memeriksa keduanya.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Foto Upload */}
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            <FaCamera />
                            Foto Selfie di Lokasi
                            <span style={styles.required}>*</span>
                          </label>

                          <div style={styles.photoCounter}>
                            <span style={styles.photoCounterBadge}>
                              {totalFotoHariIni}/{maxFotoPerHari} foto dipilih/tersimpan
                            </span>
                            <span style={{
                              ...styles.photoCounterTarget,
                              ...(isFotoLengkapHariIni ? styles.photoCounterTargetDone : {})
                            }}>
                              Minimal 2 foto per hari
                            </span>
                          </div>
                          
                          <div style={{
                            ...styles.uploadArea,
                            ...(!diArea ? styles.uploadAreaDisabled : {})
                          }}>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept={PRESENSI_ACCEPT_ATTRIBUTE}
                              multiple
                              capture="environment"
                              onChange={handleTambahFoto}
                              disabled={!canSelectFoto}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: !canSelectFoto ? 'not-allowed' : 'pointer'
                              }}
                            />
                            <div style={styles.uploadPlaceholder}>
                              <FaImage style={styles.uploadIcon} />
                              <span style={styles.uploadPlaceholderSpan}>Tap atau klik untuk mengambil atau menambah foto</span>
                              <small style={styles.uploadPlaceholderSmall}>Mendukung JPG, PNG, HEIC, HEIF, dan WEBP. Foto akan dinormalisasi otomatis sebelum dikirim bila memungkinkan.</small>
                            </div>
                          </div>

                          {!!uploadedFotoCount && (
                            <div style={styles.formHint}>
                              <FaCheckCircle style={{ marginRight: '4px' }} />
                              {fotoProgressLabel} di server untuk hari ini.
                            </div>
                          )}

                          {!!uploadedFotoPreviewList.length && (
                            <div style={{ marginTop: '14px' }}>
                              <div style={{ ...styles.formHint, marginBottom: '10px' }}>
                                <FaImage style={{ marginRight: '4px' }} />
                                Foto yang sudah tersimpan
                              </div>
                              <div style={styles.previewGrid}>
                                {uploadedFotoPreviewList.map((item) => (
                                  <div key={item.key} style={styles.previewCard}>
                                    <img src={item.src} alt={item.label} style={styles.previewImage} />
                                    <div style={styles.previewMeta}>
                                      <span style={styles.previewMetaName}>{item.label}</span>
                                      <span style={styles.previewMetaSize}>Sudah dikirim</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!diArea && (
                            <div style={{ ...styles.formHint, ...styles.warningHint }}>
                              <FaLocationArrow style={{ marginRight: '4px' }} />
                              Browser membaca Anda di luar polygon. Jika Anda sebenarnya ada di lokasi, tekan refresh lokasi lalu kirim agar backend yang memutuskan.
                            </div>
                          )}

                          {!!selectedFotoCount && (
                            <div style={styles.previewGrid}>
                              {fotoFiles.map((item, index) => (
                                <div key={item.key} style={styles.previewCard}>
                                  <img src={item.previewUrl} alt={`Preview ${index + 1}`} style={styles.previewImage} />
                                  <div style={styles.previewMeta}>
                                    <span style={styles.previewMetaName}>{item.file.name}</span>
                                    <span style={styles.previewMetaSize}>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                  <button 
                                    type="button" 
                                    style={styles.btnRemove}
                                    onClick={() => handleHapusFoto(index)}
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          style={{
                            ...styles.btnSubmit,
                            ...(canSubmitAbsen ? styles.btnPrimary : styles.btnDisabled)
                          }}
                          disabled={!canSubmitAbsen}
                        >
                          {loading.submitAbsen ? (
                            <>
                              <FaSpinner style={styles.spinner} />
                              Memproses Absen...
                            </>
                          ) : (
                            <>
                              <FaCamera />
                              {sudahAbsen && !isFotoLengkapHariIni
                                ? 'Tambah Foto Kedua'
                                : 'Simpan Foto Pertama'}
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* STEP 2: LAPORAN KEGIATAN */}
                  {currentStep === 2 && canOpenLaporan && !sudahLaporan && (
                    <div style={styles.formSection}>
                      <div style={styles.formHeader}>
                        <h3 style={styles.formHeaderH3}>
                          <FaPen />
                          Step 2: Laporan Kegiatan
                        </h3>
                        <p style={{...styles.formSubtitle, ...styles.formSubtitleSuccess}}>
                          <FaCheckCircle style={{ marginRight: '4px' }} />
                          Tagging lokasi berhasil!
                        </p>
                        {/* Informasi batas waktu 24 jam */}
                        <div style={{...styles.formHint, ...styles.warningHint, marginTop: '8px'}}>
                          <FaClock />
                          <span>
                            <strong>Batas waktu pengisian laporan: 24 jam</strong>
                            {sisaWaktuLaporan && sisaWaktuLaporan !== "Waktu habis" && (
                              <> (Sisa waktu: {sisaWaktuLaporan})</>
                            )}
                            {sisaWaktuLaporan === "Waktu habis" && (
                              <> - WAKTU SUDAH HABIS!</>
                            )}
                          </span>
                        </div>
                      </div>

                      <form onSubmit={handleLaporan}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            <FaFileAlt />
                            Deskripsi Kegiatan Hari Ini
                            <span style={styles.required}>*</span>
                          </label>
                          
                          {/* Rich Text Editor */}
                          <div style={styles.quillContainer}>
                            <RichTextEditor
                              value={laporan}
                              onChange={setLaporan}
                              placeholder={`Jelaskan kegiatan yang dilakukan hari ini di ${targetPresensiHariIni?.nama || 'lokasi tugas'}...\n\nContoh format:\n1. Kegiatan pagi: ...\n2. Kegiatan siang: ...\n3. Kendala yang dihadapi: ...\n4. Hasil yang dicapai: ...`}
                              readOnly={loading.submitLaporan || sisaWaktuLaporan === "Waktu habis"}
                            />
                          </div>
                          
                          <div style={styles.formHint}>
                            <FaRegClock style={{ marginRight: '4px' }} />
                            Laporan dapat diisi maksimal 24 jam setelah Tagging lokasi
                          </div>
                          <div style={styles.charCounter}>
                            {laporan.replace(/<[^>]*>/g, '').length} karakter (min. 10)
                          </div>
                        </div>

                        <button
                          type="submit"
                          style={{
                            ...styles.btnSubmit,
                            ...(laporan.replace(/<[^>]*>/g, '').trim() && 
                               laporan.replace(/<[^>]*>/g, '').length >= 10 && 
                               !loading.submitLaporan && 
                               sisaWaktuLaporan !== "Waktu habis" ? styles.btnPrimary : styles.btnDisabled)
                          }}
                          disabled={
                            !laporan.replace(/<[^>]*>/g, '').trim() || 
                            laporan.replace(/<[^>]*>/g, '').length < 10 || 
                            loading.submitLaporan ||
                            sisaWaktuLaporan === "Waktu habis"
                          }
                        >
                          {loading.submitLaporan ? (
                            <>
                              <FaSpinner style={styles.spinner} />
                              Menyimpan Laporan...
                            </>
                          ) : sisaWaktuLaporan === "Waktu habis" ? (
                            <>
                              <FaClock />
                              Batas Waktu Habis
                            </>
                          ) : (
                            <>
                              <FaCheckCircle />
                              Simpan Laporan
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* STEP 3: SELESAI */}
                  {currentStep === 3 && sudahAbsen && sudahLaporan && (
                    <div style={styles.formSection}>
                      <div style={styles.completionMessage}>
                        <div style={styles.completionIcon}>
                          <FaCheckDouble />
                        </div>
                        <h3 style={styles.completionMessageH3}>Presensi Hari Ini Selesai!</h3>
                        <p style={styles.completionMessageP}>Terima kasih telah melakukan tagging lokasi dan laporan kegiatan hari ini</p>
                        
                        <div style={styles.completionDetails}>
                          <div style={styles.detailItem}>
                            <FaCalendarDay />
                            <span>Hari ke-{hariKe}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <FaMapPin />
                            <span>{targetPresensiHariIni?.nama}</span>
                          </div>
                          {waktuAbsen && (
                            <div style={styles.detailItem}>
                              <FaClock />
                              <span>{new Date(waktuAbsen).toLocaleTimeString('id-ID')}</span>
                            </div>
                          )}
                        </div>

                        <div style={styles.laporanSummary}>
                          <h4 style={styles.laporanSummaryH4}>Laporan Anda:</h4>
                          <div 
                            style={styles.laporanHtml}
                            className="laporan-summary-content"
                            dangerouslySetInnerHTML={{ __html: laporan }}
                          />
                        </div>

                        <div style={styles.completionActions}>
                          {/* Informasi bahwa besok harus absen lagi */}
                          {suratStatus?.sisaHari > 1 && (
                            <div style={{ ...styles.detailItem, background: '#eef2ff', color: '#4361ee' }}>
                              <FaCalendarDay />
                              <span>Besok hari ke-{hariKe + 1}, jangan lupa absen!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PegawaiLayout>
  );
};

export default PresensiPegawai;









