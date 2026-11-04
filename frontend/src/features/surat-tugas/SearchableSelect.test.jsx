import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableSelect from './SearchableSelect';

const sampleOptions = [
  { value: '1', label: 'Kabupaten Donggala', badge: 'Radius', badgeType: 'radius' },
  { value: '2', label: 'Kabupaten/Kota Donggala', badge: 'Poligon', badgeType: 'polygon' },
  { value: '3', label: 'Kabupaten Poso', badge: 'Radius', badgeType: 'radius' },
  { value: '4', label: 'Kota Palu', badge: 'Poligon', badgeType: 'polygon' },
];

function ControlledSelect({ options = sampleOptions, defaultValue = '', onChange, ...rest }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <SearchableSelect
      id="test-select"
      name="test-select"
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        if (onChange) onChange(e);
      }}
      options={options}
      placeholder="-- Pilih Wilayah --"
      searchPlaceholder="Cari wilayah..."
      {...rest}
    />
  );
}

describe('SearchableSelect Component', () => {
  it('merender placeholder saat nilai belum dipilih', () => {
    render(<ControlledSelect />);
    const trigger = screen.getByTestId('catur-select-trigger');
    expect(within(trigger).getByText('-- Pilih Wilayah --')).toBeInTheDocument();
  });

  it('membuka popover dropdown saat trigger diklik', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    const trigger = screen.getByTestId('catur-select-trigger');
    await user.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cari wilayah...')).toBeInTheDocument();
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Kabupaten Donggala')).toBeInTheDocument();
    expect(within(listbox).getByText('Kabupaten/Kota Donggala')).toBeInTheDocument();
  });

  it('menampilkan layout daftar isi dengan badge di sisi kanan', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByTestId('catur-select-trigger'));
    const listbox = screen.getByRole('listbox');

    const badges = within(listbox).getAllByText(/Radius|Poligon/);
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });

  it('memfilter pilihan saat pengguna mengetik di input pencarian', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByTestId('catur-select-trigger'));
    const searchInput = screen.getByPlaceholderText('Cari wilayah...');

    await user.type(searchInput, 'Palu');
    const listbox = screen.getByRole('listbox');

    expect(within(listbox).getByText('Kota Palu')).toBeInTheDocument();
    expect(within(listbox).queryByText('Kabupaten Donggala')).not.toBeInTheDocument();
    expect(within(listbox).queryByText('Kabupaten Poso')).not.toBeInTheDocument();
  });

  it('menampilkan pesan kosong saat hasil pencarian tidak ditemukan', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByTestId('catur-select-trigger'));
    const searchInput = screen.getByPlaceholderText('Cari wilayah...');

    await user.type(searchInput, 'WilayahTidakAda999');

    expect(screen.getByText(/Tidak ada data yang cocok/i)).toBeInTheDocument();
  });

  it('memilih item saat diklik dan menutup dropdown', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ControlledSelect onChange={handleChange} />);

    await user.click(screen.getByTestId('catur-select-trigger'));
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByText('Kabupaten/Kota Donggala'));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { name: 'test-select', value: '2' },
      })
    );
    // Dropdown menutup setelah dipilih
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // Label terpilih tampil di trigger
    const trigger = screen.getByTestId('catur-select-trigger');
    expect(within(trigger).getByText('Kabupaten/Kota Donggala')).toBeInTheDocument();
  });

  it('dapat menghapus pilihan menggunakan tombol clear', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ControlledSelect defaultValue="2" onChange={handleChange} />);

    const trigger = screen.getByTestId('catur-select-trigger');
    expect(within(trigger).getByText('Kabupaten/Kota Donggala')).toBeInTheDocument();

    const clearBtn = screen.getByTitle('Hapus pilihan');
    await user.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { name: 'test-select', value: '' },
      })
    );
    expect(within(trigger).getByText('-- Pilih Wilayah --')).toBeInTheDocument();
  });

  it('menutup dropdown saat menekan tombol Escape', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByTestId('catur-select-trigger'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
