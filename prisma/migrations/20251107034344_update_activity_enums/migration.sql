-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'MULTIPLE_CHOICE';
ALTER TYPE "ActivityType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "ActivityType" ADD VALUE 'CODE_CHALLENGE';
ALTER TYPE "ActivityType" ADD VALUE 'OPEN_QUESTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Difficulty" ADD VALUE 'EASY';
ALTER TYPE "Difficulty" ADD VALUE 'MEDIUM';
ALTER TYPE "Difficulty" ADD VALUE 'HARD';

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "difficulty" SET DEFAULT 'EASY';

-- CreateIndex
CREATE INDEX "activities_subtopic_id_idx" ON "activities"("subtopic_id");

-- CreateIndex
CREATE INDEX "activities_created_by_id_idx" ON "activities"("created_by_id");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_difficulty_idx" ON "activities"("difficulty");

-- CreateIndex
CREATE INDEX "submissions_user_id_idx" ON "submissions"("user_id");

-- CreateIndex
CREATE INDEX "submissions_activity_id_idx" ON "submissions"("activity_id");
