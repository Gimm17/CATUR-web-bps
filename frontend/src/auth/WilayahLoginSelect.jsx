import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { SATKER_UNIT_KERJA_OPTIONS } from "../features/surat-tugas/wilayahHierarki";
import "./WilayahLoginSelect.css";

export default function WilayahLoginSelect({
  value = "",
  onChange,
  options = SATKER_UNIT_KERJA_OPTIONS,
  placeholder = "Wilayah: Otomatis Sesuai Akun",
  isMobile: isMobileProp,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [desktopCoords, setDesktopCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });

  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const effectiveIsMobile =
    isMobileProp !== undefined ? isMobileProp : isMobileScreen;

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);
  const sheetSearchInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => opt.value === value) || null;
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return options;

    return options.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(query);
      const matchBadge = opt.badge?.toLowerCase().includes(query);
      const matchKab = opt.kabupaten_nama?.toLowerCase().includes(query);
      const matchVal = opt.value?.toLowerCase().includes(query);
      return matchLabel || matchBadge || matchKab || matchVal;
    });
  }, [options, searchTerm]);

  const isDefaultVisible = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return "wilayah: otomatis sesuai akun".includes(q);
  }, [searchTerm]);

  const updateDesktopPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    setDesktopCoords({
      left: Math.max(8, rect.left),
      width: rect.width,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (isOpen && !effectiveIsMobile) {
      updateDesktopPosition();
      const handleScrollOrResize = () => updateDesktopPosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, effectiveIsMobile, updateDesktopPosition]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        if (effectiveIsMobile && sheetSearchInputRef.current) {
          sheetSearchInputRef.current.focus();
        } else if (!effectiveIsMobile && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, effectiveIsMobile]);

  useEffect(() => {
    if (!isOpen || effectiveIsMobile) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, effectiveIsMobile]);

  const handleSelectOption = (optValue) => {
    if (disabled) return;
    if (onChange) {
      onChange(optValue);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalCount = (isDefaultVisible ? 1 : 0) + filteredOptions.length;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isDefaultVisible && highlightedIndex === 0) {
        handleSelectOption("");
      } else {
        const itemIdx = isDefaultVisible
          ? highlightedIndex - 1
          : highlightedIndex;
        if (filteredOptions[itemIdx]) {
          handleSelectOption(filteredOptions[itemIdx].value);
        }
      }
    }
  };

  return (
    <div className="wilayah-select-wrapper" onKeyDown={handleKeyDown}>
      <select
        name="loginWilayah"
        aria-label="Wilayah Satker Kabupaten/Kota"
        tabIndex={-1}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
          margin: 0,
          padding: 0,
          border: 0,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Pilih Wilayah Satker"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`wilayah-select-trigger ${
          effectiveIsMobile ? "is-mobile" : "is-desktop"
        } ${isOpen ? "is-open" : ""}`}
      >
        <span
          className={`wilayah-select-text ${
            selectedOption ? "is-selected" : "is-placeholder"
          }`}
          title={selectedOption ? selectedOption.label : placeholder}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="wilayah-select-actions">
          {value && !disabled && (
            <button
              type="button"
              className="wilayah-select-clear"
              aria-label="Reset ke otomatis sesuai akun"
              title="Reset ke otomatis sesuai akun"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOption("");
              }}
            >
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          )}
          <i
            className={`bi bi-chevron-down wilayah-select-chevron ${
              isOpen ? "is-open" : ""
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      {isOpen &&
        !effectiveIsMobile &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={popoverRef}
            className="wilayah-popover-card"
            style={{
              left: `${desktopCoords.left}px`,
              width: `${desktopCoords.width}px`,
              ...(desktopCoords.openUpward
                ? { bottom: `${desktopCoords.bottom}px`, top: "auto" }
                : { top: `${desktopCoords.top}px`, bottom: "auto" }),
            }}
          >
            <div className="wilayah-popover-search-wrap">
              <div className="wilayah-popover-search">
                <i
                  className="bi bi-search wilayah-search-icon"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="wilayah-search-input"
                  placeholder="Cari satker..."
                  aria-label="Cari satker"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="wilayah-search-clear-btn"
                    aria-label="Bersihkan pencarian"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm("");
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                  >
                    <i className="bi bi-x" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="wilayah-popover-list" role="listbox">
              {isDefaultVisible && (
                <div
                  role="option"
                  aria-selected={!value}
                  className={`wilayah-popover-item ${
                    !value ? "is-selected" : ""
                  } ${highlightedIndex === 0 ? "is-highlighted" : ""}`}
                  onClick={() => handleSelectOption("")}
                  onMouseEnter={() => setHighlightedIndex(0)}
                >
                  <span className="wilayah-item-label">{placeholder}</span>
                  {!value && (
                    <i
                      className="bi bi-check2 wilayah-check-icon"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const actualIndex = isDefaultVisible ? idx + 1 : idx;
                  const isSelected = value === opt.value;
                  const isHighlighted = actualIndex === highlightedIndex;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`wilayah-popover-item ${
                        isSelected ? "is-selected" : ""
                      } ${isHighlighted ? "is-highlighted" : ""}`}
                      onClick={() => handleSelectOption(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(actualIndex)}
                    >
                      <span className="wilayah-item-label">{opt.label}</span>
                      {isSelected && (
                        <i
                          className="bi bi-check2 wilayah-check-icon"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })
              ) : !isDefaultVisible ? (
                <div className="wilayah-popover-empty">
                  Satker "{searchTerm}" tidak ditemukan.
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )}

      {isOpen &&
        effectiveIsMobile &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <>
            <div
              className="wilayah-sheet-backdrop"
              onClick={() => setIsOpen(false)}
            />

            <div
              className="wilayah-sheet-card"
              role="dialog"
              aria-modal="true"
              aria-label="Pilih Wilayah Satker"
            >
              <div className="wilayah-sheet-drag-handle" />

              <div className="wilayah-sheet-header">
                <h3 className="wilayah-sheet-title">Pilih Wilayah Satker</h3>
                <button
                  type="button"
                  className="wilayah-sheet-close-btn"
                  aria-label="Tutup pilihan wilayah"
                  onClick={() => setIsOpen(false)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>

              <div className="wilayah-sheet-search-wrap">
                <div className="wilayah-sheet-search-box">
                  <i
                    className="bi bi-search wilayah-sheet-search-icon"
                    aria-hidden="true"
                  />
                  <input
                    ref={sheetSearchInputRef}
                    type="text"
                    className="wilayah-sheet-search-input"
                    placeholder="Cari kabupaten / kota / satker..."
                    aria-label="Cari kabupaten, kota, atau satker"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="wilayah-sheet-search-clear"
                      aria-label="Bersihkan pencarian"
                      onClick={() => {
                        setSearchTerm("");
                        if (sheetSearchInputRef.current)
                          sheetSearchInputRef.current.focus();
                      }}
                    >
                      <i className="bi bi-x" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="wilayah-sheet-list" role="listbox">
                {isDefaultVisible && (
                  <div
                    role="option"
                    aria-selected={!value}
                    className={`wilayah-sheet-item ${
                      !value ? "is-selected" : ""
                    }`}
                    onClick={() => handleSelectOption("")}
                  >
                    <span className="wilayah-sheet-item-label">
                      {placeholder}
                    </span>
                    {!value && (
                      <i
                        className="bi bi-check2 wilayah-sheet-check"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )}

                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        className={`wilayah-sheet-item ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => handleSelectOption(opt.value)}
                      >
                        <span className="wilayah-sheet-item-label">
                          {opt.label}
                        </span>
                        {isSelected && (
                          <i
                            className="bi bi-check2 wilayah-sheet-check"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })
                ) : !isDefaultVisible ? (
                  <div className="wilayah-sheet-empty">
                    Satker "{searchTerm}" tidak ditemukan.
                  </div>
                ) : null}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
