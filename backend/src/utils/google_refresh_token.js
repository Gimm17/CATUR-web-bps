const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'CLIENT_ID_KAMU',
  'CLIENT_SECRET_KAMU',
  'http://localhost'
);

const scopes = ['https://www.googleapis.com/auth/drive'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('Buka link ini di browser:\n', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Masukkan kode dari browser: ', (code) => {
  oauth2Client.getToken(code).then(({ tokens }) => {
    console.log('REFRESH TOKEN:\n', tokens.refresh_token);
    rl.close();
  });
});