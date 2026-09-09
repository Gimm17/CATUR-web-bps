const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://catur.bpssulteng.id/api").replace(/\/+$/, "");
const LEGACY_FILE_BASE_URL = (import.meta.env.VITE_LEGACY_FILE_BASE_URL || API_BASE_URL.replace(/\/api$/, "")).replace(/\/+$/, "");

const GOOGLE_DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{20,}$/;

const trimSlashes = (value = "") => value.replace(/^\/+|\/+$/g, "");

const isHttpUrl = (value = "") => /^https?:\/\//i.test(value);
const GOOGLE_HOST_REGEX = /(^|\.)googleapis\.com$|(^|\.)googleusercontent\.com$|(^|\.)google\.com$/i;

const toBackendProxyUrl = (targetUrl = "") => {
  if (!targetUrl) return "";
  return `${API_BASE_URL}/files/proxy?url=${encodeURIComponent(targetUrl)}`;
};

const isGoogleUrl = (value = "") => {
  if (!isHttpUrl(value)) return false;
  try {
    const parsed = new URL(value);
    return GOOGLE_HOST_REGEX.test(parsed.hostname);
  } catch {
    return false;
  }
};

const extractDriveFileId = (value = "") => {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim();
  if (GOOGLE_DRIVE_ID_REGEX.test(normalized)) {
    return normalized;
  }

  const filePathMatch = normalized.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch?.[1]) return filePathMatch[1];

  const idQueryMatch = normalized.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch?.[1]) return idQueryMatch[1];

  return null;
};

const extractDriveResourceKey = (value = "") => {
  if (!value || typeof value !== "string") return "";

  const normalized = value.trim();
  const match = normalized.match(/[?&]resourcekey=([^&#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
};

const buildDriveUcUrl = (id, resourceKey = "", exportType = "view") => {
  if (!id) return "";
  const base = `https://drive.google.com/uc?id=${id}&export=${exportType}`;
  return resourceKey ? `${base}&resourcekey=${encodeURIComponent(resourceKey)}` : base;
};

export const toGoogleDriveViewUrl = (value) => {
  const id = extractDriveFileId(value);
  if (!id) return value;
  const resourceKey = extractDriveResourceKey(value);
  return resourceKey
    ? `https://drive.google.com/file/d/${id}/view?resourcekey=${encodeURIComponent(resourceKey)}`
    : `https://drive.google.com/file/d/${id}/view`;
};

export const toGoogleDriveDirectUrl = (value) => {
  const id = extractDriveFileId(value);
  if (!id) return value;
  const resourceKey = extractDriveResourceKey(value);
  return buildDriveUcUrl(id, resourceKey, "view");
};

export const toPublicFileUrl = (value, options = {}) => {
  const { legacyDir = "", forceDriveView = false, forceProxy = true } = options;
  if (!value || typeof value !== "string") return "";

  const rawValue = value.trim();
  if (!rawValue) return "";

  if (rawValue.includes("drive.google.com")) {
    const driveUrl = forceDriveView ? toGoogleDriveViewUrl(rawValue) : toGoogleDriveDirectUrl(rawValue);
    return forceProxy ? toBackendProxyUrl(driveUrl) : driveUrl;
  }

  if (isGoogleUrl(rawValue)) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("docs.google.com")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("googleusercontent.com")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("googleapis.com")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("drive.usercontent.google.com")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("lh3.googleusercontent.com")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("google.com/uc?")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("google.com/open?")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (rawValue.includes("google.com/file/d/")) {
    const driveUrl = forceDriveView ? toGoogleDriveViewUrl(rawValue) : toGoogleDriveDirectUrl(rawValue);
    return forceProxy ? toBackendProxyUrl(driveUrl) : driveUrl;
  }

  if (rawValue.includes("resourcekey=") && rawValue.includes("google")) {
    return forceProxy ? toBackendProxyUrl(rawValue) : rawValue;
  }

  if (GOOGLE_DRIVE_ID_REGEX.test(rawValue)) {
    const driveUrl = forceDriveView ? toGoogleDriveViewUrl(rawValue) : toGoogleDriveDirectUrl(rawValue);
    return forceProxy ? toBackendProxyUrl(driveUrl) : driveUrl;
  }

  if (isHttpUrl(rawValue)) {
    // URL non-Google dibiarkan langsung supaya tidak menjadikan backend open proxy.
    return rawValue;
  }

  const normalizedPath = trimSlashes(rawValue);
  if (normalizedPath.startsWith("uploads/") || normalizedPath.startsWith("storage/")) {
    return `${LEGACY_FILE_BASE_URL}/${normalizedPath}`;
  }

  if (legacyDir) {
    return `${LEGACY_FILE_BASE_URL}/${trimSlashes(legacyDir)}/${normalizedPath}`;
  }

  return `${LEGACY_FILE_BASE_URL}/${normalizedPath}`;
};

export const toProxyFileUrl = (value, options = {}) => {
  const publicUrl = toPublicFileUrl(value, options);
  if (!publicUrl) return "";
  if (publicUrl.includes("/api/files/proxy?url=")) return publicUrl;
  if (isGoogleUrl(publicUrl)) return toBackendProxyUrl(publicUrl);
  return publicUrl;
};
