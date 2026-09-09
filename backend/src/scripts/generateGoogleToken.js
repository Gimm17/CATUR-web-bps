const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getOAuthConfig(credentials) {
  return credentials.installed || credentials.web || null;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const credentialPath = path.resolve(process.cwd(), 'credential.json');
  if (!fs.existsSync(credentialPath)) {
    throw new Error('credential.json tidak ditemukan di root project');
  }

  const credentials = readJson(credentialPath);
  const oauthConfig = getOAuthConfig(credentials);

  if (!oauthConfig) {
    throw new Error('Format credential.json tidak valid (butuh key "web" atau "installed")');
  }

  const redirectUri = oauthConfig.redirect_uris?.[0];
  if (!redirectUri) {
    throw new Error('redirect_uris pada credential.json tidak ditemukan');
  }

  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.client_id,
    oauthConfig.client_secret,
    redirectUri
  );

  const scopes = ['https://www.googleapis.com/auth/drive.file'];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  console.log('\n1) Buka URL ini di browser:\n');
  console.log(authUrl);
  console.log('\n2) Login, approve, lalu copy `code` dari callback URL.');
  console.log('3) Paste kodenya di prompt bawah.\n');

  const code = await ask('Masukkan authorization code: ');
  if (!code) {
    throw new Error('Authorization code kosong');
  }

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Refresh token tidak didapat. Ulangi proses dan pastikan prompt=consent dipakai.'
    );
  }

  const tokenPath = path.resolve(process.cwd(), 'token.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

  console.log(`\nBerhasil. Token disimpan ke: ${tokenPath}`);
  console.log('Tambahkan token.json ke .gitignore agar tidak ikut ke repo.');
}

main().catch((err) => {
  console.error('\nGagal generate token:', err.message);
  process.exit(1);
});
