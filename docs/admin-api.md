# NexCart Phase 6: Admin Dashboard & Inventory Management API Documentation

This document describes the Admin REST API endpoints introduced in **Phase 6 (Steps 6.1–6.3)**, covering inventory metrics, pagination/filtering parameters, stock updates, activation status toggling, and role-based access control (RBAC).

---

## Security & Role-Based Access Control (RBAC)

All `/api/admin` routes are protected by two layers of middleware:
1. `authenticate`: Verifies the cryptographic signature of the `Authorization: Bearer <jwt_token>` header and extracts user claims (`id`, `email`, `role`).
2. `authorize('admin')`: Restricts access strictly to users having `role === 'admin'`.

**Rejection Semantics**:
- Unauthenticated requests (missing, invalid, or expired JWT) receive `401 Unauthorized`.
- Authenticated requests with non-admin roles (e.g., `role === 'customer'`) receive `403 Forbidden`. Roles supplied in request bodies or query strings are strictly ignored.

---

## Endpoints

### 1. `GET /api/admin/metrics`

Retrieves consolidated catalog statistics, active inventory retail valuation, and a restock priority list.

**Valuation Basis**:
- `valuationBasis`: `'active_retail_price'`
- Calculation: $\sum (\text{price} \times \text{stock\_quantity})$ computed strictly over products where `is_active = true`.
- Monetary values preserve exact 2-decimal precision (`::numeric(12,2)` in PostgreSQL).
- Inactive (soft-deleted) items are excluded from valuation but tracked under `inactiveProducts`.

**Restock Priority List**:
- Returns active products where $0 \le \text{stock\_quantity} \le 5$.
- Ordered by replenishment priority: `stock_quantity ASC` (out-of-stock items first), with ties broken by `name ASC`.
- Limited to the top 5 most urgent items (`LIMIT 5`).

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProducts": 10,
      "activeProducts": 9,
      "inactiveProducts": 1,
      "lowStockProducts": 2,
      "outOfStockProducts": 1,
      "totalCategories": 4,
      "totalInventoryValue": 84250.00,
      "valuationBasis": "active_retail_price"
    },
    "restockPriorityList": [
      {
        "id": "c138f284-486d-4ee8-963b-63fcb00bc985",
        "name": "Wireless Charging Pad",
        "slug": "wireless-charging-pad",
        "stockQuantity": 0,
        "price": 1299.00,
        "isActive": true,
        "categoryName": "Accessories",
        "categorySlug": "accessories"
      }
    ]
  }
}
```

---

### 2. `GET /api/admin/products`

Retrieves a paginated list of catalog products for administrative review. Unlike the public catalog (`GET /api/products`), this endpoint returns both active and inactive products.

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | Page number ($\ge 1$) |
| `limit` | Integer | `10` | Items per page ($1 \le \text{limit} \le 100$) |
| `search` | String | `null` | Keyword search matching `name`, `slug`, or `description` |
| `category` | String | `null` | Category slug (e.g., `audio-sound`) or category UUID |
| `stockStatus` | String | `'all'` | Filter: `'all'`, `'in_stock'` ($> 0$), `'low_stock'` ($1..5$), `'out_of_stock'` ($= 0$) |
| `sortBy` | String | `'created_at'` | Allowed whitelist: `'created_at'`, `'price'`, `'name'`, `'stock_quantity'` |
| `order` | String | `'desc'` | Allowed whitelist: `'asc'`, `'desc'` |

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "c138f284-486d-4ee8-963b-63fcb00bc985",
        "categoryId": "2e0da324-5d9c-48be-8f38-348618eb7c56",
        "categoryName": "Audio & Sound",
        "categorySlug": "audio-sound",
        "name": "AuraWave Pro ANC Headphones",
        "slug": "aurawave-pro-anc-headphones",
        "description": "Industry-leading active noise cancellation...",
        "price": 8999.00,
        "stockQuantity": 35,
        "imageUrl": "https://images.unsplash.com/...",
        "isActive": true,
        "createdAt": "2026-10-26T07:05:48.000Z",
        "updatedAt": "2026-10-26T07:05:48.000Z"
      }
    ],
    "pagination": {
      "totalItems": 10,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3. `PATCH /api/admin/products/:id/stock`

Atomically updates only the `stock_quantity` for a given product. All other attributes (`price`, `name`, `slug`, `category_id`, `description`) remain completely immutable through this endpoint.

**Constraints**:
- `:id` must be a valid UUID v4 format (`400 Bad Request` if invalid).
- `stockQuantity` must be a non-negative integer ($0 \le \text{stockQuantity} \le 100,000$).
- Fractional numbers, negative numbers, non-numeric strings, and booleans are rejected (`400 Bad Request`).
- Extra unpermitted fields in the JSON body are rejected (`400 Bad Request`).
- If the product UUID is valid but does not exist in the database, returns `404 Not Found`.

**Request Body**:
```json
{
  "stockQuantity": 45
}
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Stock for \"AuraWave Pro ANC Headphones\" updated to 45",
  "data": {
    "product": {
      "id": "c138f284-486d-4ee8-963b-63fcb00bc985",
      "categoryId": "2e0da324-5d9c-48be-8f38-348618eb7c56",
      "name": "AuraWave Pro ANC Headphones",
      "slug": "aurawave-pro-anc-headphones",
      "description": "Industry-leading active noise cancellation...",
      "price": 8999.00,
      "stockQuantity": 45,
      "imageUrl": "https://images.unsplash.com/...",
      "isActive": true,
      "createdAt": "2026-10-26T07:05:48.000Z",
      "updatedAt": "2026-11-02T04:15:00.000Z"
    }
  }
}
```

---

### 4. `PATCH /api/admin/products/:id/toggle-status`

Toggles product active status between `true` and `false` (`is_active = NOT is_active`).

**Operational Behavior**:
- When toggled to `false` (inactive):
  - Product is immediately hidden from the public customer storefront (`GET /api/products` and `GET /api/products/:id`).
  - Product remains visible and editable in the admin inventory list (`GET /api/admin/products`).
  - Product value is excluded from active inventory retail valuation in `GET /api/admin/metrics`.
- When toggled back to `true` (active):
  - Product immediately returns to public storefront search and catalog results.
  - Product value is re-included in active inventory retail valuation.

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Product \"AuraWave Pro ANC Headphones\" is now inactive",
  "data": {
    "product": {
      "id": "c138f284-486d-4ee8-963b-63fcb00bc985",
      "isActive": false,
      "stockQuantity": 45,
      "price": 8999.00,
      "updatedAt": "2026-11-02T04:16:00.000Z"
    }
  }
}
```

