-- CreateTable
CREATE TABLE "TeamStageTime" (
    "id" SERIAL NOT NULL,
    "teamName" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamStageTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamStageTime_recordedAt_idx" ON "TeamStageTime"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStageTime_teamName_stage_key" ON "TeamStageTime"("teamName", "stage");

-- AddForeignKey
ALTER TABLE "TeamStageTime" ADD CONSTRAINT "TeamStageTime_teamName_fkey" FOREIGN KEY ("teamName") REFERENCES "Team"("name") ON DELETE CASCADE ON UPDATE CASCADE;
