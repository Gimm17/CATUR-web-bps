const test = require('node:test');
const assert = require('node:assert/strict');
const {
  KABUPATEN_LIST,
  KECAMATAN_TO_KABUPATEN,
  resolveWilayahAccess,
  resolveDaerahKabupaten,
  enrichDaerah,
} = require('../../src/utils/wilayahHierarki');

test('memetakan 13 Kabupaten/Kota dan seluruh 179 Kecamatan Sulawesi Tengah', () => {
  assert.equal(KABUPATEN_LIST.length, 13);
  assert.ok(KECAMATAN_TO_KABUPATEN.size >= 179);

  const banawaKab = resolveDaerahKabupaten({
    nama_daerah: 'Kecamatan Banawa',
    titik_lokasi: 'kecamatan',
  });
  assert.equal(banawaKab?.nama, 'DONGGALA');
  assert.equal(banawaKab?.kode_bps, '7205');

  const paluSelatanKab = resolveDaerahKabupaten({
    nama_daerah: 'Kecamatan Palu Selatan',
    titik_lokasi: 'kecamatan',
  });
  assert.equal(paluSelatanKab?.nama, 'PALU');
  assert.equal(paluSelatanKab?.kode_bps, '7271');
});

test('resolveWilayahAccess mengenali akun Provinsi dan akun Kabupaten/Kota secara akurat', () => {
  const provAccess = resolveWilayahAccess('BPS Provinsi Sulawesi Tengah');
  assert.equal(provAccess.scope, 'provinsi');
  assert.equal(provAccess.is_locked, false);

  const donggalaAccess = resolveWilayahAccess('BPS Kabupaten Donggala');
  assert.equal(donggalaAccess.scope, 'kabupaten');
  assert.equal(donggalaAccess.is_locked, true);
  assert.equal(donggalaAccess.kabupaten_nama, 'DONGGALA');
  assert.equal(donggalaAccess.kode_bps, '7205');

  const bangkepAccess = resolveWilayahAccess('BPS Kabupaten Banggai Kepulauan');
  assert.equal(bangkepAccess.kabupaten_nama, 'BANGGAI KEPULAUAN');

  const banggaiAccess = resolveWilayahAccess('BPS Kabupaten Banggai');
  assert.equal(banggaiAccess.kabupaten_nama, 'BANGGAI');
});

test('enrichDaerah menambahkan metadata kabupaten dan has_polygon', () => {
  const enrichedPolygon = enrichDaerah({
    id: 45,
    nama_daerah: 'Kecamatan Sindue',
    titik_lokasi: 'kecamatan',
    geojson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[119.8, -0.5], [119.9, -0.5], [119.9, -0.6], [119.8, -0.5]]],
          },
        },
      ],
    },
  });

  assert.equal(enrichedPolygon.has_polygon, true);
  assert.equal(enrichedPolygon.level_wilayah, 'kecamatan');
  assert.equal(enrichedPolygon.kabupaten_nama, 'DONGGALA');
  assert.equal(enrichedPolygon.kabupaten_label, 'Kabupaten/Kota Donggala');
});
