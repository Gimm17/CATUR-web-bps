const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'www.googleapis.com',
  'lh3.googleusercontent.com',
  'drive.usercontent.google.com',
]);

function isAllowedHost(hostname = '') {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return hostname.endsWith('.googleusercontent.com');
}

function requestWithRedirect(url, redirects = 0) {
  const MAX_REDIRECTS = 5;
  if (redirects > MAX_REDIRECTS) {
    throw new Error('Terlalu banyak redirect saat mengambil file');
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'backend-file-proxy',
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          const nextUrl = new URL(location, url).toString();
          response.resume();
          resolve(requestWithRedirect(nextUrl, redirects + 1));
          return;
        }

        resolve(response);
      }
    );

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Timeout saat mengambil file dari sumber'));
    });
  });
}

router.get('/proxy', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({
        success: false,
        message: 'Query "url" wajib diisi',
      });
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'URL tidak valid',
      });
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        message: 'Protocol URL tidak didukung',
      });
    }

    if (!isAllowedHost(parsed.hostname)) {
      return res.status(403).json({
        success: false,
        message: 'Host URL tidak diizinkan',
      });
    }

    const upstreamResponse = await requestWithRedirect(parsed.toString());
    const statusCode = upstreamResponse.statusCode || 502;

    if (statusCode >= 400) {
      upstreamResponse.resume();
      return res.status(statusCode).json({
        success: false,
        message: 'Gagal mengambil file dari sumber',
      });
    }

    const contentType = upstreamResponse.headers['content-type'] || 'application/octet-stream';
    const contentLength = upstreamResponse.headers['content-length'];
    const disposition = upstreamResponse.headers['content-disposition'] || 'inline';

    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Cache-Control', 'public, max-age=300');

    upstreamResponse.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Terjadi error pada proxy file',
      error: error.message,
    });
  }
});

module.exports = router;
