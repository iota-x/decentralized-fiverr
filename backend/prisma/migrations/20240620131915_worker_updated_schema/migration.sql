/*
  Warnings:

  - You are about to drop the column `balance_id` on the `Worker` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Worker` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Worker` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[address]` on the table `Worker` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Worker_email_key";

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "balance_id",
DROP COLUMN "email",
DROP COLUMN "name",
ADD COLUMN     "address" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Worker_address_key" ON "Worker"("address");
