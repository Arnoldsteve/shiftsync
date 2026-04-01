-- AlterTable
ALTER TABLE "DropRequest" ADD COLUMN     "reason" TEXT;

-- AddForeignKey
ALTER TABLE "DropRequest" ADD CONSTRAINT "DropRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropRequest" ADD CONSTRAINT "DropRequest_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
