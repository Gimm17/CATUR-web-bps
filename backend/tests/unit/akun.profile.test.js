const test = require('node:test');
const assert = require('node:assert/strict');

test('profil pengguna tidak mengambil atau mengirim hash password', async (t) => {
  const modelPath = require.resolve('../../src/models/user.model');
  const controllerPath = require.resolve('../../src/controllers/akun.controller');
  const previousModelCache = require.cache[modelPath];
  const previousControllerCache = require.cache[controllerPath];
  let selectedAttributes;

  require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: {
      findByPk: async (_id, options) => {
        selectedAttributes = options.attributes;
        const databaseRow = {
          id: 87,
          nama: 'Pegawai Test',
          password: '$2b$10$hash-yang-tidak-boleh-keluar',
          email: 'pegawai@example.test',
          role: 'pegawai',
        };
        return Object.fromEntries(
          options.attributes.map((attribute) => [attribute, databaseRow[attribute] ?? null])
        );
      },
    },
  };
  delete require.cache[controllerPath];

  t.after(() => {
    delete require.cache[controllerPath];
    if (previousControllerCache) require.cache[controllerPath] = previousControllerCache;
    if (previousModelCache) require.cache[modelPath] = previousModelCache;
    else delete require.cache[modelPath];
  });

  const { getProfil } = require(controllerPath);
  let responseBody;
  const response = {
    json(payload) {
      responseBody = payload;
      return this;
    },
    status() {
      return this;
    },
  };

  await getProfil({ user: { id: 87 } }, response);

  assert.equal(selectedAttributes.includes('password'), false);
  assert.equal(Object.hasOwn(responseBody, 'password'), false);
  assert.equal(responseBody.email, 'pegawai@example.test');
});
