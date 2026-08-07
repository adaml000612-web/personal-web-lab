# Vercel deployment guide

This Flask application is deployed on Vercel as a Python Function.

- Production URL: <https://simple-flask-site.vercel.app>
- Vercel project: `simple-flask-site`
- Runtime: Python 3.12
- Plan: Hobby (free; personal and non-commercial use only)

## 1. Prerequisites

Install Python, Node.js, Git, and GitHub CLI. Confirm that the Flask project
works locally before deploying:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open <http://localhost:5000> and verify the login and greeting form.

## 2. Install or run Vercel CLI

Install the CLI globally:

```powershell
npm.cmd install -g vercel
```

If global installation is unavailable, run it through npm without installing:

```powershell
npx.cmd --yes vercel@latest --version
```

On Windows, use `npm.cmd` and `npx.cmd` when PowerShell script execution policy
blocks `npm.ps1`.

## 3. Sign in

```powershell
npx.cmd --yes vercel@latest login
```

Complete the browser/device authorization, then verify the login:

```powershell
npx.cmd --yes vercel@latest whoami
```

If npm reports `EBUSY`, use a separate cache directory:

```powershell
npx.cmd --yes --cache .\.npm-cache-vercel vercel@latest login
```

## 4. Link the project

Run the following command from this directory:

```powershell
npx.cmd --yes vercel@latest link --yes --project simple-flask-site
```

Vercel creates `.vercel/` with project identifiers. The directory is local
configuration and must not be committed.

## 5. Configure production secrets

Add all three variables to the `production` environment:

```powershell
npx.cmd --yes vercel@latest env add FLASK_USERNAME production
npx.cmd --yes vercel@latest env add FLASK_PASSWORD production
npx.cmd --yes vercel@latest env add FLASK_SECRET_KEY production
```

Choose `yes` when asked to store passwords and the secret key as sensitive.
Use a unique strong password and a random secret of at least 32 characters.
Never commit these values or paste them into deployment scripts.

Confirm the variables exist without reading their sensitive values:

```powershell
npx.cmd --yes vercel@latest env ls
```

## 6. Deploy to production

```powershell
npx.cmd --yes vercel@latest deploy --prod --yes
```

Vercel detects `app.py`, installs `requirements.txt`, and packages the Flask
application as a Python Function. The `.python-version` file pins Python 3.12.

## 7. Verify the deployment

Inspect the production deployment:

```powershell
npx.cmd --yes vercel@latest inspect https://simple-flask-site.vercel.app
```

Expected results:

- Deployment status is `Ready`.
- `https://simple-flask-site.vercel.app/login` returns HTTP 200.
- Visiting `/` while logged out redirects to `/login`.
- Valid production credentials open the authenticated home page.
- Submitting a name renders the personalized greeting.
- Invalid credentials remain on the login page with an error message.

Review runtime errors after deployment:

```powershell
npx.cmd --yes vercel@latest logs https://simple-flask-site.vercel.app
```

## 8. Update the deployment

After changing and testing the source code, redeploy from this directory:

```powershell
npx.cmd --yes vercel@latest deploy --prod --yes
```

The production alias remains <https://simple-flask-site.vercel.app>.

## 9. Roll back

List previous deployments, then roll production back if necessary:

```powershell
npx.cmd --yes vercel@latest ls simple-flask-site
npx.cmd --yes vercel@latest rollback
```

## Security notes

- The fallback credentials in `app.py` are for local demonstration only.
- Production must always define `FLASK_USERNAME`, `FLASK_PASSWORD`, and
  `FLASK_SECRET_KEY` in Vercel.
- Sensitive values should not appear in Git, screenshots, shell history, or
  deployment documentation.
- Rotate the password and session key in Vercel if either value is exposed.

## Free-plan notes

Vercel's Hobby plan is intended for personal, non-commercial projects. Flask
runs as an on-demand Function, so the platform manages HTTPS, scaling, and the
public domain. Plan limits and availability may change; review Vercel's current
pricing and terms before using the site commercially.
