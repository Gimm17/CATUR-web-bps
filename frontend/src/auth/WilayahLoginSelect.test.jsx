import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WilayahLoginSelect from "./WilayahLoginSelect";

describe("WilayahLoginSelect Component", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("merender trigger dropdown dengan placeholder default", () => {
    render(<WilayahLoginSelect value="" onChange={vi.fn()} isMobile={false} />);

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Wilayah: Otomatis Sesuai Akun");
  });

  it("menampilkan nama satker terpilih pada trigger", () => {
    render(
      <WilayahLoginSelect
        value="BPS Kabupaten Banggai"
        onChange={vi.fn()}
        isMobile={false}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    expect(trigger).toHaveTextContent("BPS Kabupaten Banggai");
  });

  it("membuka popover desktop dan menampilkan opsi saat trigger diklik", async () => {
    render(<WilayahLoginSelect value="" onChange={vi.fn()} isMobile={false} />);

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    await userEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/cari satker/i);
    expect(searchInput).toBeInTheDocument();

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("BPS Provinsi Sulawesi Tengah")).toBeInTheDocument();
    expect(within(listbox).getByText("BPS Kabupaten Banggai")).toBeInTheDocument();
  });

  it("memfilter daftar satker saat pengguna mengetik kata kunci", async () => {
    render(<WilayahLoginSelect value="" onChange={vi.fn()} isMobile={false} />);

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    await userEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/cari satker/i);
    await userEvent.type(searchInput, "Donggala");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("BPS Kabupaten Donggala")).toBeInTheDocument();
    expect(within(listbox).queryByText("BPS Kabupaten Banggai")).not.toBeInTheDocument();
  });

  it("memanggil onChange dan menutup popover saat opsi diklik", async () => {
    const handleChange = vi.fn();
    render(<WilayahLoginSelect value="" onChange={handleChange} isMobile={false} />);

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    await userEvent.click(trigger);

    const listbox = screen.getByRole("listbox");
    const optDonggala = within(listbox).getByText("BPS Kabupaten Donggala");
    await userEvent.click(optDonggala);

    expect(handleChange).toHaveBeenCalledWith("BPS Kabupaten Donggala");
    expect(screen.queryByPlaceholderText(/cari satker/i)).not.toBeInTheDocument();
  });

  it("merender bottom-sheet drawer pada mode mobile", async () => {
    render(<WilayahLoginSelect value="" onChange={vi.fn()} isMobile={true} />);

    const trigger = screen.getByRole("combobox", { name: /pilih wilayah satker/i });
    await userEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Pilih Wilayah Satker")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cari kabupaten \/ kota \/ satker/i)).toBeInTheDocument();
  });

  it("menghapus pilihan saat tombol clear diklik", async () => {
    const handleChange = vi.fn();
    render(
      <WilayahLoginSelect
        value="BPS Kabupaten Banggai"
        onChange={handleChange}
        isMobile={false}
      />
    );

    const clearBtn = screen.getByTitle("Reset ke otomatis sesuai akun");
    await userEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("menyediakan hidden select loginWilayah untuk kompabilitas form", () => {
    const { container } = render(
      <WilayahLoginSelect
        value="BPS Kabupaten Poso"
        onChange={vi.fn()}
        isMobile={false}
      />
    );

    const hiddenSelect = container.querySelector('select[name="loginWilayah"]');
    expect(hiddenSelect).toBeInTheDocument();
    expect(hiddenSelect.value).toBe("BPS Kabupaten Poso");
  });
});
