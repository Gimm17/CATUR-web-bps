const DaerahPresensi = require("../models/daerah.model");
const { syncDaerahGeojson } = require("../utils/syncDaerahGeojson");
const { getGeojsonCenter } = require("../utils/geojsonCenter");

exports.createDaerah = async (req, res) => {
  try {
    const { nama_daerah, titik_lokasi, latitude, longitude, radius, geojson } = req.body;
    const geoCenter = geojson ? getGeojsonCenter(geojson) : null;
    const finalLatitude = latitude ?? geoCenter?.latitude ?? null;
    const finalLongitude = longitude ?? geoCenter?.longitude ?? null;

    if (!nama_daerah || finalLatitude === null || finalLongitude === null) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const daerah = await DaerahPresensi.create({
      nama_daerah,
      titik_lokasi: titik_lokasi || "",
      latitude: finalLatitude,
      longitude: finalLongitude,
      radius: radius ?? 0,
      geojson: geojson || null,
    });

    res.status(201).json({
      message: "Daerah berhasil ditambahkan",
      daerah,
    });
  } catch (err) {
    console.error("Error createDaerah:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getDaerah = async (req, res) => {
  try {
    console.log("GET /daerah dipanggil");
    const data = await DaerahPresensi.findAll({
      order: [['nama_daerah', 'ASC']]
    });
    console.log(`Data ditemukan: ${data.length} records`);
    res.json(data);
  } catch (err) {
    console.error("Error getDaerah:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getDaerahById = async (req, res) => {
  try {
    const { id } = req.params;
    const daerah = await DaerahPresensi.findByPk(id);
    
    if (!daerah) {
      return res.status(404).json({ message: "Daerah tidak ditemukan" });
    }
    
    res.json(daerah);
  } catch (err) {
    console.error("Error getDaerahById:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateDaerah = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_daerah, titik_lokasi, latitude, longitude, radius, geojson } = req.body;

    const daerah = await DaerahPresensi.findByPk(id);
    
    if (!daerah) {
      return res.status(404).json({ message: "Daerah tidak ditemukan" });
    }

    const nextGeojson = geojson ?? daerah.geojson ?? null;
    const geoCenter = nextGeojson ? getGeojsonCenter(nextGeojson) : null;
    const finalLatitude = latitude ?? geoCenter?.latitude ?? daerah.latitude ?? null;
    const finalLongitude = longitude ?? geoCenter?.longitude ?? daerah.longitude ?? null;

    await daerah.update({
      nama_daerah,
      titik_lokasi: titik_lokasi || "",
      latitude: finalLatitude,
      longitude: finalLongitude,
      radius: radius ?? daerah.radius ?? 0,
      geojson: nextGeojson,
    });

    res.json({
      message: "Daerah berhasil diupdate",
      daerah
    });
  } catch (err) {
    console.error("Error updateDaerah:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDaerah = async (req, res) => {
  try {
    const { id } = req.params;
    
    const daerah = await DaerahPresensi.findByPk(id);
    
    if (!daerah) {
      return res.status(404).json({ message: "Daerah tidak ditemukan" });
    }

    await daerah.destroy();

    res.json({
      message: "Daerah berhasil dihapus"
    });
  } catch (err) {
    console.error("Error deleteDaerah:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getDaerahCount = async (req, res) => {
  try {
    const count = await DaerahPresensi.count();
    res.json({ count });
  } catch (err) {
    console.error("Error getDaerahCount:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.syncDaerahFromGeojson = async (req, res) => {
  try {
    const level = (req.query.level || "all").toLowerCase();
    const summary = await syncDaerahGeojson(level);

    res.json({
      message: "Sinkronisasi GeoJSON selesai",
      ...summary,
    });
  } catch (err) {
    console.error("Error syncDaerahFromGeojson:", err);
    res.status(500).json({ message: err.message });
  }
};
