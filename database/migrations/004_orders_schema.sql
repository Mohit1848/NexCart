-- =============================================================================
-- Migration: 004_orders_schema.sql
-- Description: Forward-only schema enhancements for Orders & Order Items (Phase 7.1)
-- =============================================================================

-- 1. ORDERS TABLE ENHANCEMENTS

-- Add unique human-readable order_number
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(64) UNIQUE;

-- Add subtotal with exact numeric precision and nonnegative constraint
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0);

-- Rename order_status to status if needed for standard status naming
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_status'
  ) THEN 
    ALTER TABLE orders RENAME COLUMN order_status TO status; 
  END IF; 
END $$;

-- Ensure currency has sufficient length
ALTER TABLE orders 
ALTER COLUMN currency TYPE VARCHAR(10);

-- Enforce NOT NULL on order_number
ALTER TABLE orders 
ALTER COLUMN order_number SET NOT NULL;

-- 2. ORDER_ITEMS TABLE ENHANCEMENTS

-- Rename subtotal to line_total if present
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'subtotal'
  ) THEN 
    ALTER TABLE order_items RENAME COLUMN subtotal TO line_total; 
  END IF; 
END $$;

-- Update foreign key on product_id to ON DELETE SET NULL to preserve order history when products are deleted
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Ensure unit_price uses exact NUMERIC(12, 2)
ALTER TABLE order_items 
ALTER COLUMN unit_price TYPE NUMERIC(12, 2);

-- Add created_at timestamp to order_items if not present
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. INDEXES
-- Index for human-readable order number lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Index for order status filtering and metrics
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index for looking up orders containing a specific product
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

