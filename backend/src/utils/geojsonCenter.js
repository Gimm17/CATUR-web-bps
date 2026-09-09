function flattenCoordinates(input, points = []) {
  if (!Array.isArray(input)) return points;

  if (
    input.length >= 2 &&
    typeof input[0] === 'number' &&
    typeof input[1] === 'number'
  ) {
    points.push([input[0], input[1]]);
    return points;
  }

  input.forEach((item) => flattenCoordinates(item, points));
  return points;
}

function normalizeGeojson(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }
  return raw;
}

function getGeojsonCenter(rawGeojson) {
  const geojson = normalizeGeojson(rawGeojson);
  if (!geojson) return null;

  const features =
    geojson.type === 'FeatureCollection'
      ? geojson.features || []
      : geojson.type === 'Feature'
        ? [geojson]
        : [{ geometry: geojson }];

  const points = [];
  features.forEach((feature) => {
    flattenCoordinates(feature?.geometry?.coordinates, points);
  });

  if (!points.length) return null;

  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];

  points.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
  };
}

module.exports = {
  getGeojsonCenter,
};
