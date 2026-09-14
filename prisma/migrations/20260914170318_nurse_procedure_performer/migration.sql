-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EntitlementOverride" DROP CONSTRAINT "EntitlementOverride_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "MedicationFavorite" DROP CONSTRAINT "MedicationFavorite_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "MedicationFavorite" DROP CONSTRAINT "MedicationFavorite_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "PatientAllergy" DROP CONSTRAINT "PatientAllergy_patient_fkey";

-- DropForeignKey
ALTER TABLE "PrescriptionItem" DROP CONSTRAINT "PrescriptionItem_prescriptionId_fkey";

-- DropForeignKey
ALTER TABLE "PrescriptionTemplate" DROP CONSTRAINT "PrescriptionTemplate_createdById_fkey";

-- DropForeignKey
ALTER TABLE "PrescriptionTemplate" DROP CONSTRAINT "PrescriptionTemplate_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_webhookId_fkey";

-- DropIndex
DROP INDEX "appointment_active_slot_unique";

-- DropIndex
DROP INDEX "Notification_digest_recipient_key";

-- DropIndex
DROP INDEX "User_organizationId_branchId_idx";

-- DropIndex
DROP INDEX "User_organizationId_roomId_idx";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "checkedInAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "checkedOutAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EntitlementOverride" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Equipment" ALTER COLUMN "status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LabResult" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PatientAllergy" ALTER COLUMN "onset" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "downgradeTargetIdsJson" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProcedureOrder" ADD COLUMN     "performedByRole" TEXT,
ADD COLUMN     "performedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "PatientAllergy" RENAME CONSTRAINT "PatientAllergy_organization_fkey" TO "PatientAllergy_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementOverride" ADD CONSTRAINT "EntitlementOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationFavorite" ADD CONSTRAINT "MedicationFavorite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationFavorite" ADD CONSTRAINT "MedicationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PatientAllergy_organization_patient_idx" RENAME TO "PatientAllergy_organizationId_patientId_idx";
