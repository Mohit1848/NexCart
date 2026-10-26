# NexCart — AI-Powered E-Commerce Platform

A production-grade, AI-assisted full-stack e-commerce web application with intelligent product recommendations grounded in a PostgreSQL database.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router, Lucide Icons, Axios
- **Admin Dashboard**: React, Tailwind CSS, Charting
- **Backend**: Node.js, Express.js (RESTful API architecture)
- **Database**: PostgreSQL 18+ (Raw SQL queries with `pg` connection pool, versioned migrations)
- **Authentication**: JWT & bcrypt password hashing with Role-Based Access Control (RBAC)
- **AI Integration**: Google Gemini API (Backend-grounded product discovery)

## 📁 Monorepo Architecture

```text
nexcart/
  client/         # Customer storefront (React + Vite + Tailwind)
    src/
      api/        # Axios API client & formatters
      components/ # Navbar, Footer, ProductCard, ProductSkeleton
      pages/      # HomePage, ProductsPage, ProductDetailPage, NotFoundPage
      App.jsx     # Route architecture
  admin/          # Merchant/Admin dashboard (React + Vite)
  server/         # Node.js + Express REST API backend
    src/
      config/     # Database pool and JWT configuration
      controllers/# HTTP request handlers (auth, users, products, categories, health)
      middleware/ # Auth, RBAC, rate-limiting, error handling
      routes/     # Express route definitions
      scripts/    # Database init, migration, seed & verify scripts
      services/   # Business logic (products, categories, auth)
      validators/ # Input validation schemas
      app.js      # Express app setup and middleware pipeline
      server.js   # HTTP server entry point
    tests/        # Integration and unit tests (45 tests in Vitest + Supertest)
  database/
    migrations/   # SQL migration files
    seeds/        # Database seed scripts
  docs/           # Architectural, database, auth, catalog & progress documentation
```

## 🛠️ Quick Start (Development)

### Prerequisites
- Node.js (v18+ recommended, detected: v22.17.x)
- npm (v9+ recommended, detected: 11.x)
- PostgreSQL (v14+ recommended, detected: v18.x)
- Git

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env

# Database Initialization, Migrations & Seeds
npm run db:init      # Creates nexcart_db if not present
npm run db:migrate   # Applies transactional SQL migrations
npm run db:seed      # Populates catalog with realistic categories & products
npm run db:verify    # Inspects schema, tables, and constraints

# Run Automated Test Suite (45 Tests)
npm test

# Start Development Server (Runs on port 5000)
npm run dev
```

### 2. Frontend Customer Storefront Setup
```bash
# In a separate terminal
cd client
npm install
npm run dev          # Opens on http://localhost:5173
```

### API Endpoints Overview
- **Health / Readiness**:
  - `GET /api/health` — Liveness probe
  - `GET /api/health/ready` — Database connection readiness
- **Catalog & Products**:
  - `GET /api/products` — Paginated, filtered, and sorted products
  - `GET /api/products/:id` — Single product by UUID
  - `GET /api/products/slug/:slug` — Single product by unique slug
  - `POST /api/products` — Admin create product
  - `PATCH /api/products/:id` — Admin update product
  - `DELETE /api/products/:id` — Admin safe deactivation
- **Categories**:
  - `GET /api/categories` — Category list with product counts
  - `GET /api/categories/slug/:slug` — Category by slug
  - `POST /api/categories` — Admin create category
  - `DELETE /api/categories/:id` — Admin delete category (protected from orphan products)
- **Authentication**:
  - `POST /api/auth/register` — Customer account registration
  - `POST /api/auth/login` — Account login & JWT issuance
  - `GET /api/auth/me` — Authenticated session verification
- **User Profile**:
  - `GET /api/users/me` — Fetch user profile
  - `PATCH /api/users/me` — Update allowed profile fields (fullName)
  - `PATCH /api/users/me/password` — Change password with current password check