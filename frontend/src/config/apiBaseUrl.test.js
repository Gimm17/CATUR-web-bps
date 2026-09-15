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
});
