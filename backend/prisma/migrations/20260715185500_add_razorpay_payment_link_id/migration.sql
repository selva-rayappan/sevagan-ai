-- AlterTable
ALTER TABLE "payments" ADD COLUMN "razorpay_payment_link_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_link_id_key" ON "payments"("razorpay_payment_link_id");
