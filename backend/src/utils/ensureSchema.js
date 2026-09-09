const sequelize = require('../config/database');

async function ensureColumn(tableName, columnSql) {
  // Postgres supports "ADD COLUMN IF NOT EXISTS" (idempotent).
  await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnSql};`);
}

module.exports = async function ensureSchema() {
  try {
    await ensureColumn('laporan_perjalanan', 'file_word VARCHAR(1024)');
    await ensureColumn('daerah', 'geojson JSONB');
  } catch (err) {
    // Jangan crash diam-diam: lebih baik kelihatan jelas di log.
    console.error('ensureSchema failed:', err.message);
    throw err;
  }
};
