const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');

// Pastikan env ter-load meski file ini dipakai bukan lewat server.js
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_DRIVE_FOLDER_ID = '1YITWca2X8drkHqCbj5eFUo3K1noEi_cH';
const folderIdCache = new Map();

let driveClientPromise = null;

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveOAuthClientConfig(credentials) {
  return credentials.installed || credentials.web || null;
}

function getRefreshTokenFromEnv() {
  const rawToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const trimmed = rawToken.trim();
  return trimmed || null;
}

function resolveFolderId(inputFolderId) {
  if (!inputFolderId || typeof inputFolderId !== 'string') {
    return '';
  }

  return inputFolderId.trim();
}

function sanitizeFolderSegment(segment = '') {
  return segment
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '');
}

function splitFolderPath(folderPath = '') {
  if (!folderPath || typeof folderPath !== 'string') return [];
  return folderPath
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => sanitizeFolderSegment(part))
    .filter(Boolean);
}

function escapeDriveQueryString(value = '') {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function ensureFolderAccessible(drive, folderId) {
  if (!folderId) {
    return;
  }

  await drive.files.get({
    fileId: folderId,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  });
}

async function findFolderInParent(drive, parentId, folderName) {
  const escapedName = escapeDriveQueryString(folderName);
  const escapedParent = escapeDriveQueryString(parentId);
  const q = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${escapedParent}' in parents and trashed = false`;

  const res = await drive.files.list({
    q,
    pageSize: 1,
    fields: 'files(id,name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return res.data.files?.[0]?.id || null;
}

async function createFolderInParent(drive, parentId, folderName) {
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id,name',
  });

  return res.data.id;
}

async function resolveTargetFolderId(drive, rootFolderId, folderPath = '') {
  const segments = splitFolderPath(folderPath);
  if (!segments.length) {
    return rootFolderId;
  }

  let currentParentId = rootFolderId;
  let pathAccumulator = '';

  for (const segment of segments) {
    pathAccumulator = pathAccumulator ? `${pathAccumulator}/${segment}` : segment;
    const cacheKey = `${rootFolderId}:${pathAccumulator}`;

    if (folderIdCache.has(cacheKey)) {
      currentParentId = folderIdCache.get(cacheKey);
      continue;
    }

    let nextFolderId = await findFolderInParent(drive, currentParentId, segment);
    if (!nextFolderId) {
      nextFolderId = await createFolderInParent(drive, currentParentId, segment);
    }

    folderIdCache.set(cacheKey, nextFolderId);
    currentParentId = nextFolderId;
  }

  return currentParentId;
}

async function getDriveClient() {
  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      const credentialPath = path.resolve(process.cwd(), 'credential.json');
      if (!fs.existsSync(credentialPath)) {
        throw new Error('credential.json tidak ditemukan di root project');
      }

      const credentials = readJsonFile(credentialPath);
      const oauthConfig = resolveOAuthClientConfig(credentials);

      if (!oauthConfig) {
        throw new Error('Format credential.json tidak valid (butuh key "web" atau "installed")');
      }

      const oauth2Client = new google.auth.OAuth2(
        oauthConfig.client_id,
        oauthConfig.client_secret,
        oauthConfig.redirect_uris?.[0]
      );

      const tokenPath = path.resolve(process.cwd(), 'token.json');
      let token = null;

      if (fs.existsSync(tokenPath)) {
        token = readJsonFile(tokenPath);
      } else {
        const refreshToken = getRefreshTokenFromEnv();
        if (refreshToken) {
          token = { refresh_token: refreshToken };
        }
      }

      if (!token) {
        throw new Error(
          `Token Google OAuth tidak ditemukan. ` +
          `File token dicek di: ${tokenPath}. ` +
          `GOOGLE_REFRESH_TOKEN terbaca: ${Boolean(getRefreshTokenFromEnv())}.`
        );
      }

      oauth2Client.setCredentials(token);

      return google.drive({
        version: 'v3',
        auth: oauth2Client,
      });
    })();
  }

  return driveClientPromise;
}

function buildPublicFileLinks(fileId, resourceKey = '') {
  const encodedResourceKey = resourceKey ? encodeURIComponent(resourceKey) : '';
  const resourceQuery = encodedResourceKey ? `&resourcekey=${encodedResourceKey}` : '';

  return {
    webViewLink: `https://drive.google.com/file/d/${fileId}/view${encodedResourceKey ? `?resourcekey=${encodedResourceKey}` : ''}`,
    directLink: `https://drive.google.com/uc?id=${fileId}&export=view${resourceQuery}`,
    downloadLink: `https://drive.google.com/uc?id=${fileId}&export=download${resourceQuery}`,
  };
}

async function uploadFileToDrive({
  filePath,
  fileName,
  mimeType,
  folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID,
  subfolderPath = '',
}) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File tidak ditemukan: ${filePath}`);
  }

  const drive = await getDriveClient();
  const safeFileName = fileName || path.basename(filePath);
  const finalFolderId = resolveFolderId(folderId);

  await ensureFolderAccessible(drive, finalFolderId);
  const targetFolderId = await resolveTargetFolderId(drive, finalFolderId, subfolderPath);

  const createResponse = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: safeFileName,
      ...(targetFolderId ? { parents: [targetFolderId] } : {}),
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: fs.createReadStream(filePath),
    },
    fields: 'id,name,webViewLink,webContentLink,resourceKey',
  });

  const uploaded = createResponse.data;

  try {
    await drive.permissions.create({
      fileId: uploaded.id,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permissionError) {
    throw new Error(`Gagal set permission public file Drive: ${permissionError.message}`);
  }

  const fallbackLinks = buildPublicFileLinks(uploaded.id, uploaded.resourceKey || '');

  return {
    id: uploaded.id,
    name: uploaded.name,
    webViewLink: uploaded.webViewLink || fallbackLinks.webViewLink,
    webContentLink: fallbackLinks.directLink,
    downloadLink: uploaded.webContentLink || fallbackLinks.downloadLink,
    resourceKey: uploaded.resourceKey || null,
    folderId: targetFolderId || null,
    rootFolderId: finalFolderId || null,
    subfolderPath: splitFolderPath(subfolderPath).join('/'),
  };
}

module.exports = {
  uploadFileToDrive,
  getAuthorizedDriveClient: getDriveClient,
};
