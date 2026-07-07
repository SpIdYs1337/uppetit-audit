/*
  Warnings:

  - You are about to drop the column `isPhotoRequired` on the `ChecklistItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChecklistItem" DROP COLUMN "isPhotoRequired",
ADD COLUMN     "photoRequirement" TEXT NOT NULL DEFAULT 'OPTIONAL';
