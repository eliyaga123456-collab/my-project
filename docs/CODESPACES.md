# Run EAR in GitHub Codespaces (no local setup, public link)

Codespaces runs the whole stack (Postgres, API, web, admin) in the cloud and gives you a URL you can open in any browser,
including your phone. It needs only your GitHub account.

## Start it (about 3 to 5 minutes the first time)
1. Open https://github.com/eliyaga123456-collab/my-project in a browser.
2. Switch the branch to `claude/elegant-volta-5foywr`.
3. Tap **Code** → **Codespaces** → **Create codespace on claude/elegant-volta-5foywr**.
4. Wait for the setup to finish. The terminal prints the three links at the end:
   - `EAR web` (port 3000)
   - `EAR admin` (port 3100)
   - `EAR install page` (`/install` on the web link)
5. Open the web link. The **Ports** tab lists every forwarded port. The web port is set to *Public* automatically, so the link works
   on any phone. If it shows *Private*, right-click it → **Port Visibility** → **Public**.

## Install it on your phone
Open `<web link>/install` on the phone, then follow the steps (iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install app).
The app works as long as the codespace is running.

## Logins
- Admin dashboard (port 3100): `admin@ear.local` with the password in `.data/admin-password.txt` (also printed during setup).
- Verification and reset emails are not sent anywhere in this mode. Open `<web link>/api/v1/dev/outbox?to=<email>` to read them.

## Good to know
- Keep the admin port (3100) private. Only the web port needs to be public.
- A codespace stops after a period of inactivity and uses your free monthly Codespaces quota. Check the current free allowance on GitHub's
  billing page, it changes over time and was not verified here.
- This is a development setup (dev servers, demo data). For a permanent public site use `docs/DEPLOYMENT.md`.
- Logs: `.data/api.log`, `.data/web.log`, `.data/admin.log`. Restart everything with `bash .devcontainer/start.sh`.
