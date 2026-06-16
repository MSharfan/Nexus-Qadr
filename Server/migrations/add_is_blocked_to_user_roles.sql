-- Idempotent migration: add is_blocked flag to user_roles table
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT FALSE;

-- optional index to query blocked roles per user quickly
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_is_blocked ON user_roles(user_id, is_blocked);
