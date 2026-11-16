function parseFotoMeta(fotoValue) {
  const defaultMeta = {
    photos: [],
    force_foto_by_admin: false,
    force_foto_reason: null,
    force_foto_at: null,
    force_foto_admin_id: null,
    force_foto_admin_nama: null,
    ignored_by_admin: false,
    ignored_reason: null,
    ignored_at: null,
    ignored_admin_id: null,
    ignored_admin_nama: null,
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
      ...defaultMeta,
      photos,
      force_foto_by_admin: Boolean(fotoValue.force_foto_by_admin),
      force_foto_reason: fotoValue.force_foto_reason || null,
      force_foto_at: fotoValue.force_foto_at || null,
      force_foto_admin_id: fotoValue.force_foto_admin_id || null,
      force_foto_admin_nama: fotoValue.force_foto_admin_nama || null,
      ignored_by_admin: Boolean(fotoValue.ignored_by_admin),
      ignored_reason: fotoValue.ignored_reason || null,
      ignored_at: fotoValue.ignored_at || null,
      ignored_admin_id: fotoValue.ignored_admin_id || null,
      ignored_admin_nama: fotoValue.ignored_admin_nama || null,
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
            ...defaultMeta,
            photos,
            force_foto_by_admin: Boolean(parsed.force_foto_by_admin),
            force_foto_reason: parsed.force_foto_reason || null,
            force_foto_at: parsed.force_foto_at || null,
            force_foto_admin_id: parsed.force_foto_admin_id || null,
            force_foto_admin_nama: parsed.force_foto_admin_nama || null,
            ignored_by_admin: Boolean(parsed.ignored_by_admin),
            ignored_reason: parsed.ignored_reason || null,
            ignored_at: parsed.ignored_at || null,
            ignored_admin_id: parsed.ignored_admin_id || null,
            ignored_admin_nama: parsed.ignored_admin_nama || null,
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

  if (!meta.force_foto_by_admin && !meta.ignored_by_admin) {
    return photos.length ? JSON.stringify(photos) : null;
  }

  const out = { photos };
  if (meta.force_foto_by_admin) {
    out.force_foto_by_admin = true;
    out.force_foto_reason = meta.force_foto_reason || 'Force unlock 1 foto oleh Admin';
    out.force_foto_at = meta.force_foto_at || new Date().toISOString();
    out.force_foto_admin_id = meta.force_foto_admin_id || null;
    out.force_foto_admin_nama = meta.force_foto_admin_nama || 'Admin';
  }
  if (meta.ignored_by_admin) {
    out.ignored_by_admin = true;
    out.ignored_reason = meta.ignored_reason || 'Completed / Diabaikan karena kasus lama';
    out.ignored_at = meta.ignored_at || new Date().toISOString();
    out.ignored_admin_id = meta.ignored_admin_id || null;
    out.ignored_admin_nama = meta.ignored_admin_nama || 'Admin';
  }

  return JSON.stringify(out);
}

module.exports = {
  parseFotoMeta,
  parseFotoList,
  isPresensiFotoLengkap,
  serializeFotoMeta,
};
