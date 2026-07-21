-- Rename the primary key constraint that kept its old camelCase name after
-- the table was renamed from pushSubscriptions to push_subscriptions.
ALTER TABLE "push_subscriptions"
  RENAME CONSTRAINT "pushSubscriptions_pkey" TO "push_subscriptions_pkey";
