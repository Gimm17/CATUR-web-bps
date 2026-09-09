const { groupRegions } = require('./geojsonImporter');
const { isPointInsideGeojson } = require('./geojsonPolygon');

function accumulateBbox(coords, bbox) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const lon = coords[0];
    const lat = coords[1];
    if (lon < bbox.minLon) bbox.minLon = lon;
    if (lon > bbox.maxLon) bbox.maxLon = lon;
    if (lat < bbox.minLat) bbox.minLat = lat;
    if (lat > bbox.maxLat) bbox.maxLat = lat;
    return;
  }
  for (const item of coords) accumulateBbox(item, bbox);
}

function bboxFromGeojson(geojson) {
  const bbox = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  const fc = geojson?.type === 'FeatureCollection' ? geojson : null;
  const features = Array.isArray(fc?.features) ? fc.features : [];
  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (coords) accumulateBbox(coords, bbox);
  }
  if (!Number.isFinite(bbox.minLon)) {
    return null;
  }
  return bbox;
}

function pointInBbox(lat, lon, bbox) {
  return (
    lon >= bbox.minLon &&
    lon <= bbox.maxLon &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat
  );
}

let cache = null;
let cacheError = null;

function ensureCacheLoaded() {
  if (cache || cacheError) return;
  try {
    const kec = groupRegions('kecamatan').map((r) => ({
      label: r.label,
      geojson: r.geojson,
      bbox: bboxFromGeojson(r.geojson),
    })).filter((r) => r.bbox);

    const kab = groupRegions('kabupaten').map((r) => ({
      label: r.label,
      geojson: r.geojson,
      bbox: bboxFromGeojson(r.geojson),
    })).filter((r) => r.bbox);

    cache = { kecamatan: kec, kabupaten: kab };
  } catch (err) {
    cacheError = err;
  }
}

function findAdminAreas(lat, lon) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

  ensureCacheLoaded();
  if (!cache) return null;

  let kecamatan = null;
  for (const region of cache.kecamatan) {
    if (!pointInBbox(latNum, lonNum, region.bbox)) continue;
    if (isPointInsideGeojson(latNum, lonNum, region.geojson)) {
      kecamatan = region.label;
      break;
    }
  }

  let kabupaten = null;
  for (const region of cache.kabupaten) {
    if (!pointInBbox(latNum, lonNum, region.bbox)) continue;
    if (isPointInsideGeojson(latNum, lonNum, region.geojson)) {
      kabupaten = region.label;
      break;
    }
  }

  if (!kecamatan && !kabupaten) return null;
  return { kecamatan, kabupaten };
}

module.exports = {
  findAdminAreas,
};

