-- Last API activity for active session rows (throttled updates in API).
ALTER TABLE "sessions" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
