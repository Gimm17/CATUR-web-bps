const express = require("express");
const router = express.Router();
const daerahController = require("../controllers/daerah.controller");

router.post("/", daerahController.createDaerah);
router.get("/", daerahController.getDaerah);
router.post("/sync-geojson", daerahController.syncDaerahFromGeojson);
router.get("/count", daerahController.getDaerahCount);
router.get("/:id", daerahController.getDaerahById);
router.put("/:id", daerahController.updateDaerah);
router.delete("/:id", daerahController.deleteDaerah);

module.exports = router;
