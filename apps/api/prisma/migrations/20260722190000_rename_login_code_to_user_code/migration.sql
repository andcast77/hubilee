-- Rename User.loginCode → userCode (canonical identity code on users).

ALTER TABLE "users" RENAME COLUMN "loginCode" TO "userCode";

ALTER INDEX IF EXISTS "users_loginCode_key" RENAME TO "users_userCode_key";
