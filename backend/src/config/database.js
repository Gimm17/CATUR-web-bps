const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  String(process.env.DB_PASSWORD),
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
    logging: false,
  }
);

// TEST KONEKSI
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('DB ERROR:', err));

module.exports = sequelize;
