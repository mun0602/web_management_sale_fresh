-- Migration: add-session-revoked-at
-- Mô tả: Thêm cột sessionRevokedAt cho token revocation (M-01)
-- Chạy trên production DB: psql $DATABASE_URL -f prisma/migration_add_session_revoked_at.sql

-- M-01: Thêm cột sessionRevokedAt vào bảng User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionRevokedAt" TIMESTAMP(3);
