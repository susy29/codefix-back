/*
  Warnings:

  - You are about to drop the column `challenge_id` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `execution_time` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `submissions` table. All the data in the column will be lost.
  - The primary key for the `user_progress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `attempts_count` on the `user_progress` table. All the data in the column will be lost.
  - You are about to drop the column `best_score` on the `user_progress` table. All the data in the column will be lost.
  - You are about to drop the column `challenge_id` on the `user_progress` table. All the data in the column will be lost.
  - You are about to drop the `achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `challenges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tournament_matches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tournaments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_achievements` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `activity_id` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answers` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtopic_id` to the `user_progress` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('QUIZ', 'QUESTION', 'EXERCISE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_matches" DROP CONSTRAINT "tournament_matches_player1_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_matches" DROP CONSTRAINT "tournament_matches_player2_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_matches" DROP CONSTRAINT "tournament_matches_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_matches" DROP CONSTRAINT "tournament_matches_winner_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_challenge_id_fkey";

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "challenge_id",
DROP COLUMN "code",
DROP COLUMN "created_at",
DROP COLUMN "execution_time",
DROP COLUMN "status",
ADD COLUMN     "activity_id" TEXT NOT NULL,
ADD COLUMN     "answers" JSONB NOT NULL,
ADD COLUMN     "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "feedback" TEXT,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_pkey",
DROP COLUMN "attempts_count",
DROP COLUMN "best_score",
DROP COLUMN "challenge_id",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "subtopic_id" TEXT NOT NULL,
ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id", "subtopic_id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- DropTable
DROP TABLE "achievements";

-- DropTable
DROP TABLE "challenges";

-- DropTable
DROP TABLE "tournament_matches";

-- DropTable
DROP TABLE "tournaments";

-- DropTable
DROP TABLE "user_achievements";

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopics" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "subtopic_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BASIC',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
