-- =============================================================================
-- Migration: 003_token_version.sql
-- Description: Add token_version to users table for session invalidation on password change
-- =============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

