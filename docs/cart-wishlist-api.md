# NexCart Persistent Cart & Wishlist API Documentation

This document describes the Cart and Wishlist REST API endpoints, UPSERT logic, stock validation rules, and frontend integration implemented in **Phase 5**.

---

## 1. Shopping Cart Endpoints (`/api/cart`)

All cart endpoints require an authenticated user session (`Authorization: Bearer <token>`).

### `GET /api/cart`
Retrieves the user's active shopping cart, itemized line items, server-calculated totals, and stock availability flags.

**Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "cart": {
      "cartId": "48fe7542-f8c5-44cb-bcfa-f27357c3da38",
      "items": [
        {
          "itemId": "8e367809-54d9-482a-a92c-62c68fae6396",
          "productId": "79b32ec5-f903-4e4b-9706-e784e27f0775",
          "name": "Chronos Active Smartwatch 3",
          "slug": "chronos-active-smartwatch-3",
          "price": 6499.00,
          "quantity": 2,
          "subtotal": 12998.00,
          "stockQuantity": 28,
          "imageUrl": "https://images.unsplash.com/...",
          "isActive": true,
          "categoryName": "Wearables",
          "categorySlug": "wearables"
        }
      ],
      "totalItems": 2,
      "totalAmount": 12998.00,
      "hasUnavailableItems": false
    }
  }
}
```

### `POST /api/cart/items`
Adds an item to the cart or increments its quantity if already present (PostgreSQL UPSERT).

**Request Body**:
```json
{
  "productId": "79b32ec5-f903-4e4b-9706-e784e27f0775",
  "quantity": 1
}
```

**Validation & Stock Verification**:
- Rejects if `productId` is not a valid UUID format (`400 Bad Request`).
- Rejects if the product does not exist or is inactive (`404 Not Found`).
- Rejects if `current_cart_quantity + added_quantity > stock_quantity` with `400 Bad Request` (`"Cannot add requested quantity; only X items available in stock"`).

### `PATCH /api/cart/items/:productId`
Updates the quantity of a specific item in the cart.
- Passing `quantity: 0` automatically removes the item.
- Rejects if requested quantity exceeds available stock.

### `DELETE /api/cart/items/:productId`
Removes an item from the cart.

### `DELETE /api/cart/clear`
Empties all items from the cart.

---

## 2. Wishlist Endpoints (`/api/wishlist`)

All wishlist endpoints require authentication.

### `GET /api/wishlist`
Retrieves all saved wishlist items for the authenticated user.

### `POST /api/wishlist/items`
Saves a product to the user's wishlist.
- **Idempotent**: If the product is already in the wishlist, `ON CONFLICT (wishlist_id, product_id) DO NOTHING` safely avoids duplicate errors.

### `DELETE /api/wishlist/items/:productId`
Removes a product from the wishlist.

### `POST /api/wishlist/items/:productId/move-to-cart`
Atomic operation that moves a product from the user's wishlist into their active shopping cart (with stock validation) and removes it from the wishlist.

---

## 3. Frontend Architecture

- **`CartContext.jsx`**: Global state provider managing `cart`, `wishlist`, drawer open/close states, and optimistic synchronizations.
- **`CartDrawer.jsx`**: Modern slide-over panel with item thumbnail, quantity steppers, subtotal summary, and real-time stock alert badges.
- **`WishlistDrawer.jsx`**: Slide-over panel displaying saved items with one-click *"Move to Cart"*.