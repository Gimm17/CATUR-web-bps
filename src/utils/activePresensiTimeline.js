export async function loadActivePresensiTimeline(suratAktif, getLaporanPerjalanan) {
  if (!suratAktif?.id) return [];

  const perjalananAktif = await getLaporanPerjalanan(suratAktif.id);
  if (!Array.isArray(perjalananAktif?.presensi)) return [];

  return perjalananAktif.presensi
    .filter((item) => {
      const tanggal = item?.tanggal_presensi;
      if (!tanggal || !suratAktif.tanggal_mulai || !suratAktif.tanggal_selesai) return true;
      return tanggal >= suratAktif.tanggal_mulai && tanggal <= suratAktif.tanggal_selesai;
    })
    .map((item, index) => ({
      ...item,
      hari_ke: item?.hari_ke || index + 1,
    }));
}
