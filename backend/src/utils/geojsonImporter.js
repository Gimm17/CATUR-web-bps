const fs = require('fs');
const path = require('path');

const KAB_DIR = path.join(process.cwd(), 'peta kabupaten');
const KEC_DIR = path.join(process.cwd(), 'peta kecamatan');

function normalizeName(value) {
  if (!value) return '';
  return String(value).toUpperCase().replace(/\s+/g, ' ').trim();
}

function buildLabel(level, rawName) {
  const upper = normalizeName(rawName);
  if (level === 'kabupaten') {
    if (upper === 'PALU') return 'Kota Palu';
    return `Kabupaten/Kota ${upper.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  if (level === 'kecamatan') {
    return `Kecamatan ${upper.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  return rawName || '-';
}

function accumulateCoords(coords, acc) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    acc.sumLon += coords[0];
    acc.sumLat += coords[1];
    acc.count += 1;
    return;
  }
  coords.forEach((item) => accumulateCoords(item, acc));
}

function centroidFromFeatures(features) {
  const acc = { sumLon: 0, sumLat: 0, count: 0 };
  for (const feature of features) {
    if (feature?.geometry?.coordinates) {
      accumulateCoords(feature.geometry.coordinates, acc);
    }
  }
  if (!acc.count) return { latitude: 0, longitude: 0 };
  return { latitude: acc.sumLat / acc.count, longitude: acc.sumLon / acc.count };
}

function loadFeaturesFromDir(dirPath, levelKey, nameProp) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter((file) => file.toLowerCase().endsWith('.geojson'));
  const records = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const features = Array.isArray(data.features) ? data.features : [];

    for (const feature of features) {
      if (!feature?.geometry) continue;
      const props = feature.properties || {};
      const rawName = props[nameProp];
      if (!rawName) continue;
      records.push({
        level: levelKey,
        name: normalizeName(rawName),
        geometry: feature.geometry,
      });
    }
  }

  return records;
}

function groupRegions(levelFilter = 'all') {
  const map = new Map();
  if (levelFilter === 'all' || levelFilter === 'kabupaten') {
    const kabRecords = loadFeaturesFromDir(KAB_DIR, 'kabupaten', 'nmkab');
    for (const record of kabRecords) {
      const key = `${record.level}|${record.name}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ type: 'Feature', properties: {}, geometry: record.geometry });
    }
  }

  if (levelFilter === 'all' || levelFilter === 'kecamatan') {
    const kecRecords = loadFeaturesFromDir(KEC_DIR, 'kecamatan', 'nmkec');
    for (const record of kecRecords) {
      const key = `${record.level}|${record.name}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ type: 'Feature', properties: {}, geometry: record.geometry });
    }
  }

  const regions = [];
  for (const [key, features] of map.entries()) {
    const [level, name] = key.split('|');
    const centroid = centroidFromFeatures(features);
    regions.push({
      level,
      name,
      label: buildLabel(level, name),
      centroid,
      geojson: {
        type: 'FeatureCollection',
        features,
      },
    });
  }

  return regions;
}

module.exports = {
  groupRegions,
};
