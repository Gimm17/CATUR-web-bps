import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TujuanScheduleEditor from './TujuanScheduleEditor';
import {
  createEmptyTujuan,
  getTujuanScheduleErrors,
  serializeTujuan,
  getDaerahType,
  formatDaerahOptionLabel,
} from './tujuanSchedule';

const daerah = [
  { id: 1, nama_daerah: 'Poso', titik_lokasi: 'kabupaten' },
  { id: 2, nama_daerah: 'Morowali', titik_lokasi: 'kabupaten', geojson: { type: 'FeatureCollection', features: [{ type: 'Feature' }] } },
  { id: 3, nama_daerah: 'Bungku Tengah', titik_lokasi: 'kecamatan' },
];

function Harness({ initialValue = [createEmptyTujuan('row-1')] }) {
  const [value, setValue] = useState(initialValue);
  return (
    <TujuanScheduleEditor
      value={value}
      daerah={daerah}
      onChange={setValue}
      errors={getTujuanScheduleErrors(value)}
    />
  );
}

describe('TujuanScheduleEditor', () => {
  it('dimulai dengan satu tujuan yang tidak dapat dihapus', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Tujuan 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus tujuan 1' })).not.toBeInTheDocument();
  });

  it('menampilkan label Poligon dan Radius pada opsi dropdown tanpa emoji', () => {
    render(<Harness />);

    const select = screen.getByLabelText(/Wilayah tujuan/);
    const options = within(select).getAllByRole('option');

    // Opsi pertama adalah placeholder
    expect(options[0]).toHaveTextContent('-- Pilih Wilayah --');
    // Poso tanpa geojson -> Radius
    expect(options[1]).toHaveTextContent('Poso — [Radius]');
    // Morowali dengan geojson -> Poligon
    expect(options[2]).toHaveTextContent('Morowali — [Poligon]');
    // Bungku Tengah tanpa geojson -> Radius
    expect(options[3]).toHaveTextContent('Bungku Tengah — [Radius]');

    // Tidak memuat emoji apapun
    options.forEach((opt) => {
      expect(opt.textContent).not.toMatch(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
    });
  });

  it('menampilkan badge indikator tipe wilayah saat wilayah dipilih', async () => {
    const user = userEvent.setup();
    render(<Harness initialValue={[{
      key: 'row-1',
      daerah_id: '2',
      tanggal_mulai: '2026-09-07',
      tanggal_selesai: '2026-09-08',
    }]} />);

    expect(screen.getByText('Poligon')).toBeInTheDocument();

    const select = screen.getByLabelText(/Wilayah tujuan/);
    await user.selectOptions(select, '1');

    expect(screen.getByText('Radius')).toBeInTheDocument();
  });

  it('menambah tujuan dengan tanggal mulai sehari setelah tujuan sebelumnya', async () => {
    const user = userEvent.setup();
    render(<Harness initialValue={[{
      key: 'row-1',
      daerah_id: '1',
      tanggal_mulai: '2026-09-07',
      tanggal_selesai: '2026-09-08',
    }]} />);

    await user.click(screen.getByRole('button', { name: 'Tambah Tujuan' }));

    const secondCard = screen.getByTestId('tujuan-row-2');
    expect(within(secondCard).getByLabelText('Tanggal mulai')).toHaveValue('2026-09-09');
    expect(within(secondCard).getByLabelText('Tanggal selesai')).toHaveValue('2026-09-09');
  });

  it('menghapus hanya tujuan yang dipilih', async () => {
    const user = userEvent.setup();
    render(<Harness initialValue={[
      { key: 'row-a', daerah_id: '1', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-07' },
      { key: 'row-b', daerah_id: '2', tanggal_mulai: '2026-09-08', tanggal_selesai: '2026-09-08' },
      { key: 'row-c', daerah_id: '3', tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-09' },
    ]} />);

    await user.click(screen.getByRole('button', { name: 'Hapus tujuan 2' }));

    expect(screen.getAllByRole('heading', { name: /Tujuan \d/ })).toHaveLength(2);
    expect(screen.getAllByLabelText(/Wilayah tujuan/).map((select) => select.value))
      .toEqual(['1', '3']);
  });

  it('menampilkan error overlap dan gap pada baris terkait', () => {
    const { unmount } = render(<Harness initialValue={[
      { key: 'row-a', daerah_id: '1', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-09' },
      { key: 'row-b', daerah_id: '2', tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10' },
    ]} />);
    expect(screen.getByText('Tanggal tujuan bertumpang tindih.')).toBeInTheDocument();

    unmount();
    render(<Harness initialValue={[
      { key: 'row-c', daerah_id: '1', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
      { key: 'row-d', daerah_id: '2', tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-11' },
    ]} />);
    expect(screen.getByText('Tidak boleh ada tanggal kosong antar tujuan.')).toBeInTheDocument();
  });

  it('mempertahankan urutan visual ketika payload diserialisasi', () => {
    const rows = [
      { key: 'second-visually', daerah_id: '2', tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10' },
      { key: 'first-visually', daerah_id: '1', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
    ];

    expect(JSON.parse(serializeTujuan(rows))).toEqual([
      { daerah_id: '2', tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10' },
      { daerah_id: '1', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
    ]);
  });
});

describe('getDaerahType & formatDaerahOptionLabel', () => {
  it('mengidentifikasi poligon dari geojson object dan string', () => {
    expect(getDaerahType({ geojson: { type: 'FeatureCollection', features: [{}] } })).toBe('Poligon');
    expect(getDaerahType({ geojson: '{"type":"Polygon"}' })).toBe('Poligon');
    expect(getDaerahType({ geojson: null })).toBe('Radius');
    expect(getDaerahType({ geojson: '' })).toBe('Radius');
    expect(getDaerahType({})).toBe('Radius');
    expect(getDaerahType(null)).toBe('Radius');
  });

  it('memformat label opsi secara rapi tanpa emoji', () => {
    expect(formatDaerahOptionLabel({
      nama_daerah: 'Kabupaten Donggala',
      geojson: null,
    })).toBe('Kabupaten Donggala — [Radius]');

    expect(formatDaerahOptionLabel({
      nama_daerah: 'Kabupaten/Kota Donggala',
      geojson: { type: 'Polygon' },
    })).toBe('Kabupaten/Kota Donggala — [Poligon]');
  });
});
