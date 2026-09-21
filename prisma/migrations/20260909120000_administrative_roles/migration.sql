CREATE TYPE "UserRole" AS ENUM ('ADMINISTRATOR', 'SUPERVISION', 'EMPLOYEE');
ALTER TABLE "UserProfile" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE', ADD COLUMN "username" TEXT, ADD COLUMN "displayName" TEXT, ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
UPDATE "UserProfile" SET "role" = 'ADMINISTRATOR' WHERE "administrator" = true;
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
