const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const Presensi = require('../../src/models/presensi.model');
const controller = require('../../src/controllers/presensi.controller');
const sequelize = require('../../src/config/database');
const app = require('../../src/app');

test.before(async () => {
  await sequelize.authenticate();
});

test('daftar presensi hanya mengambil data milik user login', async (t) => {
  const originalFindAll = Presensi.findAll;
  t.after(() => {
    Presensi.findAll = originalFindAll;
  });

  let receivedOptions;
  Presensi.findAll = async (options) => {
    receivedOptions = options;
    return [{
      id: 91,
      user_id: 87,
      surat_tugas_id: 225,
      foto: '["foto-1.jpg","foto-2.jpg"]',
      laporan: 'Kegiatan selesai',
      tanggal_presensi: '2026-09-10',
    }];
  };

  let statusCode = 200;
  let payload;
  const req = { user: { id: 87 } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  assert.equal(typeof controller.listPresensiSaya, 'function');
  await controller.listPresensiSaya(req, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(receivedOptions.where, { user_id: 87 });
  assert.deepEqual(receivedOptions.order, [
    ['tanggal_presensi', 'DESC'],
    ['id', 'DESC'],
  ]);
  assert.equal(receivedOptions.include[0].as, 'surat_tugas');
  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0].foto_list, ['foto-1.jpg', 'foto-2.jpg']);
  assert.equal(payload[0].is_foto_lengkap, true);
});

test('GET /api/presensi tersedia dan meneruskan identitas token', async (t) => {
  const originalFindAll = Presensi.findAll;
  t.after(() => {
    Presensi.findAll = originalFindAll;
  });

  let requestedUserId;
  Presensi.findAll = async (options) => {
    requestedUserId = options.where.user_id;
    return [];
  };

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const token = jwt.sign({ id: 87, role: 'pegawai' }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/presensi`,
    { headers: { authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.equal(requestedUserId, 87);
});

test.after(async () => {
  await sequelize.close();
});
