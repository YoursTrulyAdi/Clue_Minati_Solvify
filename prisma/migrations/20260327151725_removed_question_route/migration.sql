/*
  Warnings:

  - You are about to drop the column `questionRoute` on the `Team` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "questionRoute",
ADD COLUMN     "usedQuestions" INTEGER[];

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "stops" TEXT[],

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
