
require('dotenv').config();
const express = require('express');
const path = require('path');
const ensureSchema = require('./src/utils/ensureSchema');
const { syncDaerahGeojson } = require('./src/utils/syncDaerahGeojson');
const app = require('./src/app');

const publicDirectory = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

app.use(express.static(publicDirectory));

// SPA fallback hanya untuk halaman web. API yang tidak dikenal harus tetap 404,
// bukan mengembalikan index.html dengan status sukses.
app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/, (req, res, next) => {
  res.sendFile(path.join(publicDirectory, 'index.html'), (err) => {
    if (err) next(err);
  });
});

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

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})().catch((err) => {
  console.error('Server gagal start:', err);
  process.exitCode = 1;
});
