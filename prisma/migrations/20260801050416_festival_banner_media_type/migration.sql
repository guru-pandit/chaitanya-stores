/*
  Warnings:

  - You are about to drop the column `imagePath` on the `FestivalBanner` table. All the data in the column will be lost.
  - Added the required column `mediaPath` to the `FestivalBanner` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FestivalBannerMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "FestivalBanner" DROP COLUMN "imagePath",
ADD COLUMN     "mediaPath" TEXT NOT NULL,
ADD COLUMN     "mediaType" "FestivalBannerMediaType" NOT NULL DEFAULT 'IMAGE';
