import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

vi.mock('../../layouts/PegawaiLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('./RichTextRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));

vi.mock('./RichTextEditor', () => ({
  default: ({ value, onChange, placeholder, readOnly }) => (
    <textarea
      aria-label={placeholder}
      value={value}
      disabled={readOnly}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('../../utils/alerts', () => ({
  confirmAction: vi.fn().mockResolvedValue(false),
  showToast: vi.fn(),
}));

vi.mock('../../services/laporan.service', () => ({
  getLaporanPerjalanan: vi.fn(),
  kirimLaporanAkhir: vi.fn(),
  uploadTTD: vi.fn(),
  getTTD: vi.fn(),
  uploadBuktiPembayaran: vi.fn(),
  getBuktiPembayaran: vi.fn(),
  resetBuktiPembayaran: vi.fn(),
}));

vi.mock('../../services/presensiService', () => ({
  submitLaporan: vi.fn(),
}));

import {
  getBuktiPembayaran,
  getLaporanPerjalanan,
  getTTD,
  kirimLaporanAkhir,
  resetBuktiPembayaran,
  uploadBuktiPembayaran,
  uploadTTD,
} from '../../services/laporan.service';
import { submitLaporan } from '../../services/presensiService';
import LaporanPegawai from './LaporanPegawai';

const reportFixture = {
  surat_tugas: {
    id: 11,
    nomor_surat: 'SURAT A',
    daerah_tujuan: 'Kabupaten A',
    tanggal_mulai: '2026-09-14',
    tanggal_selesai: '2026-09-14',
  },
  presensi: [{
    id: 91,
    tanggal_presensi: '2026-09-14',
    lokasi: 'Kabupaten A',
    laporan: '<p>Laporan awal</p>',
    foto_list: ['foto-1.jpg', 'foto-2.jpg'],
  }],
  laporan_akhir: {
    id: 71,
    status: 'draft',
    ttd_pegawai: 'ttd.png',
  },
  bukti_pembayaran: [{ filename: 'nota-lama.pdf' }],
  user: { nama: 'Pegawai Test' },
  pembayaran: null,
  report_window: { editable: true },
};

function RouteSwitcher() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/laporan/22')}>Ganti surat</button>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/laporan/11']}>
      <RouteSwitcher />
      <Routes>
        <Route path="/laporan/:suratId" element={<LaporanPegawai />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LaporanPegawai route context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLaporanPerjalanan.mockResolvedValue(reportFixture);
    getTTD.mockResolvedValue(null);
    getBuktiPembayaran.mockResolvedValue(reportFixture.bukti_pembayaran);
    kirimLaporanAkhir.mockResolvedValue({});
    uploadTTD.mockResolvedValue({});
    uploadBuktiPembayaran.mockResolvedValue({});
    resetBuktiPembayaran.mockResolvedValue({});
    submitLaporan.mockResolvedValue({});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('memuat ulang context ketika suratId pada URL berubah', async () => {
    renderPage();

    await waitFor(() => expect(getLaporanPerjalanan).toHaveBeenCalledWith('11'));
    fireEvent.click(screen.getByRole('button', { name: 'Ganti surat' }));

    await waitFor(() => {
      expect(getLaporanPerjalanan).toHaveBeenNthCalledWith(2, '22');
    });
  });

  it('meneruskan ID surat atau presensi yang sama ke seluruh aksi', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(getLaporanPerjalanan).toHaveBeenCalledWith('11'));
    await screen.findByRole('button', { name: /^edit$/i });

    fireEvent.click(screen.getAllByRole('button', { name: /ganti ttd/i })[0]);
    const ttdInput = container.querySelector('#ttdUpload');
    fireEvent.change(ttdInput, {
      target: { files: [new File(['ttd'], 'ttd.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^upload tanda tangan$/i }));
    await waitFor(() => expect(uploadTTD).toHaveBeenCalledWith('11', expect.any(FormData)));

    const notaInput = container.querySelector('#notaUpload');
    fireEvent.change(notaInput, {
      target: { files: [new File(['nota'], 'nota.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /upload bukti$/i }));
    await waitFor(() => {
      expect(uploadBuktiPembayaran).toHaveBeenCalledWith('11', expect.any(FormData));
      expect(getBuktiPembayaran).toHaveBeenCalledWith('11');
    });

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() => expect(resetBuktiPembayaran).toHaveBeenCalledWith('11'));

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }));
    await waitFor(() => {
      expect(submitLaporan).toHaveBeenCalledWith(91, '<p>Laporan awal</p>');
    });

    const conclusion = screen.getByLabelText(/Tuliskan secara detail/i);
    fireEvent.change(conclusion, { target: { value: 'A'.repeat(120) } });
    fireEvent.click(screen.getByRole('button', { name: /^kirim laporan akhir$/i }));
    await waitFor(() => {
      expect(kirimLaporanAkhir).toHaveBeenCalledWith('11', { kesimpulan: 'A'.repeat(120) });
    });
  });

  it('menampilkan pesan aman ketika surat tidak ditemukan atau bukan milik pegawai', async () => {
    getLaporanPerjalanan.mockRejectedValueOnce({ response: { status: 404 } });

    renderPage();

    expect(await screen.findByText('Surat tugas tidak ditemukan atau bukan milik Anda')).toBeVisible();
  });

  it('menampilkan alasan report window ketika laporan terkunci', async () => {
    getLaporanPerjalanan.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          code: 'REPORT_DEADLINE_PASSED',
          message: 'Laporan ditutup',
          report_window: { reason: 'Batas edit tujuh hari WITA telah lewat' },
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Batas edit tujuh hari WITA telah lewat')).toBeVisible();
  });

  it('menampilkan detail deadline dan menonaktifkan seluruh aksi edit saat terkunci', async () => {
    getLaporanPerjalanan.mockResolvedValueOnce({
      ...reportFixture,
      report_window: {
        timezone: 'Asia/Makassar',
        trip_end_date: '2026-09-14',
        deadline_date: '2026-09-21',
        editable: false,
        remaining_days: 0,
        lock_reason: 'finance_processing',
      },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Laporan sedang diproses' })).toBeVisible();
    expect(screen.getByText('Selesai perjalanan: 2026-09-14')).toBeVisible();
    expect(screen.getByText('Deadline: 2026-09-21')).toBeVisible();
    expect(screen.getByText(/Asia\/Makassar/)).toBeVisible();
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /ganti ttd/i })[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: /upload bukti$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^kirim laporan akhir$/i })).toBeDisabled();
  });

  it('menggunakan seluruh tujuan untuk durasi dan menampilkan tujuan aktif', async () => {
    getLaporanPerjalanan.mockResolvedValueOnce({
      ...reportFixture,
      tujuan: [
        { id: 101, urutan: 1, daerah_tujuan: 'Buol', tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
        { id: 102, urutan: 2, daerah_tujuan: 'Tolitoli', tanggal_mulai: '2026-09-17', tanggal_selesai: '2026-09-19' },
      ],
      tujuan_aktif: { id: 102 },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Rangkaian Tujuan' })).toBeVisible();
    expect(screen.getByText('1. Buol')).toBeVisible();
    expect(screen.getByText('2. Tolitoli')).toBeVisible();
    expect(screen.getByText('Aktif hari ini')).toBeVisible();
    expect(screen.getByText('6 Hari')).toBeVisible();
  });
});
