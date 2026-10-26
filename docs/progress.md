# NexCart — Project Roadmap & Progress Tracker

## Phase Status Summary

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Environment setup, repository structure, health-check endpoint | 🟢 Completed |
| **Phase 2** | Database schema design, migrations, seed data & connection pool | 🟢 Completed |
| **Phase 3** | Authentication, user accounts, JWT, password hashing & RBAC | 🟢 Completed |
| **Phase 4** | Product & category APIs + Customer storefront setup | 🟢 Completed |
| **Phase 5** | Product search, filters, pagination, details, cart & wishlist | 🟡 Next Up |
| **Phase 6** | Admin dashboard, inventory management & sales analytics | ⚪ Pending |
| **Phase 7** | Checkout, order processing, ACID transactions & Stripe payments | ⚪ Pending |
| **Phase 8** | Gemini-powered AI shopping assistant grounded in database products | ⚪ Pending |
| **Phase 9** | Product reviews, email notifications, security hardening & test suite | ⚪ Pending |
| **Phase 10**| Deployment setup, API documentation, screenshots & GitHub polish | ⚪ Pending |

---

## Detailed Task Checklist

### Phase 1: Environment & Foundation Setup
- [x] Inspect existing development environment (Node.js, npm, Git, PostgreSQL)
- [x] Define monorepo directory layout (`client`, `admin`, `server`, `database`, `docs`)
- [x] Configure root `.gitignore`, `.env.example`, and `README.md`
- [x] Initialize `server/package.json` with dependencies (`express`, `cors`, `dotenv`, `pg`, `helmet`, `morgan`)
- [x] Implement modular Express structure (`app.js` and `server.js`)
- [x] Implement `GET /api/health` endpoint with uptime and timestamp
- [x] Test and verify `GET /api/health` (Status 200) and `404 Handler` (Status 404)

### Phase 2: PostgreSQL Database Schema & Migrations
- [x] Verify PostgreSQL service connectivity (PostgreSQL 18.6)
- [x] Safely configure `server/.env` credentials and ensure `nexcart_db` exists
- [x] Create resilient connection pool in `server/src/config/db.js` (`pg.Pool`)
- [x] Design normalized schema (`users`, `addresses`, `categories`, `products`, `carts`, `cart_items`, `wishlists`, `wishlist_items`, `orders`, `order_items`, `payments`, `reviews`)
- [x] Implement exact monetary representation (`NUMERIC(10,2)` and `NUMERIC(12,2)`)
- [x] Add data integrity constraints (Foreign Keys, NOT NULL, CHECK, UNIQUE, `set_updated_at` triggers)
- [x] Implement transactional, idempotent migration runner (`server/src/scripts/migrate.js`)
- [x] Create repeatable sample catalog seed script (`server/src/scripts/seed.js`)
- [x] Implement distinct database readiness check (`GET /api/health/ready`)
- [x] Document database architecture in `docs/database.md`

### Phase 3: Authentication, User Accounts, JWT & RBAC
- [x] Audit `users` table and implement migration `002_case_insensitive_email.sql`
- [x] Implement secure password hashing with `bcryptjs` (12 salt rounds)
- [x] Implement JWT configuration module (`server/src/config/jwt.js`)
- [x] Build validation rules (`server/src/validators/auth.validators.js`)
- [x] Implement `POST /api/auth/register` (hardcoded `role = 'customer'`, 409 conflict on duplicate)
- [x] Implement `POST /api/auth/login` (generic 401 error, rate-limited)
- [x] Implement `GET /api/auth/me` and `POST /api/auth/logout`
- [x] Implement `GET /api/users/me`, `PATCH /api/users/me` (allowlist), and `PATCH /api/users/me/password`
- [x] Build authentication middleware (`authenticate.js`) and RBAC middleware (`authorize.js`)
- [x] Build rate-limiting middleware (`rateLimiter.js`)
- [x] Write comprehensive automated test suite (`server/tests/auth.test.js`) — 22 tests passing
- [x] Document authentication architecture in `docs/auth.md`

### Phase 4: Product & Category REST APIs + Customer Storefront
- [x] Build Category REST APIs (`GET /`, `GET /slug/:slug`, `GET /:id`, admin `POST`, `PATCH`, `DELETE`)
- [x] Prevent category deletion when products are linked (HTTP 409)
- [x] Build Product REST APIs (`GET /`, `GET /slug/:slug`, `GET /:id`, admin `POST`, `PATCH`, `DELETE`)
- [x] Add pagination, search, category filter, and sorting with SQL injection whitelist
- [x] Implement safe soft-deactivation (`is_active = false`) for product deletion
- [x] Write automated test suite (`server/tests/catalog.test.js`) — 23 tests passing (45 total across project)
- [x] Initialize React + Vite customer storefront in `client/`
- [x] Configure Tailwind CSS with custom navy & slate theme
- [x] Build responsive `Navbar`, `Footer`, `ProductCard`, and `ProductSkeleton` components
- [x] Implement `HomePage`, `ProductsPage` (catalog), `ProductDetailPage`, and `NotFoundPage`
- [x] Connect storefront to backend API using Axios client with `VITE_API_BASE_URL`
- [x] Verify production Vite build (`npm run build` completed with zero errors)
- [x] Document catalog APIs in `docs/catalog-api.md`