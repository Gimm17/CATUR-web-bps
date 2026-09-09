import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import axios from "axios";

// FIX marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onSelect, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });
  return null;
}

function normalizeLatLng(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

function getZoomFromRadius(radius) {
  const safeRadius = Number(radius);

  if (!Number.isFinite(safeRadius) || safeRadius <= 0) return 15;
  if (safeRadius <= 100) return 18;
  if (safeRadius <= 300) return 17;
  if (safeRadius <= 700) return 16;
  if (safeRadius <= 1500) return 15;
  if (safeRadius <= 3000) return 14;
  if (safeRadius <= 7000) return 13;
  if (safeRadius <= 15000) return 12;
  return 11;
}

function MapViewportController({ position, radius = 0 }) {
  const map = useMap();

  useEffect(() => {
    const latLng = normalizeLatLng(position);
    if (!latLng) return;

    map.flyTo(latLng, getZoomFromRadius(radius), {
      animate: true,
      duration: 1.2,
    });
  }, [map, position, radius]);

  return null;
}

export default function LocationPicker({
  onSelect,
  radius = 0,
  initialLocation = null,
  showMarker = true,
  showCircle = true,
}) {
  const [position, setPosition] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const searchLocation = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      setLoading(true);
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: trimmedQuery,
            format: "json",
            limit: 1,
          },
        }
      );

      if (!res.data.length) {
        return;
      }

      const lat = parseFloat(res.data[0].lat);
      const lng = parseFloat(res.data[0].lon);

      const newPos = { lat, lng };
      setPosition(newPos);
      onSelect(newPos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLocation) return;
    setPosition(initialLocation);
  }, [initialLocation]);

  const markerPosition = normalizeLatLng(position);
  const mapCenter = normalizeLatLng(initialLocation) || [-6.2, 106.816666];

  return (
    <>
      <div className="input-group mb-2">
        <input
          type="text"
          className="form-control"
          placeholder="Cari lokasi (contoh: Kantor Kecamatan)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchLocation()}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={searchLocation}
          disabled={loading}
        >
          {loading ? "Cari..." : "Cari"}
        </button>
      </div>

      <div className="map-frame">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%", borderRadius: "10px" }}
        >
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onSelect={onSelect} setPosition={setPosition} />
          <MapViewportController
            position={position}
            radius={showCircle ? Number(radius) : 0}
          />

          {markerPosition && showMarker && <Marker position={markerPosition} />}

          {markerPosition && showCircle && radius > 0 && (
            <Circle
              center={markerPosition}
              radius={Number(radius)}
              pathOptions={{
                color: "blue",
                fillColor: "blue",
                fillOpacity: 0.2,
              }}
            />
          )}
        </MapContainer>
      </div>
    </>
  );
}
