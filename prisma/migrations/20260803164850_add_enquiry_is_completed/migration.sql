-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Enquiry_isCompleted_idx" ON "Enquiry"("isCompleted");
