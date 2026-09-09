const Daerah = require('../models/daerah.model');
const { groupRegions } = require('./geojsonImporter');

async function syncDaerahGeojson(level = 'all') {
  const regions = groupRegions(level);
  let created = 0;
  let updated = 0;

  for (const region of regions) {
    const [record, isCreated] = await Daerah.findOrCreate({
      where: {
        nama_daerah: region.label,
        titik_lokasi: region.level,
      },
      defaults: {
        latitude: region.centroid.latitude,
        longitude: region.centroid.longitude,
        radius: 0,
        geojson: region.geojson,
      },
    });

    if (isCreated) {
      created += 1;
      continue;
    }

    await record.update({
      latitude: region.centroid.latitude,
      longitude: region.centroid.longitude,
      radius: 0,
      geojson: region.geojson,
    });
    updated += 1;
  }

  return {
    total: regions.length,
    created,
    updated,
  };
}

module.exports = {
  syncDaerahGeojson,
};
