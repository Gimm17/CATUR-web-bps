require('dotenv').config();
const ensureSchema = require('../utils/ensureSchema');
const { syncDaerahGeojson } = require('../utils/syncDaerahGeojson');

const level = (process.argv[2] || 'all').toLowerCase();

(async () => {
  try {
    await ensureSchema();
    const summary = await syncDaerahGeojson(level);
    console.log(
      `GeoJSON sync selesai: total=${summary.total}, created=${summary.created}, updated=${summary.updated}`
    );
  } catch (err) {
    console.error('GeoJSON sync gagal:', err.message);
    process.exitCode = 1;
  }
})();
