import { describe, expect, it } from 'vitest';
import { productionBuildConfig } from './productionBuild';

describe('production build', () => {
  it('menghapus console dan debugger dari bundle production', () => {
    expect(productionBuildConfig.esbuild?.drop)
      .toEqual(expect.arrayContaining(['console', 'debugger']));
  });
});
