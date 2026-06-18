-- Drop old columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";

-- Add new columns (key will be populated with a default for existing rows)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

-- Generate keys for existing users
UPDATE "users" SET "key" = 'td_' || replace(gen_random_uuid()::text, '-', '') WHERE "key" IS NULL;

-- Make key NOT NULL and unique
ALTER TABLE "users" ALTER COLUMN "key" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_key_key" ON "users"("key");

-- Promote first created user to admin (if any exist and no admin yet)
UPDATE "users" SET "role" = 'admin'
WHERE id = (SELECT id FROM "users" ORDER BY "created_at" ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM "users" WHERE "role" = 'admin');
