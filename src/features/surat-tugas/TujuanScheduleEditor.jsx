import { useMemo, useState } from 'react';
import { createNextTujuan } from './tujuanSchedule';

export default function TujuanScheduleEditor({
  value,
  daerah,
  onChange,
  errors = {},
}) {
  const [daerahFilter, setDaerahFilter] = useState('all');
  const filteredDaerah = useMemo(() => {
    if (daerahFilter === 'all') return daerah;
    return daerah.filter((item) =>
      String(item.titik_lokasi || '').toLowerCase() === daerahFilter
    );
  }, [daerah, daerahFilter]);

  const updateRow = (key, field, nextValue) => {
    onChange(value.map((row) =>
      row.key === key ? { ...row, [field]: nextValue } : row
    ));
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'end',
        gap: '16px',
        marginBottom: '14px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h3 id="tujuan-schedule-title" style={{
            color: 'var(--se-dark-blue)',
            fontSize: '16px',
            margin: 0,
          }}>
            Jadwal Tujuan
          </h3>
          <small style={{ color: '#6c757d' }}>
            Urutkan tujuan sesuai perjalanan dan pastikan tidak ada tanggal kosong.
          </small>
        </div>
        <label style={{ minWidth: '190px', margin: 0 }}>
          <span className="se-form-label">Filter wilayah</span>
          <select
            className="se-form-control"
            value={daerahFilter}
            onChange={(event) => setDaerahFilter(event.target.value)}
          >
            <option value="all">Semua Wilayah</option>
            <option value="kabupaten">Kabupaten/Kota</option>
            <option value="kecamatan">Kecamatan</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {value.map((row, index) => {
          const rowErrors = errors[row.key] || {};
          const availableDaerah = filteredDaerah.some(
            (item) => String(item.id) === String(row.daerah_id)
          )
            ? filteredDaerah
            : [
                ...filteredDaerah,
                ...daerah.filter(
                  (item) => String(item.id) === String(row.daerah_id)
                ),
              ];

          return (
            <article
              key={row.key}
              data-testid={`tujuan-row-${index + 1}`}
              style={{
                border: rowErrors.schedule || rowErrors.tanggal
                  ? '1px solid #dc3545'
                  : '1px solid var(--se-border)',
                borderRadius: '10px',
                padding: '16px',
                background: '#f8fbff',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}>
                <h4 style={{ margin: 0, color: 'var(--se-dark-blue)', fontSize: '15px' }}>
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
                <div className="se-col-12">
                  <div className="se-form-group">
                    <label className="se-form-label" htmlFor={`daerah-${row.key}`}>
                      Wilayah tujuan
                    </label>
                    <select
                      id={`daerah-${row.key}`}
                      className="se-form-control"
                      value={row.daerah_id}
                      onChange={(event) => updateRow(
                        row.key,
                        'daerah_id',
                        event.target.value
                      )}
                      required
                    >
                      <option value="">-- Pilih Wilayah --</option>
                      {availableDaerah.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nama_daerah}
                        </option>
                      ))}
                    </select>
                    {rowErrors.daerah_id && (
                      <div className="se-alert se-alert-error" role="alert">
                        {rowErrors.daerah_id}
                      </div>
                    )}
                  </div>
                </div>

                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label className="se-form-label" htmlFor={`mulai-${row.key}`}>
                      Tanggal mulai
                    </label>
                    <input
                      id={`mulai-${row.key}`}
                      type="date"
                      className="se-form-control"
                      value={row.tanggal_mulai}
                      onChange={(event) => updateRow(
                        row.key,
                        'tanggal_mulai',
                        event.target.value
                      )}
                      required
                    />
                  </div>
                </div>

                <div className="se-col-md-6">
                  <div className="se-form-group">
                    <label className="se-form-label" htmlFor={`selesai-${row.key}`}>
                      Tanggal selesai
                    </label>
                    <input
                      id={`selesai-${row.key}`}
                      type="date"
                      className="se-form-control"
                      value={row.tanggal_selesai}
                      onChange={(event) => updateRow(
                        row.key,
                        'tanggal_selesai',
                        event.target.value
                      )}
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
