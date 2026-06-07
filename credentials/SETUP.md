# Connect your Google account (one time, free, ~2 minutes)

This project writes to **your own** Google Sheets, so it needs permission to your
Google account. You provide a small "OAuth client" (it identifies the app to
Google). It stays on your machine and is never shared.

1. Go to <https://console.cloud.google.com/> and sign in.
2. Create a project (top bar → **New Project**) — any name, e.g. `pricing-tracker`.
3. Enable the API: **APIs & Services → Library** → search **Google Sheets API** →
   **Enable**.
4. **APIs & Services → OAuth consent screen**:
   - User type **External** → Create; fill the app name + your email; Save and
     continue through the steps.
   - Add your own Google email under **Test users** (keeping it in "Testing" is
     fine for personal use).
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   Application type **Desktop app** → Create.
6. Click **Download JSON** and save it in this folder as:

   ```
   credentials/oauth_client.json
   ```

   (Copy `oauth_client.example.json` to see the expected shape.)

Then run the installer again (`INSTALL.cmd` on Windows, `./install.sh` on
macOS/Linux). It opens your browser once to authorize — if you see "Google hasn't
verified this app", click **Advanced → Continue** (it's your own app).

Notes
- `oauth_client.json` and `token.json` live only on your machine; both are
  git-ignored and never pushed.
- In "Testing" mode Google may expire the login periodically; if a daily run ever
  fails with an auth error, just run the installer again to re-authorize.
