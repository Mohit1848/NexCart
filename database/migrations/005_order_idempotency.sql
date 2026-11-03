-- =============================================================================
-- Migration: 005_order_idempotency.sql
-- Description: Add idempotency_key to orders table for duplicate checkout protection (Phase 7.2)
-- =============================================================================

-- Add idempotency_key column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Enforce per-user idempotency key uniqueness at the database level
-- (Partial index ensures multiple NULLs are allowed for checkouts without explicit keys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency 
ON orders (user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

