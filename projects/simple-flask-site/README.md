# Simple Flask Site

A modern, responsive Flask demo with session authentication and a personalized
server-rendered greeting. The project demonstrates a complete browser → Flask
route → validation → Jinja response flow.

## Features

- Responsive login and home pages for desktop and mobile screens
- Session-based username/password authentication
- Server-side name validation and personalized greeting rendering
- Safe Jinja escaping for user input
- POST-based logout
- Custom 404 and 500 error pages
- Basic security response headers
- Automated integration tests using Python's built-in `unittest`
- Vercel production deployment

## Project structure

```text
simple-flask-site/
├── app.py                 # Flask routes, authentication, validation, errors
├── requirements.txt       # Runtime dependencies
├── .python-version        # Production Python version
├── templates/
│   ├── index.html         # Authenticated responsive home page
│   ├── login.html         # Responsive login page
│   └── error.html         # Shared 404/500 error page
├── tests/
│   └── test_app.py        # Authentication, form, errors, and security tests
└── DEPLOYMENT.md          # Complete Vercel deployment procedure
```

## Requirements

- Python 3.12 or newer
- Flask 3.x

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

## Configuration

Configure these variables before using the project outside local demos:

| Variable | Purpose | Local fallback |
| --- | --- | --- |
| `FLASK_USERNAME` | Login username | `admin` |
| `FLASK_PASSWORD` | Login password | `test123` |
| `FLASK_SECRET_KEY` | Signs the Flask session cookie | Development-only value |

Do not use the fallback values for a public deployment.

## Run locally

```powershell
python app.py
```

Open <http://localhost:5000>.

## Run tests

From this project directory:

```powershell
python -m unittest discover -s tests -v
```

The suite covers authentication, protected routes, greeting validation, HTML
escaping, logout, custom errors, and security headers.

## Public deployment

Production URL: <https://simple-flask-site.vercel.app>

The application runs on Vercel's free Hobby plan as a Flask Python Function.
See [DEPLOYMENT.md](DEPLOYMENT.md) for environment setup, deployment,
verification, updates, and rollback.
