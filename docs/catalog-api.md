# NexCart Catalog & Product REST API Documentation

This document describes the Product and Category REST API endpoints, query parameters, sorting rules, and frontend integration introduced in **Phase 4**.

---

## 1. Product APIs (`/api/products`)

### Public Storefront Endpoints

#### `GET /api/products`
Retrieves paginated, filtered, and sorted active products.

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | Page number (min 1) |
| `limit` | Integer | `12` | Products per page (between 1 and 50) |
| `category` | String | `null` | Filter by category slug (e.g. `electronics`) or UUID |
| `search` | String | `null` | Case-insensitive keyword search against product name & description |
| `sortBy` | String | `'created_at'` | Allowed whitelist: `'price'`, `'name'`, `'created_at'` |
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
        "description": "Industry-leading active noise cancellation with 40-hour battery life...",
        "price": 8999.00,
        "stockQuantity": 35,
        "imageUrl": "https://images.unsplash.com/...",
        "isActive": true,
        "createdAt": "2026-10-26T07:05:48.000Z",
        "updatedAt": "2026-10-26T07:05:48.000Z"
      }
    ],
    "pagination": {
      "totalItems": 8,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 12,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### `GET /api/products/:id`
Retrieves an active product by UUID.
- Returns `400 Bad Request` if UUID format is invalid.
- Returns `404 Not Found` if product is missing or inactive.

#### `GET /api/products/slug/:slug`
Retrieves an active product by its unique SEO slug.
- Example: `GET /api/products/slug/chronos-active-smartwatch-3`

---

### Administrator Product Endpoints (Protected by JWT & RBAC)

#### `POST /api/products`
- **Headers**: `Authorization: Bearer <admin_token>`
- **Body**: `{ name, slug, categoryId, description, price, stockQuantity, imageUrl }`
- **Status**: `201 Created`

#### `PATCH /api/products/:id`
- **Headers**: `Authorization: Bearer <admin_token>`
- **Body**: Partial update of permitted fields (`name`, `slug`, `categoryId`, `price`, `stockQuantity`, `imageUrl`, `isActive`)
- **Status**: `200 OK`

#### `DELETE /api/products/:id`
- **Headers**: `Authorization: Bearer <admin_token>`
- **Behavior**: Soft-deactivates the product (`is_active = false`), preserving historical integrity for past orders.

---

## 2. Category APIs (`/api/categories`)

### Public Storefront Endpoints
- `GET /api/categories`: Returns all categories along with their active product counts.
- `GET /api/categories/:id`: Returns category by UUID.
- `GET /api/categories/slug/:slug`: Returns category by slug.

### Administrator Endpoints
- `POST /api/categories`: Create category (`name`, `slug`, `description`, `imageUrl`).
- `PATCH /api/categories/:id`: Update category fields.
- `DELETE /api/categories/:id`: Delete category (Returns `409 Conflict` if any products are currently linked to this category).

---

## 3. Frontend Storefront Execution

Start the customer storefront:
```bash
cd client
npm install
npm run dev
```
Storefront opens on `http://localhost:5173`.