# NexCart — AI-Powered E-Commerce Platform

A production-grade, AI-assisted full-stack e-commerce web application with intelligent product recommendations grounded in a PostgreSQL database.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router, Lucide Icons
- **Admin Dashboard**: React, Tailwind CSS, Charting
- **Backend**: Node.js, Express.js (RESTful API architecture)
- **Database**: PostgreSQL (Raw SQL queries with `pg` connection pool, versioned migrations)
- **Authentication**: JWT & bcrypt password hashing with Role-Based Access Control (RBAC)
- **AI Integration**: Google Gemini API (Backend-grounded product discovery)

## 📁 Monorepo Architecture

```text
nexcart/
  client/         # Customer storefront (React + Vite)
  admin/          # Merchant/Admin dashboard (React + Vite)
  server/         # Node.js + Express REST API backend
    src/
      config/     # Database and environment configurations
      controllers/# HTTP request handlers
      middleware/ # Auth, validation, error handling middleware
      routes/     # Express route definitions
      services/   # Core business logic and external services
      validators/ # Input validation schemas
      utils/      # Helper utilities
      app.js      # Express app setup and middleware pipeline
      server.js   # HTTP server entry point
    tests/        # Integration and unit tests
  database/
    migrations/   # SQL migration files
    seeds/        # Database seed scripts
  docs/           # Architectural and API documentation
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
npm run dev
```

Health Check:
```bash
curl http://localhost:5000/api/health
```
