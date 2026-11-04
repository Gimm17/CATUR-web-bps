import { useState, useRef, useEffect, useMemo } from 'react';
import './SearchableSelect.css';

/**
 * SearchableSelect Component
 * Custom dropdown dengan fitur pencarian dan layout ala Daftar Isi (Table of Contents)
 * di mana teks utama di kiri dan badge/tipe di paling kanan dengan dotted leader.
 */
export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Cari...',
  required = false,
  disabled = false,
  showSearch = true,
  showDottedLeader = true,
  showTriggerBadge = false,
  className = '',
  hasError = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const nativeSelectRef = useRef(null);
  const optionsListRef = useRef(null);

  // Normalize options to uniform structure
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: String(opt.value),
          label: opt.label || '',
          badge: opt.badge || null,
          badgeType: opt.badgeType || (opt.badge === 'Poligon' ? 'polygon' : opt.badge === 'Radius' ? 'radius' : 'neutral'),
          secondaryText: opt.secondaryText || null,
          searchTerms: opt.searchTerms || '',
          rawOptionLabel: opt.rawOptionLabel || null,
        };
      }
      return {
        value: String(opt),
        label: String(opt),
        badge: null,
        badgeType: 'neutral',
        secondaryText: null,
        searchTerms: '',
        rawOptionLabel: null,
      };
    });
  }, [options]);

  // Current selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return normalizedOptions.find((opt) => opt.value === String(value)) || null;
  }, [value, normalizedOptions]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
      const matchSub = opt.secondaryText ? opt.secondaryText.toLowerCase().includes(term) : false;
      const matchSearchTerms = opt.searchTerms ? opt.searchTerms.toLowerCase().includes(term) : false;
      return matchLabel || matchBadge || matchSub || matchSearchTerms;
    });
  }, [normalizedOptions, searchTerm]);

  // Reset search and highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle select option
  const handleSelect = (val) => {
    if (disabled) return;
    setIsOpen(false);
    setSearchTerm('');

    if (onChange) {
      onChange({
        target: {
          name: name || id,
          value: val,
        },
      });
    }

    if (nativeSelectRef.current) {
      nativeSelectRef.current.value = val;
      const event = new Event('change', { bubbles: true });
      nativeSelectRef.current.dispatchEvent(event);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`catur-select-container ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        data-testid="catur-select-trigger"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`catur-select-trigger ${isOpen ? 'is-open' : ''} ${hasError ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        <div className="catur-select-value-wrapper">
          {selectedOption ? (
            <>
              <span className="catur-select-value-text">
                {selectedOption.label}
              </span>
              {showTriggerBadge && selectedOption.badge && (
                <span className={`catur-select-badge catur-select-badge-${selectedOption.badgeType}`}>
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="catur-select-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="catur-select-icons">
          {selectedOption && !disabled && (
            <button
              type="button"
              className="catur-select-clear-btn"
              title="Hapus pilihan"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
          <i className={`bi bi-chevron-down catur-select-chevron ${isOpen ? 'is-open' : ''}`} />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="catur-select-dropdown" role="listbox">
          {/* Search Header */}
          {showSearch && (
            <div className="catur-select-search-header">
              <div className="catur-select-search-box">
                <i className="bi bi-search catur-select-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="catur-select-search-input"
                  placeholder={searchPlaceholder}
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
                    className="catur-select-search-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                  >
                    <i className="bi bi-x-circle-fill" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div ref={optionsListRef} className="catur-select-options-list">
            {filteredOptions.length === 0 ? (
              <div className="catur-select-empty">
                <i className="bi bi-search" />
                Tidak ada data yang cocok dengan <strong>"{searchTerm}"</strong>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption?.value === opt.value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`catur-select-option ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      backgroundColor: isSelected
                        ? '#f0f7ff'
                        : isHighlighted
                          ? '#f8fafc'
                          : 'transparent',
                    }}
                  >
                    {/* Main Label on Left */}
                    <div className="catur-select-option-main">
                      {isSelected && (
                        <i className="bi bi-check2 catur-select-check-icon" />
                      )}
                      <span className="catur-select-option-label">
                        {opt.label}
                      </span>
                      {opt.secondaryText && (
                        <span className="catur-select-option-sub">
                          ({opt.secondaryText})
                        </span>
                      )}
                    </div>

                    {/* Dotted Leader like Daftar Isi */}
                    {showDottedLeader && (
                      <div className="catur-select-dot-leader" />
                    )}

                    {/* Far Right Badge (Paling Kanan Jauh) */}
                    {opt.badge && (
                      <span className={`catur-select-badge catur-select-badge-${opt.badgeType}`}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Native Select for Accessibility, Vitest & Form Submissions */}
      <select
        ref={nativeSelectRef}
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="catur-native-hidden-select"
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.rawOptionLabel || (opt.badge ? `${opt.label} — [${opt.badge}]` : opt.label)}
          </option>
        ))}
      </select>
    </div>
  );
}
