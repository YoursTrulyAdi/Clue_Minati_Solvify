-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "penalties" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TargetClue" (
    "id" SERIAL NOT NULL,
    "clueText" TEXT NOT NULL,
    "resourceUrl" TEXT,
    "mappedLocation" TEXT NOT NULL,

    CONSTRAINT "TargetClue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TargetClue_mappedLocation_key" ON "TargetClue"("mappedLocation");
