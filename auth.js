// One-time Google OAuth authorization (run interactively):  node auth.js
// Opens a browser for consent, captures the code on a loopback server, and
// saves the refresh token to credentials/token.json. After this, the daily
// scripts run unattended (the token refreshes automatically).
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const PORT = 5858;
const CRED = path.join(__dirname, 'credentials', 'oauth_client.json');
const TOKEN = path.join(__dirname, 'credentials', 'token.json');

function makeClient() {
  const { installed } = JSON.parse(fs.readFileSync(CRED, 'utf8'));
  return new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    `http://localhost:${PORT}`
  );
}

async function main() {
  const oAuth2Client = makeClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token
    scope: SCOPES,
  });

  console.log('\nAuthorize this app by visiting this URL:\n');
  console.log(authUrl + '\n');
  exec(`start "" "${authUrl}"`, { shell: 'cmd.exe' }, () => {});

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const c = url.searchParams.get('code');
        if (!c) return;
        res.end('Authorization complete. You can close this tab and return to the terminal.');
        server.close();
        resolve(c);
      } catch (e) {
        reject(e);
      }
    });
    server.listen(PORT, () => console.log(`Waiting for Google redirect on http://localhost:${PORT} ...`));
    setTimeout(() => { server.close(); reject(new Error('Timed out waiting for authorization')); }, 600000);
  });

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN, JSON.stringify(tokens, null, 2));
  console.log(`\nToken saved to ${TOKEN}`);
  console.log('Authorization successful. You can now run the scrapers.');
}

main().catch((e) => {
  console.error('Auth failed:', e.message);
  process.exit(1);
});
