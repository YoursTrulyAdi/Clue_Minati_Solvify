-- CreateTable
CREATE TABLE "Team" (
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "questionRoute" TEXT NOT NULL,
    "members" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
