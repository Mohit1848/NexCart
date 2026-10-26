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
      config/     # Database pool and environment configurations
      controllers/# HTTP request handlers (health, readiness)
      middleware/ # Auth, validation, error handling middleware
      routes/     # Express route definitions
      scripts/    # Database init, migration, seed & verify scripts
      services/   # Core business logic and external services
      validators/ # Input validation schemas
      utils/      # Helper utilities
      app.js      # Express app setup and middleware pipeline
      server.js   # HTTP server entry point
    tests/        # Integration and unit tests
  database/
    migrations/   # SQL migration files
    seeds/        # Database seed scripts
  docs/           # Architectural, database & progress documentation
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

# Start Development Server
npm run dev
```

### Health & Readiness Endpoints
- **Liveness probe**: `curl http://localhost:5000/api/health`
- **Readiness probe**: `curl http://localhost:5000/api/health/ready`