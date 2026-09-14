import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('bootstrap scripts', () => {
  it('memuat jQuery sebelum satu-satunya script AdminLTE', () => {
    const html = readFileSync('index.html', 'utf8');
    const jqueryIndex = html.indexOf('jquery');
    const adminLteMatches = [...html.matchAll(/admin-lte[^"']*\.js/gi)];

    expect(jqueryIndex).toBeGreaterThan(-1);
    expect(adminLteMatches).toHaveLength(1);
    expect(jqueryIndex).toBeLessThan(adminLteMatches[0].index);
  });
});
