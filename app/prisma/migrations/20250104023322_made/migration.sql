/*
  Warnings:

  - You are about to drop the column `allowsSignup` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "allowsSignup";
