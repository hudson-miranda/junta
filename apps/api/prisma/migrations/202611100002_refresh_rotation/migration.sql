-- Refresh consumption is distinct from access-session revocation.
-- Additive migration preserves existing sessions and deployments.
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);
