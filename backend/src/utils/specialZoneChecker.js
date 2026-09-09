// utils/specialZoneChecker.js
const specialZoneChecker = {
  // ID zona yang memerlukan aturan khusus (hari pertama di Palu)
  SPECIAL_ZONE_IDS: [1, 3, 4, 15],
  
  // Nama zona khusus
  SPECIAL_ZONE_NAMES: [
    'BPS Provinsi Sulawesi Tengah',
    'Kabupaten Donggala', 
    'Kabupaten Sigi',
    'Kota Palu'
  ],
  
  // Koordinat default Palu (untuk hari pertama)
  PALU_COORDINATES: {
    latitude: -0.9116469806258983, // BPS Provinsi Sulawesi Tengah
    longitude: 119.89091540480395,
    radius: 5000
  },
  
  isSpecialZone: function(surat) {
    // Cek berdasarkan ID atau nama
    if (this.SPECIAL_ZONE_IDS.includes(surat.id)) {
      return true;
    }
    
    // Atau cek berdasarkan nama
    return this.SPECIAL_ZONE_NAMES.some(name => 
      surat.daerah_tujuan?.includes(name)
    );
  }
};

module.exports = specialZoneChecker;