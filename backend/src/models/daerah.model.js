const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Daerah = sequelize.define(
  "daerah",
  {
    nama_daerah: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    titik_lokasi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    geojson: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "daerah",
    timestamps: false,
  }
);

module.exports = Daerah;
