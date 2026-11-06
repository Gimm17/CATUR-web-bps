import { useMemo, useState } from 'react';
import {
  createNextTujuan,
  getDaerahType,
  formatDaerahOptionLabel,
} from './tujuanSchedule';
import {
  KABUPATEN_LIST,
  getLevelWilayah,
  resolveDaerahKabupaten,
  getStoredUserWilayahAccess,
} from './wilayahHierarki';
import SearchableSelect from './SearchableSelect';

export default function TujuanScheduleEditor({
  value,
  daerah,
  onChange,
  errors = {},
  wilayahAkses = null,
}) {
  const effectiveWilayah = useMemo(
    () => wilayahAkses || getStoredUserWilayahAccess(),
    [wilayahAkses]
  );

  const isLockedKabupaten =
    effectiveWilayah?.scope === 'kabupaten' && !!effectiveWilayah?.kabupaten_nama;

  const [daerahFilter, setDaerahFilter] = useState('all');
  const [selectedKabByRow, setSelectedKabByRow] = useState({});

  // Deteksi apakah dataset daerah memiliki data Kecamatan ber-poligon (kondisi produksi)
  const hasPolygonKecamatanDataset = useMemo(
    () =>
      Array.isArray(daerah) &&
      daerah.some(
        (item) =>
          getLevelWilayah(item) === 'kecamatan' &&
          getDaerahType(item) === 'Poligon'
      ),
    [daerah]
  );

  const filteredDaerah = useMemo(() => {
    if (!Array.isArray(daerah)) return [];

    let baseList = daerah;

    // Jika dataset memiliki Kecamatan ber-poligon, saring hanya wilayah ber-poligon
    if (hasPolygonKecamatanDataset) {
      baseList = baseList.filter((item) => getDaerahType(item) === 'Poligon');
    }

    // Jika user login terikat ke Kabupaten/Kota tertentu, batasi hanya Kecamatan di Kabupaten tersebut
    if (isLockedKabupaten) {
      const lockedKab = effectiveWilayah.kabupaten_nama;
      const inLockedKab = baseList.filter(
        (item) => resolveDaerahKabupaten(item)?.nama === lockedKab
      );
      const kecOnly = inLockedKab.filter(
        (item) => getLevelWilayah(item) === 'kecamatan'
      );
      return kecOnly.length > 0 ? kecOnly : inLockedKab;
    }

    if (daerahFilter === 'all') return baseList;
    return baseList.filter(
      (item) => String(item.titik_lokasi || '').toLowerCase() === daerahFilter
    );
  }, [daerah, daerahFilter, hasPolygonKecamatanDataset, isLockedKabupaten, effectiveWilayah]);

  const updateRow = (key, field, nextValue) => {
    onChange(
      value.map((row) =>
        row.key === key ? { ...row, [field]: nextValue } : row
      )
    );
  };

  const handleKabupatenChange = (rowKey, nextKabNama, currentDaerahId) => {
    setSelectedKabByRow((prev) => ({
      ...prev,
      [rowKey]: nextKabNama,
    }));

    if (currentDaerahId && nextKabNama) {
      const currentItem = daerah.find(
        (item) => String(item.id) === String(currentDaerahId)
      );
      const currentItemKab = resolveDaerahKabupaten(currentItem)?.nama || '';
      if (currentItemKab && currentItemKab !== nextKabNama) {
        updateRow(rowKey, 'daerah_id', '');
      }
    }
  };

  const addRow = () => {
    onChange([...value, createNextTujuan(value[value.length - 1])]);
  };

  const removeRow = (key) => {
    if (value.length === 1) return;
    onChange(value.filter((row) => row.key !== key));
  };

  return (
    <section aria-labelledby="tujuan-schedule-title">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: '16px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3
              id="tujuan-schedule-title"
              style={{
                color: 'var(--se-dark-blue)',
                fontSize: '16px',
                margin: 0,
              }}
            >
              Jadwal Tujuan
            </h3>
            {isLockedKabupaten && (
              <span
                data-testid="locked-kabupaten-badge"
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}
              >
                Akses Wilayah: {effectiveWilayah.satker_label} (Khusus Kecamatan di {effectiveWilayah.kabupaten_label})
              </span>
            )}
          </div>
          <small style={{ color: '#6c757d' }}>
            {isLockedKabupaten
              ? `Akun Anda terikat pada ${effectiveWilayah.kabupaten_label}. Pilihan wilayah dibatasi pada Kecamatan ber-poligon di dalam wilayah tersebut.`
              : 'Pilih Kabupaten/Kota terlebih dahulu untuk memfilter Kecamatan ber-poligon, dan pastikan tidak ada tanggal kosong.'}
          </small>
        </div>

        {!isLockedKabupaten && (
          <div style={{ minWidth: '200px' }}>
            <label className="se-form-label" style={{ marginBottom: '6px' }}>
              Filter wilayah
            </label>
            <SearchableSelect
              value={daerahFilter}
              onChange={(event) => setDaerahFilter(event.target.value)}
              options={[
                { value: 'all', label: 'Semua Wilayah (Poligon)' },
                { value: 'kecamatan', label: 'Level Kecamatan (Poligon)' },
                { value: 'kabupaten', label: 'Level Kabupaten/Kota (Poligon)' },
              ]}
              showSearch={false}
              showDottedLeader={false}
              placeholder="Semua Wilayah"
            />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {value.map((row, index) => {
          const rowErrors = errors[row.key] || {};
          const activeKabNama = isLockedKabupaten
            ? effectiveWilayah.kabupaten_nama
            : (selectedKabByRow[row.key] || '');

          // Saring opsi daerah berdasarkan Kabupaten/Kota yang dipilih pada baris ini
          let rowFilteredDaerah = filteredDaerah;
          if (activeKabNama) {
            const matchingKabItems = filteredDaerah.filter(
              (item) => resolveDaerahKabupaten(item)?.nama === activeKabNama
            );
            const polygonKecamatanItems = matchingKabItems.filter(
              (item) =>
                getLevelWilayah(item) === 'kecamatan' &&
                getDaerahType(item) === 'Poligon'
            );

            if (polygonKecamatanItems.length > 0 && daerahFilter !== 'kabupaten') {
              rowFilteredDaerah = polygonKecamatanItems;
            } else if (matchingKabItems.length > 0) {
              rowFilteredDaerah = matchingKabItems;
            }
          }

          const availableDaerah = rowFilteredDaerah.some(
            (item) => String(item.id) === String(row.daerah_id)
          )
            ? rowFilteredDaerah
            : [
                ...rowFilteredDaerah,
                ...daerah.filter(
                  (item) => String(item.id) === String(row.daerah_id)
                ),
              ];

          const selectedDaerah = availableDaerah.find(
            (item) => String(item.id) === String(row.daerah_id)
          );
          const selectedType = selectedDaerah
            ? getDaerahType(selectedDaerah)
            : null;

          return (
            <article
              key={row.key}
              data-testid={`tujuan-row-${index + 1}`}
              style={{
                border:
                  rowErrors.schedule || rowErrors.tanggal
                    ? '1px solid #dc3545'
                    : '1px solid var(--se-border)',
                borderRadius: '10px',
                padding: '16px',
                background: '#f8fbff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: 'var(--se-dark-blue)',
                    fontSize: '15px',
                  }}
                >
                  Tujuan {index + 1}
                </h4>
                {value.length > 1 && (
                  <button
                    type="button"
                    className="se-btn se-btn-danger"
                    aria-label={`Hapus tujuan ${index + 1}`}
                    onClick={() => removeRow(row.key)}
                    style={{ padding: '6px 10px' }}
                  >
                    <i className="bi bi-trash" aria-hidden="true" /> Hapus
                  </button>
                )}
              </div>

              <div className="se-row">
                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label
                        className="se-form-label"
                        htmlFor={`kabupaten-${row.key}`}
                        style={{ marginBottom: 0 }}
                      >
                        Kabupaten/Kota
                      </label>
                      {isLockedKabupaten && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#0369a1',
                            backgroundColor: '#e0f2fe',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          Sesuai Akun Login
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      id={`kabupaten-${row.key}`}
                      name={`kabupaten-${row.key}`}
                      value={activeKabNama}
                      disabled={isLockedKabupaten}
                      onChange={(event) =>
                        handleKabupatenChange(
                          row.key,
                          event.target.value,
                          row.daerah_id
                        )
                      }
                      placeholder="-- Semua Kabupaten/Kota --"
                      searchPlaceholder="Cari kabupaten atau kota..."
                      options={KABUPATEN_LIST.map((kab) => ({
                        value: kab.nama,
                        label: kab.label,
                        badge: `Kode ${kab.kode_bps}`,
                        badgeType: 'neutral',
                        searchTerms: `${kab.label} ${kab.satker_label} ${kab.kode_bps}`,
                      }))}
                    />
                  </div>
                </div>

                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label
                        className="se-form-label"
                        htmlFor={`daerah-${row.key}`}
                        style={{ marginBottom: 0 }}
                      >
                        Wilayah tujuan (Kecamatan)
                      </label>
                      {selectedType && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color:
                              selectedType === 'Poligon'
                                ? '#0d6efd'
                                : '#495057',
                            backgroundColor:
                              selectedType === 'Poligon'
                                ? '#e7f1ff'
                                : '#f1f3f5',
                            border: `1px solid ${
                              selectedType === 'Poligon' ? '#b6d4fe' : '#ced4da'
                            }`,
                          }}
                        >
                          {selectedType}
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      id={`daerah-${row.key}`}
                      name={`daerah-${row.key}`}
                      value={row.daerah_id}
                      onChange={(event) => {
                        const nextDaerahId = event.target.value;
                        updateRow(row.key, 'daerah_id', nextDaerahId);
                      }}
                      placeholder={
                        activeKabNama
                          ? '-- Pilih Kecamatan (Poligon) --'
                          : '-- Pilih Wilayah --'
                      }
                      searchPlaceholder="Cari kecamatan ber-poligon..."
                      required
                      hasError={!!rowErrors.daerah_id}
                      options={availableDaerah.map((item) => {
                        const type = getDaerahType(item);
                        const kabInfo = resolveDaerahKabupaten(item);
                        return {
                          value: item.id,
                          label: item.nama_daerah,
                          badge: type,
                          badgeType: type === 'Poligon' ? 'polygon' : 'radius',
                          secondaryText:
                            item.titik_lokasi === 'kabupaten'
                              ? 'Kab/Kota'
                              : item.titik_lokasi === 'kecamatan'
                                ? kabInfo?.short_label || 'Kec'
                                : null,
                          searchTerms: `${item.nama_daerah} ${kabInfo?.label || ''} ${item.titik_lokasi || ''} ${type}`,
                          rawOptionLabel: formatDaerahOptionLabel(item),
                        };
                      })}
                    />
                    {rowErrors.daerah_id && (
                      <div className="se-alert se-alert-error" role="alert">
                        {rowErrors.daerah_id}
                      </div>
                    )}
                  </div>
                </div>

                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label
                      className="se-form-label"
                      htmlFor={`mulai-${row.key}`}
                    >
                      Tanggal mulai
                    </label>
                    <input
                      id={`mulai-${row.key}`}
                      type="date"
                      className="se-form-control"
                      value={row.tanggal_mulai}
                      onChange={(event) =>
                        updateRow(row.key, 'tanggal_mulai', event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label
                      className="se-form-label"
                      htmlFor={`selesai-${row.key}`}
                    >
                      Tanggal selesai
                    </label>
                    <input
                      id={`selesai-${row.key}`}
                      type="date"
                      className="se-form-control"
                      value={row.tanggal_selesai}
                      onChange={(event) =>
                        updateRow(
                          row.key,
                          'tanggal_selesai',
                          event.target.value
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {(rowErrors.tanggal || rowErrors.schedule) && (
                <div className="se-alert se-alert-error" role="alert">
                  {rowErrors.tanggal || rowErrors.schedule}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="se-btn se-btn-outline"
        onClick={addRow}
        style={{ marginTop: '14px' }}
      >
        <i className="bi bi-plus-circle" aria-hidden="true" /> Tambah Tujuan
      </button>
    </section>
  );
}
