import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from './apiBaseUrl';

describe('resolveApiBaseUrl', () => {
  it('menggunakan API same-origin ketika environment tidak diisi', () => {
    expect(resolveApiBaseUrl()).toBe('/api');
    expect(resolveApiBaseUrl('')).toBe('/api');
  });

  it('merapikan slash di akhir URL environment', () => {
    expect(resolveApiBaseUrl('https://contoh.test/api///')).toBe('https://contoh.test/api');
  });

  it('mengabaikan localhost URL pada environment produksi', () => {
    const originalProd = import.meta.env.PROD;
    try {
      import.meta.env.PROD = true;
      expect(resolveApiBaseUrl('http://127.0.0.1:3000/api')).toBe('/api');
      expect(resolveApiBaseUrl('http://localhost:3000/api')).toBe('/api');
    } finally {
      import.meta.env.PROD = originalProd;
    }
  });
});
