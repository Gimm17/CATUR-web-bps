function pointInRing(point, ring) {
  let inside = false;
  const x = point[0];
  const y = point[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon || !polygon.length) return false;
  if (!pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function isPointInsideGeojson(lat, lon, geojson) {
  const point = [lon, lat];
  if (!geojson) return false;
  const parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
  if (parsed.type === 'FeatureCollection') {
    return parsed.features?.some((feature) => pointInGeometry(point, feature.geometry));
  }
  if (parsed.type === 'Feature') {
    return pointInGeometry(point, parsed.geometry);
  }
  return pointInGeometry(point, parsed);
}

module.exports = {
  isPointInsideGeojson,
};
