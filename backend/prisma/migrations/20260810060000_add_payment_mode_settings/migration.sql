-- CreateTable
CREATE TABLE "payment_mode_settings" (
    "payment_mode" "PaymentMode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_mode_settings_pkey" PRIMARY KEY ("payment_mode")
);

-- Seed: only CASH enabled by default
INSERT INTO "payment_mode_settings" ("payment_mode", "enabled", "updated_at")
VALUES ('CASH', true, CURRENT_TIMESTAMP), ('UPI', false, CURRENT_TIMESTAMP);
