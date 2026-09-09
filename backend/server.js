
require('dotenv').config();
const ensureSchema = require('./src/utils/ensureSchema');
const { syncDaerahGeojson } = require('./src/utils/syncDaerahGeojson');
const app = require('./src/app');

(async () => {
  await ensureSchema();
  if (String(process.env.SYNC_GEOJSON_ON_START || '').toLowerCase() === 'true') {
    try {
      const summary = await syncDaerahGeojson(process.env.SYNC_GEOJSON_LEVEL || 'all');
      console.log(
        `GeoJSON sync selesai: total=${summary.total}, created=${summary.created}, updated=${summary.updated}`
      );
    } catch (err) {
      console.error('GeoJSON sync gagal:', err.message);
    }
  }

  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
})().catch((err) => {
  console.error('Server gagal start:', err);
  process.exitCode = 1;
});
