# NexCart — AI-Powered E-Commerce Platform

A production-grade, AI-assisted full-stack e-commerce web application with intelligent product recommendations grounded in a PostgreSQL database.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router, Lucide Icons
- **Admin Dashboard**: React, Tailwind CSS, Charting
- **Backend**: Node.js, Express.js (RESTful API architecture)
- **Database**: PostgreSQL 18+ (Raw SQL queries with `pg` connection pool, versioned migrations)
- **Authentication**: JWT & bcrypt password hashing with Role-Based Access Control (RBAC)
- **AI Integration**: Google Gemini API (Backend-grounded product discovery)

## 📁 Monorepo Architecture

```text
nexcart/
  client/         # Customer storefront (React + Vite)
  admin/          # Merchant/Admin dashboard (React + Vite)
  server/         # Node.js + Express REST API backend
    src/
      config/     # Database pool and JWT configuration
      controllers/# HTTP request handlers (auth, users, health)
      middleware/ # Auth, RBAC, rate-limiting, error handling
      routes/     # Express route definitions
      scripts/    # Database init, migration, seed & verify scripts
      services/   # Business logic (auth, grounding)
      validators/ # Input validation schemas
      utils/      # Helper utilities
      app.js      # Express app setup and middleware pipeline
      server.js   # HTTP server entry point
    tests/        # Integration and unit tests (Vitest + Supertest)
  database/
    migrations/   # SQL migration files
    seeds/        # Database seed scripts
  docs/           # Architectural, database, auth & progress documentation
```

## 🛠️ Quick Start (Development)

### Prerequisites
- Node.js (v18+ recommended, detected: v22.17.x)
- npm (v9+ recommended, detected: 11.x)
- PostgreSQL (v14+ recommended, detected: v18.x)
- Git

### Backend Setup
```bash
cd server
npm install
cp .env.example .env

# Database Initialization, Migrations & Seeds
npm run db:init      # Creates nexcart_db if not present
npm run db:migrate   # Applies transactional SQL migrations
npm run db:seed      # Populates catalog with realistic categories & products
npm run db:verify    # Inspects schema, tables, and constraints

# Run Automated Test Suite
npm test             # Executes all 22 integration & security tests

# Start Development Server
npm run dev
```

### API Endpoints Overview
- **Health / Readiness**:
  - `GET /api/health` — Liveness check
  - `GET /api/health/ready` — Database connection readiness
- **Authentication**:
  - `POST /api/auth/register` — Customer account registration
  - `POST /api/auth/login` — Account login & JWT issuance
  - `GET /api/auth/me` — Authenticated session verification
  - `POST /api/auth/logout` — Client token discard
- **User Profile**:
  - `GET /api/users/me` — Fetch user profile
  - `PATCH /api/users/me` — Update allowed profile fields (fullName)
  - `PATCH /api/users/me/password` — Change password with current password check