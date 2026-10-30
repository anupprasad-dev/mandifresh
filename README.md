# MandiFresh: Online Grocery Store

A full-stack grocery e-commerce platform with three separate portals: a customer storefront, a seller portal and an administrator portal. Django's built-in admin is **not** used.

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Django 5 + Django REST Framework + **PyJWT** (own JWT implementation, see section 2)
- **Database:** PostgreSQL (Neon) in production, SQLite for quick local development
- **Deploy:** Neon (database) · Render (API) · Vercel (frontend)

> Brand name: **MandiFresh** ("mandi" = market). To rename it, search the project for `MandiFresh` (about 10 places).

---

## 1. Features

### Customer storefront
- Home page with an auto-playing hero slider (swipe, arrows, dots, pause on hover), category grid, featured products, deals, new arrivals, and trust badges
- Product catalogue with search, category filter, deals/in-stock filters, sorting and pagination
- Product detail page, cart (saved in the browser), free-delivery progress bar (free above ₹499, otherwise ₹40)
- Checkout with address validation (6-digit PIN, phone) and cash on delivery
- Order history, per-item status tracking, and cancellation while an order is still pending
- Account page (profile, change password) and "forgot password" by email
- **One** "Login" button in the header. No cluttered login/register options.

### Seller portal (hidden)
- Not linked anywhere on the storefront. Sellers open **`/seller/login`** directly by URL.
- Seller registration at `/seller/register` (linked only from the seller login page)
- **New sellers need admin approval.** Their products stay hidden from shoppers until an admin approves the store.
- Dashboard (revenue, orders, low-stock alerts, order pipeline)
- Product management: add, edit, hide/show, delete, stock and pricing, MRP and discount badge, **photo upload** (resized in the browser, stored in the database)
- Order management: sellers only see their own items and move them through `pending → confirmed → packed → shipped → delivered` (or cancel, which returns stock)

### Admin portal (hidden, custom-built)
- Open **`/admin/login`** directly by URL. It is not linked anywhere. There is no admin sign-up: administrators are created only from the server with `python manage.py create_admin`.
- **Overview:** revenue, orders, customers, sellers, 7-day sales chart, order pipeline, recent orders, "sellers awaiting approval" alert
- **Sellers:** approve / suspend stores, disable / enable accounts
- **Customers:** search, disable / enable accounts (disabling signs the user out everywhere immediately)
- **Products:** search all products, hide, feature on the home page, delete
- **Categories:** add, rename, re-order, delete (blocked while products exist)
- **Orders:** search and filter every order with per-item status

### Authentication & security
| Area | Implementation |
|---|---|
| Passwords | Django's hashing (PBKDF2) plus the 4 built-in validators (length, common, numeric, similarity) |
| Tokens | **Own JWT system on PyJWT** (HS256): 15-minute **access token** kept in browser memory + 7-day **refresh token** in an httpOnly, Secure, SameSite cookie, so JavaScript can't read it. Details in section 2. |
| Token rotation | Refresh tokens are stored server-side and rotate on every use. Re-using an old token revokes the whole login. Logout, password change/reset and account disabling revoke sessions. |
| Roles | `customer`, `seller`, `admin`. Enforced on the server for every endpoint (permission classes), and re-checked from the database on every request, so a disabled or demoted account loses access immediately. |
| Separate portals | Customer, seller and admin accounts log in through different endpoints. Using the wrong portal returns the same generic error, so accounts can't be enumerated. |
| Brute force | Rate limiting on all auth endpoints (30/min per IP) and global API throttles |
| Password reset | Signed, single-use, 1-hour tokens. The response is identical whether or not the email exists. Admin accounts can't be reset by email. |
| Orders | Prices and stock are always taken from the database, never from the browser. Stock rows are locked inside a transaction so two buyers can't oversell the last item. |
| Uploads | Images are identified by their real file signature (JPEG/PNG/WebP), limited to 2 MB, and served with `nosniff` |
| Transport | HTTPS redirect, HSTS, secure cookies, CORS allow-list, and an Origin check on cookie-based endpoints (production) |

---

## 2. Where JWT is used (and how)

JWT = JSON Web Token (RFC 7519). We use the **PyJWT** library for signing/verifying (HS256) and implement the token lifecycle ourselves. Nothing from `simplejwt` is used.

| What | File | Purpose |
|---|---|---|
| Token encode / decode | `backend/accounts/jwt_core.py` | Creates and verifies signed JWTs. Pins the algorithm (blocks `alg: none`), requires `exp, iat, iss, aud, sub, jti, type`, checks issuer + audience, 10 s clock-skew leeway. No Django imports, so it is unit-testable on its own. |
| Token lifecycle | `backend/accounts/tokens.py` | Issues the 15-min **access token** (claims: `sub`, `role`, `type=access`). Issues, **rotates** and revokes **refresh tokens**; detects reuse of a stolen token. |
| Refresh-token store | `backend/accounts/models.py` → `RefreshSession` | One DB row per refresh token (`jti`, `family`, expiry, revoked time, IP, user-agent). This is what makes logout and revocation possible with JWTs. |
| Request authentication | `backend/accounts/authentication.py` → `JWTAuthentication` | Reads `Authorization: Bearer <access JWT>` on every API call, verifies it, loads the user, and rejects disabled users or changed roles. Registered in `config/settings.py` (`REST_FRAMEWORK`). |
| Role checks | `accounts/permissions.py`, `adminpanel/permissions.py` | `IsCustomer`, `IsSeller`, `IsAdminRole` gate every endpoint by the verified role. |
| Login / register / refresh / logout | `backend/accounts/views.py` | Returns the access token in the JSON body; sets the refresh token **only** as an httpOnly cookie (`mf_refresh`, path `/api/`). |
| Settings | `backend/config/settings.py` → `JWT` | Secret, algorithm, issuer, audience, lifetimes. `JWT_SECRET_KEY` env var (>= 32 chars in production). |
| Browser side | `frontend/src/api.js`, `context/AuthContext.jsx` | Keeps the access token in memory (never `localStorage`), attaches it to requests, and silently calls `/api/auth/refresh/` on a 401 or page reload. |
| Cleanup | `python manage.py purge_expired_tokens` | Deletes expired refresh sessions (run daily). |

**Flow:** login → server returns `access` (JSON) + sets `mf_refresh` cookie → browser sends `Bearer access` → after 15 min the API answers 401 → the browser calls `/api/auth/refresh/` → server verifies the refresh JWT, checks its DB row, **revokes it and issues a new pair** → request is retried. If an already-used refresh token is presented again, every token of that login is revoked.

### Libraries and where each is used
| Library | Used for |
|---|---|
| Django 5 | Models, ORM, migrations, password hashing, management commands |
| Django REST Framework | All JSON APIs, serializers, throttling, permissions |
| **PyJWT** | Signing and verifying JWTs (`accounts/jwt_core.py`) |
| django-cors-headers | CORS allow-list for the frontend origin |
| dj-database-url + psycopg 3 | Reads `DATABASE_URL` and connects to PostgreSQL (Neon) |
| WhiteNoise | Serves collected static files in production |
| Gunicorn | Production WSGI server on Render |
| python-dotenv | Loads `backend/.env` in local development |
| React 18 + Vite | Frontend UI and build tooling |
| React Router 6 | Client-side routing, including the hidden `/seller/*` and `/admin/*` areas |
| Axios | API client with automatic token refresh (`frontend/src/api.js`) |

---

## 3. Project structure

```
mandifresh/
├── backend/                 Django project
│   ├── config/              settings, urls, wsgi
│   ├── accounts/            custom User (email login, roles), SellerProfile, RefreshSession, JWT, auth API
│   ├── catalog/             categories, products, public + seller product API, image upload, seed command
│   ├── orders/              orders, order items, customer + seller order API
│   ├── adminpanel/          custom admin API (stats, users, sellers, products, categories, orders)
│   ├── build.sh             Render build script
│   ├── requirements.txt
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── src/pages/           storefront pages
│   ├── src/pages/seller/    seller portal pages
│   ├── src/pages/admin/     admin portal pages
│   ├── src/components/      header, footer, hero slider, product card, guards, auth layout…
│   ├── src/context/         auth, cart, toast state
│   └── vercel.json          API proxy + SPA routing
├── render.yaml              optional Render blueprint
└── README.md
```

---

## 4. Run locally

Requirements: Python 3.11+, Node 18+.

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # keep DJANGO_DEBUG=True for local work
# DATABASE_URL empty => uses local SQLite. Paste your Neon URL to use PostgreSQL.

python manage.py makemigrations accounts catalog orders   # first time only; commit the generated files
python manage.py migrate
python manage.py seed_demo         # categories + demo seller + demo admin + 36 demo products
python manage.py test              # runs the automated tests
python manage.py runserver         # http://127.0.0.1:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173  (proxies /api to Django)
```

Open http://localhost:5173. Register a customer account from **Login → Create an account**.

| Portal | URL (type it in the address bar) | Demo login (`seed_demo`, **development only**) |
|---|---|---|
| Storefront | `/` | register your own customer |
| Seller portal | `/seller/login` | `seller@mandifresh.test` / `Seller@12345` |
| Admin portal | `/admin/login` | `admin@mandifresh.test` / `Admin@12345` |

Create a real administrator (use this in production instead of the demo admin):
```bash
python manage.py create_admin --email you@example.com --name "Your Name"   # prompts for a password
```

**Upgrading from the previous version?** The data model changed (JWT sessions, seller approval, image storage). In development, reset cleanly:
```bash
# delete old migration files (keep __init__.py) and old data
rm backend/accounts/migrations/0*.py backend/catalog/migrations/0*.py backend/orders/migrations/0*.py
rm -f backend/db.sqlite3                      # SQLite users; for PostgreSQL drop and recreate the schema, see below
python manage.py makemigrations accounts catalog orders
python manage.py migrate && python manage.py seed_demo
```
PostgreSQL reset: `psql -h localhost -U mandi_user -d mandifresh -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"` (then re-grant if needed: `GRANT ALL ON SCHEMA public TO mandi_user;`).

---

## 4.1 Connecting your Neon PostgreSQL

You already have a project on Neon. You do **not** need a new project for this site.

1. Open the Neon console → your project → **Databases** → **New database** → name it `mandifresh`.
   (Alternatively create a separate Neon project. The free plan allows several.)
2. Click **Connect**, select the `mandifresh` database, and copy the connection string.
   Use the **pooled** connection string if offered.
3. Put it in `backend/.env`:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/mandifresh?sslmode=require
   ```
4. Run `python manage.py migrate`. Tables are created in the new database, so your old project's data is untouched.

---

## 5. Environment variables

### Backend (`backend/.env` locally, Render dashboard in production)
| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Long random string (>= 32 chars). **Required** when debug is off. |
| `JWT_SECRET_KEY` | Separate signing key for JWTs (>= 32 chars). Falls back to `DJANGO_SECRET_KEY` if empty; use a different value in production. |
| `DJANGO_DEBUG` | `True` locally, `False` in production |
| `DJANGO_ALLOWED_HOSTS` | e.g. `mandifresh-api.onrender.com` |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FRONTEND_URL` | Public frontend URL, used in password-reset emails |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Frontend origin(s), e.g. `https://mandifresh.vercel.app` |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | SMTP settings for password-reset email (the default prints emails to the console) |

Generate each secret key: `python -c "import secrets; print(secrets.token_urlsafe(60))"`

### Frontend
No environment variables are needed. The app calls `/api/...` on its own domain, and `vercel.json` forwards that to your backend (see below).

---

## 6. Deploy

**Order:** database (Neon) → backend (Render) → frontend (Vercel).

### 6.1 Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/mandifresh.git
git push -u origin main
```
Make sure the generated `*/migrations/0001_initial.py` files are committed.

### 6.2 Backend on Render
1. Render → **New → Web Service** → connect the repo.
2. Settings:
   - **Root directory:** `backend`
   - **Build command:** `./build.sh`
   - **Start command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - **Health check path:** `/api/health/`
3. Add the environment variables from section 5. For the first deploy use a placeholder for `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` and update them after Vercel gives you the URL.
4. Deploy. `build.sh` installs packages, collects static files, **runs migrations on Neon**, and creates the categories.
5. Create your admin user from the Render **Shell** tab: `python manage.py create_admin --email you@example.com --name "Your Name"`, then sign in at `https://<your-site>/admin/login`.

(`render.yaml` in the repo root is an optional Blueprint that does the same.)

### 6.3 Frontend on Vercel
1. Edit `frontend/vercel.json` and replace `YOUR-BACKEND.onrender.com` with your Render URL:
   ```json
   { "source": "/api/:path*", "destination": "https://mandifresh-api.onrender.com/api/:path*" }
   ```
   This makes the browser talk only to your Vercel domain, so the login cookie is first-party and works in Safari/Chrome without third-party-cookie problems.
2. Vercel → **Add New → Project** → import the repo → **Root directory:** `frontend`. Framework: Vite (auto-detected).
3. Deploy, then go back to Render and set `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to your Vercel URL and redeploy the API.

### 6.4 Go-live checklist
- [ ] `DJANGO_DEBUG=False` and a strong `DJANGO_SECRET_KEY`
- [ ] `JWT_SECRET_KEY` set to its own long random value
- [ ] Admin created with `create_admin` (never run `seed_demo` without `--categories-only`)
- [ ] Daily `python manage.py purge_expired_tokens` scheduled (Render cron job)
- [ ] **Do not run** `seed_demo` without `--categories-only` in production. It creates a demo seller and demo admin with known passwords.
- [ ] SMTP configured (Gmail app password, Brevo, Resend or similar), then test "Forgot password"
- [ ] Custom domain added in Vercel and in `DJANGO_ALLOWED_HOSTS` / CORS / CSRF variables
- [ ] Uptime check on `/api/health/` (free Render instances sleep after inactivity; the first request can take about 30 s)

---

## 7. API overview

All routes are under `/api/`. Auth uses `Authorization: Bearer <access token>`.

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `auth/register/`, `auth/login/` | public | customer sign up / sign in |
| POST | `auth/refresh/`, `auth/logout/` | cookie | rotate refresh token + new access JWT / sign out |
| GET/PATCH | `auth/me/` | any user | profile |
| POST | `auth/change-password/` | any user | change password |
| POST | `auth/password-reset/`, `auth/password-reset/confirm/` | public | forgot password |
| POST | `seller/auth/register/`, `seller/auth/login/` | public | seller sign up / sign in |
| GET | `home/`, `categories/`, `products/`, `products/<slug>/` | public | catalogue (`?q=&category=&sort=&deals=1&in_stock=1&page=`) |
| GET/POST | `orders/` | customer | list / place order |
| GET | `orders/<id>/` | customer | order detail |
| POST | `orders/<id>/cancel/` | customer | cancel (only while pending) |
| CRUD | `seller/products/` | seller | own products only |
| GET | `seller/orders/`, `seller/stats/` | seller | own order items, dashboard numbers |
| PATCH | `seller/orders/<id>/status/` | seller | advance or cancel an order item |
| POST | `seller/products/<id>/image/` (POST/DELETE) | seller | upload / remove product photo |
| GET | `products/<id>/image/` | public | serves an uploaded product photo |
| POST | `admin/auth/login/` | public | administrator sign in |
| GET | `admin/stats/` | admin | overview numbers and 7-day sales |
| GET | `admin/users/?role=&pending=&q=` | admin | customers / sellers |
| POST | `admin/users/<id>/active/`, `admin/sellers/<id>/approval/` | admin | enable/disable account, approve/suspend seller |
| GET/PATCH/DELETE | `admin/products/` | admin | moderate products (hide, feature, delete) |
| CRUD | `admin/categories/` | admin | manage categories |
| GET | `admin/orders/` | admin | all orders |
| GET | `health/` | public | health check |

---

## 8. Development notes

- **Tests:** `python manage.py test` covers JWT validation (tampered, expired, wrong type, wrong audience), token rotation and reuse detection, role separation across the three portals, the admin API, seller approval, image-upload validation, stock handling and seller data isolation. The JWT core was also verified against real PyJWT.
- **Images:** sellers upload photos (resized to <= 900 px in the browser, <= 2 MB) and they are stored in PostgreSQL, so they survive redeploys on hosts with ephemeral disks. For a very large catalogue move them to S3/Cloudinary. Products without a photo show a coloured emoji tile.
- **Payments:** only cash on delivery is enabled. Add Razorpay in `orders/` (create the payment order on checkout, verify the signature via webhook).
- **Admins:** there is no Django admin. Create administrators with `manage.py create_admin`.

### Roadmap
Online payments (Razorpay), email order confirmations, product reviews, address book, coupons, two-factor authentication for admins.

---

## 9. What was built (summary)

1. Custom email-based user model with three roles (customer, seller, admin) and a seller profile with an approval flag
2. Own JWT system on PyJWT: signed access tokens, database-backed rotating refresh tokens in httpOnly cookies, reuse detection, throttling, password validation and reset
3. Catalogue, categories, search/filter/sort/pagination, DB-stored product photos, and a single-request home-page endpoint
4. Transactional order placement with stock locking, price snapshots, per-seller order items and a seller status workflow
5. React storefront with a redesigned home page, hero slider, product browsing, cart, checkout, orders and account
6. Hidden seller portal (URL-only): dashboard, product CRUD with photo upload, order fulfilment
7. Hidden custom admin portal (URL-only) replacing Django admin: overview, sellers, customers, products, categories, orders
8. Automated backend tests, seed command, `create_admin` command, Render/Vercel configuration and this documentation
