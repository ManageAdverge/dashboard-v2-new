/*
  Warnings:

  - The `selectedGoogleAdsAccountId` column on the `GlobalSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "GlobalSettings" DROP COLUMN "selectedGoogleAdsAccountId",
ADD COLUMN     "selectedGoogleAdsAccountId" TEXT[];
