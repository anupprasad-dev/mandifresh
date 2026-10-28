# MandiFresh: Online Grocery Store

A full-stack grocery e-commerce platform with a customer storefront and a separate seller portal.

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Django 5 + Django REST Framework + SimpleJWT
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
- Dashboard (revenue, orders, low-stock alerts, order pipeline)
- Product management: add, edit, hide/show, delete, stock and pricing, MRP and discount badge
- Order management: sellers only see their own items and move them through `pending → confirmed → packed → shipped → delivered` (or cancel, which returns stock)

### Authentication & security
| Area | Implementation |
|---|---|
| Passwords | Django's hashing (PBKDF2) plus the 4 built-in validators (length, common, numeric, similarity) |
| Sessions | Short-lived **access token (15 min) kept in memory**; **refresh token (7 days) in an httpOnly, Secure, SameSite cookie**, so JavaScript can't read it |
| Token rotation | Refresh tokens rotate on every use; old ones are blacklisted. Logout revokes the token. |
| Roles | `customer`, `seller`, `admin`. Enforced on the server for every endpoint. A customer can't call seller APIs and vice versa. |
| Separate portals | Customer and seller accounts log in through different endpoints. Using the wrong portal returns the same generic error, so accounts can't be enumerated. |
| Brute force | Rate limiting on all auth endpoints (30/min per IP) and global API throttles |
| Password reset | Signed, single-use, 1-hour tokens. The response is identical whether or not the email exists. |
| Orders | Prices and stock are always taken from the database, never from the browser. Stock rows are locked inside a transaction so two buyers can't oversell the last item. |
| Transport | HTTPS redirect, HSTS, secure cookies, CORS allow-list, and an Origin check on cookie-based endpoints (production) |

---

## 2. Project structure

```
mandifresh/
├── backend/                 Django project
│   ├── config/              settings, urls, wsgi
│   ├── accounts/            custom User (email login, roles), SellerProfile, auth API
│   ├── catalog/             categories, products, public + seller product API, seed command
│   ├── orders/              orders, order items, customer + seller order API
│   ├── build.sh             Render build script
│   ├── requirements.txt
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── src/pages/           storefront pages
│   ├── src/pages/seller/    seller portal pages
│   ├── src/components/      header, footer, hero slider, product card, guards…
│   ├── src/context/         auth, cart, toast state
│   └── vercel.json          API proxy + SPA routing
├── render.yaml              optional Render blueprint
└── README.md
```

---

## 3. Run locally

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
python manage.py seed_demo         # categories + demo seller + 36 demo products
python manage.py createsuperuser   # admin account (for /admin/)
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
The seller portal is at http://localhost:5173/seller/login. The demo seller (created by `seed_demo`, **development only**) is `seller@mandifresh.test` / `Seller@12345`.

---

## 3.1 Connecting your Neon PostgreSQL

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

## 4. Environment variables

### Backend (`backend/.env` locally, Render dashboard in production)
| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Long random string. **Required** when debug is off. |
| `DJANGO_DEBUG` | `True` locally, `False` in production |
| `DJANGO_ALLOWED_HOSTS` | e.g. `mandifresh-api.onrender.com` |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FRONTEND_URL` | Public frontend URL, used in password-reset emails |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Frontend origin(s), e.g. `https://mandifresh.vercel.app` |
| `ADMIN_URL` | Django admin path. Change it in production, e.g. `manage-7f3k/`. |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | SMTP settings for password-reset email (the default prints emails to the console) |

Generate a secret key: `python -c "import secrets; print(secrets.token_urlsafe(60))"`

### Frontend
No environment variables are needed. The app calls `/api/...` on its own domain, and `vercel.json` forwards that to your backend (see below).

---

## 5. Deploy

**Order:** database (Neon) → backend (Render) → frontend (Vercel).

### 5.1 Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/mandifresh.git
git push -u origin main
```
Make sure the generated `*/migrations/0001_initial.py` files are committed.

### 5.2 Backend on Render
1. Render → **New → Web Service** → connect the repo.
2. Settings:
   - **Root directory:** `backend`
   - **Build command:** `./build.sh`
   - **Start command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - **Health check path:** `/api/health/`
3. Add the environment variables from section 4. For the first deploy use a placeholder for `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` and update them after Vercel gives you the URL.
4. Deploy. `build.sh` installs packages, collects static files, **runs migrations on Neon**, and creates the categories.
5. Create your admin user from the Render **Shell** tab: `python manage.py createsuperuser`.

(`render.yaml` in the repo root is an optional Blueprint that does the same.)

### 5.3 Frontend on Vercel
1. Edit `frontend/vercel.json` and replace `YOUR-BACKEND.onrender.com` with your Render URL:
   ```json
   { "source": "/api/:path*", "destination": "https://mandifresh-api.onrender.com/api/:path*" }
   ```
   This makes the browser talk only to your Vercel domain, so the login cookie is first-party and works in Safari/Chrome without third-party-cookie problems.
2. Vercel → **Add New → Project** → import the repo → **Root directory:** `frontend`. Framework: Vite (auto-detected).
3. Deploy, then go back to Render and set `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to your Vercel URL and redeploy the API.

### 5.4 Go-live checklist
- [ ] `DJANGO_DEBUG=False` and a strong `DJANGO_SECRET_KEY`
- [ ] `ADMIN_URL` changed from the default
- [ ] **Do not run** `seed_demo` without `--categories-only` in production. It creates a demo seller with a known password.
- [ ] SMTP configured (Gmail app password, Brevo, Resend or similar), then test "Forgot password"
- [ ] Custom domain added in Vercel and in `DJANGO_ALLOWED_HOSTS` / CORS / CSRF variables
- [ ] Uptime check on `/api/health/` (free Render instances sleep after inactivity; the first request can take about 30 s)

---

## 6. API overview

All routes are under `/api/`. Auth uses `Authorization: Bearer <access token>`.

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `auth/register/`, `auth/login/` | public | customer sign up / sign in |
| POST | `auth/refresh/`, `auth/logout/` | cookie | rotate session / sign out |
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
| GET | `health/` | public | health check |

---

## 7. Development notes

- **Tests:** `python manage.py test` covers registration, role separation, token rotation, catalogue visibility, stock handling, cancellation, and seller data isolation.
- **Images:** sellers paste an image URL. Products without one show a category emoji tile. For uploads, plug in Cloudinary or S3 (Render's disk is ephemeral).
- **Payments:** only cash on delivery is enabled. Add Razorpay in `orders/` (create the payment order on checkout, verify the signature via webhook).
- **Making a seller/customer an admin:** use Django admin → Users.

### Roadmap
Online payments (Razorpay), image uploads, email order confirmations, product reviews, seller approval workflow, address book, coupons.

---

## 8. What was built (summary)

1. Custom email-based user model with roles and a separate seller profile
2. JWT auth with in-memory access token and rotating httpOnly refresh cookie, throttling, password validation and reset
3. Catalogue, categories, search/filter/sort/pagination, and a single-request home-page endpoint
4. Transactional order placement with stock locking, price snapshots, per-seller order items and a seller status workflow
5. React storefront: hero slider, product browsing, cart, checkout, orders, account
6. Hidden seller portal (URL-only access): dashboard, product CRUD, order fulfilment
7. Automated backend tests, seed command, Render/Vercel configuration and this documentation
