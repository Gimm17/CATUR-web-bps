function parseFotoMeta(fotoValue) {
  const defaultMeta = {
    photos: [],
    force_foto_by_admin: false,
    force_foto_reason: null,
    force_foto_at: null,
    force_foto_admin_id: null,
    force_foto_admin_nama: null,
  };

  if (!fotoValue) return defaultMeta;

  if (Array.isArray(fotoValue)) {
    return {
      ...defaultMeta,
      photos: fotoValue.filter(Boolean).map(String),
    };
  }

  if (typeof fotoValue === 'object') {
    const photos = Array.isArray(fotoValue.photos)
      ? fotoValue.photos.filter(Boolean).map(String)
      : [];
    return {
      photos,
      force_foto_by_admin: Boolean(fotoValue.force_foto_by_admin),
      force_foto_reason: fotoValue.force_foto_reason || null,
      force_foto_at: fotoValue.force_foto_at || null,
      force_foto_admin_id: fotoValue.force_foto_admin_id || null,
      force_foto_admin_nama: fotoValue.force_foto_admin_nama || null,
    };
  }

  if (typeof fotoValue === 'string') {
    const trimmed = fotoValue.trim();
    if (!trimmed) return defaultMeta;

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          ...defaultMeta,
          photos: Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [],
        };
      } catch (err) {
        // fallback ke string tunggal
      }
    }

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          const photos = Array.isArray(parsed.photos)
            ? parsed.photos.filter(Boolean).map(String)
            : [];
          return {
            photos,
            force_foto_by_admin: Boolean(parsed.force_foto_by_admin),
            force_foto_reason: parsed.force_foto_reason || null,
            force_foto_at: parsed.force_foto_at || null,
            force_foto_admin_id: parsed.force_foto_admin_id || null,
            force_foto_admin_nama: parsed.force_foto_admin_nama || null,
          };
        }
      } catch (err) {
        // fallback ke string tunggal
      }
    }

    return {
      ...defaultMeta,
      photos: [trimmed],
    };
  }

  return defaultMeta;
}

function parseFotoList(fotoValue) {
  return parseFotoMeta(fotoValue).photos;
}

function isPresensiFotoLengkap(fotoValue) {
  const meta = parseFotoMeta(fotoValue);
  return meta.photos.length >= 2 || (meta.force_foto_by_admin && meta.photos.length >= 1);
}

function serializeFotoMeta(meta = {}) {
  const photos = Array.isArray(meta.photos)
    ? meta.photos.filter(Boolean).map(String)
    : [];

  if (!meta.force_foto_by_admin) {
    return photos.length ? JSON.stringify(photos) : null;
  }

  return JSON.stringify({
    photos,
    force_foto_by_admin: true,
    force_foto_reason: meta.force_foto_reason || 'Force unlock 1 foto oleh Admin',
    force_foto_at: meta.force_foto_at || new Date().toISOString(),
    force_foto_admin_id: meta.force_foto_admin_id || null,
    force_foto_admin_nama: meta.force_foto_admin_nama || 'Admin',
  });
}

module.exports = {
  parseFotoMeta,
  parseFotoList,
  isPresensiFotoLengkap,
  serializeFotoMeta,
};
