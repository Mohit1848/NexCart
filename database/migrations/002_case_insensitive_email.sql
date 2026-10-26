-- =============================================================================
-- Migration: 002_case_insensitive_email.sql
-- Description: Enforce case-insensitive email uniqueness on the users table
-- =============================================================================

-- Functional unique index to guarantee no two users can share the same email
-- regardless of casing (e.g. John@example.com vs john@example.com).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));