-- CreateTable
CREATE TABLE "FestivalBanner" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalBanner_pkey" PRIMARY KEY ("id")
);
