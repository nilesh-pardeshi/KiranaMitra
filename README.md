# KiranaMitra — Smart Kirana Store Management System

<p align="center">
  <strong>A modern, full-stack workspace for everyday kirana store operations.</strong><br/>
  Manage products, inventory, suppliers, purchases, sales, customer credit and business reports from one place.
</p>

<p align="center">
  <a href="https://kirana-mitra.vercel.app">Live application</a> ·
  <a href="https://kirana-mitra-api.onrender.com/docs">Backend API docs</a> ·
  <a href="https://github.com/nilesh-pardeshi/KiranaMitra">GitHub repository</a>
</p>

---

## Overview

KiranaMitra is a web-based store management application designed to bring common kirana shop workflows into one organised system. It provides a public introduction page and a protected owner workspace for managing daily store records.

The application is designed around a single-store owner workflow. The first account can be registered through the registration endpoint; subsequent account creation is restricted by the backend's first-account rule.

**Live links**
- Frontend: https://kirana-mitra.vercel.app
- Backend: https://kirana-mitra-api.onrender.com
- API documentation: https://kirana-mitra-api.onrender.com/docs

## Main features

| Module | Capabilities |
|---|---|
| Public landing page | Product introduction, feature overview, navigation to login and registration |
| Authentication | Owner registration (first account only), login, JWT-based session and protected routes |
| Dashboard | Daily sales summary, product and inventory overview, low-stock count and customer outstanding balance |
| Products | Product catalogue and product variants |
| Inventory | Stock visibility and inventory summary |
| Suppliers | Supplier records and supplier management |
| Purchases | Purchase entry and stock-in workflow |
| Customers & Udhar | Customer records, outstanding credit and payment tracking |
| Sales & billing | Sales entry, payment handling and stock deduction |
| Invoices | Invoice history and PDF bill generation |
| Reports | Sales and business reporting |
| Profile | Owner profile details and profile image upload |

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Routing | React Router |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Charts | Recharts |
| HTTP client | Axios |
| Backend | Python, FastAPI |
| Data validation | Pydantic |
| ORM | SQLAlchemy 2 |
| Database | PostgreSQL |
| Schema migrations | Alembic |
| Authentication | JWT and password hashing |
| PDF generation | ReportLab |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Managed database | Neon PostgreSQL |

## Application architecture

```text
Browser
  |
  v
Vercel — React + Vite frontend
  |
  | HTTPS / JSON API + JWT
  v
Render — FastAPI backend
  |
  | SQLAlchemy
  v
Neon — PostgreSQL database
```

The frontend and backend are deployed independently. The browser sends API requests to the Render service; the backend accesses PostgreSQL through the configured database connection string.

## Repository structure

```text
KiranaMitra/
├── backend/
│   ├── alembic/
│   │   └── versions/          # Database migration revisions
│   ├── app/
│   │   ├── core/              # Configuration, security, dependencies
│   │   ├── database/          # SQLAlchemy engine and sessions
│   │   ├── models/            # Database models
│   │   ├── routers/           # FastAPI API endpoints
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic and PDF generation
│   ├── tests/                 # Backend tests
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   └── layout/
│   │   ├── context/           # Authentication context
│   │   ├── pages/             # Landing, auth and store pages
│   │   ├── services/          # Axios API client
│   │   ├── App.jsx            # Application routes
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json            # SPA route fallback
├── .gitignore
└── README.md
```

## Routes

| URL | Access | Description |
|---|---|---|
| `/` | Public | KiranaMitra landing page |
| `/login` | Public | Owner sign-in |
| `/register` | Public endpoint; backend first-account restriction applies | Initial owner registration |
| `/dashboard` | Authenticated | Store dashboard |
| `/products` | Authenticated | Product catalogue |
| `/inventory` | Authenticated | Inventory |
| `/suppliers` | Authenticated | Suppliers |
| `/purchases` | Authenticated | Purchases |
| `/customers` | Authenticated | Customers and Udhar |
| `/sales` | Authenticated | Sales and billing |
| `/invoices` | Authenticated | Invoice history |
| `/reports` | Authenticated | Business reports |
| `/profile` | Authenticated | Owner profile |

The Vercel rewrite in `frontend/vercel.json` serves the React application for client-side routes, allowing direct navigation and browser refresh on routes such as `/login` and `/dashboard`.

## Run locally

### Prerequisites

- Node.js and npm
- Python 3.12 recommended
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/nilesh-pardeshi/KiranaMitra.git
cd KiranaMitra
```

### 2. Configure the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` using the variables required by `backend/app/core/config.py`. At minimum, configure:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

Do not commit `.env` or share real credentials. If a password contains URL-reserved characters, URL-encode them in the connection string.

Run migrations and start the API:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend development URLs:
- API root: http://127.0.0.1:8000/
- Health: http://127.0.0.1:8000/health
- Database health: http://127.0.0.1:8000/health/database
- Swagger docs: http://127.0.0.1:8000/docs

### 3. Configure the frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start Vite:

```powershell
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Secret used to sign authentication tokens |
| `FRONTEND_URL` | Comma-separated allowed frontend origins for CORS |
| `GEMINI_API_KEY` | Optional AI integration key if the configured AI feature is enabled |

Use the exact variables referenced by the backend configuration. Never put backend secrets in frontend environment variables.

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend |

Vite variables prefixed with `VITE_` are included in browser code. Only public configuration such as the API base URL belongs there. Never put database passwords, JWT secrets, or private API keys in `VITE_` variables.

## Deployment

The production architecture uses Vercel, Render and Neon.

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Use the Vite framework preset.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `VITE_API_BASE_URL` with the deployed Render backend URL, for example `https://kirana-mitra-api.onrender.com`.
7. Deploy. The `frontend/vercel.json` file configures SPA route fallback.

### Backend — Render

1. Create a Python web service connected to the GitHub repository.
2. Set the root directory to `backend`.
3. Build command: `pip install -r requirements.txt`.
4. Start command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Configure `DATABASE_URL` and `SECRET_KEY` in Render's environment settings.
6. Set `FRONTEND_URL` to the exact deployed frontend origin, without a page path or trailing slash:

```text
https://kirana-mitra.vercel.app
```

7. Save changes and verify the service is live.

### Database — Neon

Create a PostgreSQL database in Neon and configure its connection string as the backend's `DATABASE_URL`. Use the SQLAlchemy/psycopg2-compatible URL scheme expected by the backend environment.

### Automatic deployments

When Vercel and Render are connected to the GitHub repository with automatic deployment enabled, pushing commits to the configured production branch triggers new deployments. Backend changes deploy on Render; frontend changes deploy on Vercel.

## Verification checklist

After deployment or significant code changes, verify:

- [ ] Landing page opens at `/`.
- [ ] Login and registration navigation works.
- [ ] Dashboard redirects unauthenticated visitors to login.
- [ ] Owner can log in and protected pages load.
- [ ] Products and inventory operations work.
- [ ] Purchase entries update stock correctly.
- [ ] Sales reduce stock correctly.
- [ ] Credit sales update customer outstanding balance.
- [ ] Customer payments reduce outstanding balance.
- [ ] Invoice totals and PDF downloads are correct.
- [ ] Reports load expected sales and profit summaries.
- [ ] Direct navigation and refresh work on `/login`, `/dashboard` and other frontend routes.
- [ ] Browser Network requests use the deployed API URL, not `localhost`.

## Production considerations

- Render free services may sleep after inactivity, causing a delay on the first request.
- Local filesystem uploads on an ephemeral hosting instance are not durable. Use persistent object storage for profile images before relying on them in production.
- Keep database backups and test restore procedures.
- Keep dependencies updated and review authentication, authorization, input validation, upload handling and rate limiting before exposing the service to wider use.
- Test migrations against a backup or staging database before applying schema changes to production.
- Use HTTPS and never commit secrets, database dumps, access tokens or `.env` files.

## Contributing

1. Create a branch for your change.
2. Make and test the change locally.
3. Run the frontend production build with `npm run build`.
4. Run relevant backend tests.
5. Commit and push your branch, then open a pull request.

## Author

**Nilesh Rajendra Pardeshi**  
B.Tech — Artificial Intelligence and Machine Learning

GitHub: [nilesh-pardeshi](https://github.com/nilesh-pardeshi)

---

