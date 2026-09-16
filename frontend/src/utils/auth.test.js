import { beforeEach, describe, expect, it } from 'vitest';
import { getUser } from './auth';

describe('getUser', () => {
  beforeEach(() => localStorage.clear());

  it('menghapus field autentikasi sensitif dari data lama di localStorage', () => {
    localStorage.setItem('user', JSON.stringify({
      id: 87,
      nama: 'Pegawai Test',
      role: 'pegawai',
      password: '$2b$10$hash-lama',
      reset_token: 'token-lama',
    }));

    expect(getUser()).toEqual({
      id: 87,
      nama: 'Pegawai Test',
      role: 'pegawai',
    });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      id: 87,
      nama: 'Pegawai Test',
      role: 'pegawai',
    });
  });
});
