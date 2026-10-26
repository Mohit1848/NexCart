# NexCart Authentication & Role-Based Access Control (RBAC) Guide

This guide documents the security architecture, JSON Web Token (JWT) configuration, password hashing, and REST API endpoints implemented in **Phase 3**.

---

## 1. Security Architecture

### A. Password Security (Bcrypt)
- Passwords are encrypted using `bcryptjs` with **12 salt rounds**.
- Plaintext passwords and password hashes are **never** returned in API responses or written to logs.
- Constant-time password comparisons prevent timing side-channel attacks during login attempts.

### B. JWT Token Design & Verification
- **Tokens**: Signed using the HMAC-SHA256 (`HS256`) algorithm.
- **Claims**:
  - `id`: Authenticated user UUID.
  - `email`: Authenticated user email.
  - `role`: Role claim (`customer` or `admin`).
  - `iss`: Issuer (`nexcart-api`).
  - `aud`: Audience (`nexcart-client`).
  - `exp`: Expiry time (Default: `7d`).
- **Signature & Expiry Check**: Validated on every protected request by `authenticate.js` middleware.
- **Generating Strong Secret**:
  ```bash
  # Generate a 256-bit cryptographically secure random key
  openssl rand -base64 32
  ```

### C. Role-Based Access Control (RBAC)
- Endpoints use the `authorize(...roles)` middleware.
- Public registration (`POST /api/auth/register`) enforces `role = 'customer'` at the service layer, preventing clients from elevating privileges during signup.
- Administrator routes verify `req.user.role === 'admin'`. Non-admin requests receive `HTTP 403 Forbidden`.

### D. Rate Limiting
- `POST /api/auth/login` and `POST /api/auth/register` are protected by `express-rate-limit` (20 attempts per 15 minutes per IP) to guard against automated credential-stuffing and brute-force attacks.

---

## 2. API Endpoints

### A. Authentication Endpoints (`/api/auth`)

#### 1. Register Account
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Responses**:
  - `201 Created`: Returns user object and JWT `token`.
  - `400 Bad Request`: Validation failure (weak password, invalid email).
  - `409 Conflict`: Email already registered (case-insensitive).

#### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Responses**:
  - `200 OK`: Returns authenticated user info and signed JWT `token`.
  - `401 Unauthorized`: Generic `"Invalid email or password"` error (prevents account enumeration).

#### 3. Current User Session
- **Endpoint**: `GET /api/auth/me`
- **Access**: Protected (`Authorization: Bearer <token>`)
- **Responses**:
  - `200 OK`: Current user safe profile `{ id, fullName, email, role, createdAt }`.
  - `401 Unauthorized`: Missing, invalid, or expired token.

#### 4. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Public / Protected
- **Note**: With stateless JWT Bearer tokens, the client discards the token. Server-side token blacklists (e.g., Redis) can be introduced for instant revocation.

---

### B. User Profile Endpoints (`/api/users`)

#### 1. Get Profile
- **Endpoint**: `GET /api/users/me`
- **Access**: Protected (`Authorization: Bearer <token>`)

#### 2. Update Profile
- **Endpoint**: `PATCH /api/users/me`
- **Access**: Protected
- **Editable Fields**: `fullName` (strict allowlist prevents modifying `id`, `role`, or `email`).
- **Request Body**:
  ```json
  {
    "fullName": "Jane Senior Developer"
  }
  ```

#### 3. Change Password
- **Endpoint**: `PATCH /api/users/me/password`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "currentPassword": "SecurePassword123",
    "newPassword": "NewSecurePassword456"
  }
  ```
- **Responses**:
  - `200 OK`: `"Password updated successfully"`.
  - `400 Bad Request`: Wrong current password or invalid new password format.

---

## 3. Running Automated Tests

Run the full Vitest suite from `server/`:

```bash
npm test
```

Verifies 22 automated test assertions across registration, login, token tampering, profile safety, password rotation, and RBAC.