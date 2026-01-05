-- Create app_user role for RLS enforcement
-- NOLOGIN: Cannot connect directly, only used via SET ROLE
-- NOINHERIT: Does not inherit privileges from other roles
-- Privileges are granted in index.ts after migrations (db:clear recreates schema)
CREATE ROLE app_user NOINHERIT NOLOGIN;
