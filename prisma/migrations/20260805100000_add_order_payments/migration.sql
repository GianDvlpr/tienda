-- CreateTable: order_payment history (supports multiple partial payments per order)
CREATE TABLE "order_payment" (
    "payment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(120),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_order_payment" PRIMARY KEY ("payment_id")
);

-- Indexes
CREATE INDEX "IX_order_payment_order_created" ON "order_payment" ("order_id", "created_at" DESC);

-- ForeignKey: order_payment -> order_header (Cascade on delete)
ALTER TABLE "order_payment"
    ADD CONSTRAINT "FK_order_payment_order"
    FOREIGN KEY ("order_id") REFERENCES "order_header" ("order_id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- Backfill: migrate existing amount_paid into one payment row per order
-- (preserves original payment_method/payment_reference as historical record)
INSERT INTO "order_payment" ("order_id", "amount", "method", "reference", "created_at")
SELECT
    "order_id",
    "amount_paid",
    COALESCE(NULLIF("payment_method", ''), 'OTHER'),
    "payment_reference",
    COALESCE("paid_at", "created_at")
FROM "order_header"
WHERE "amount_paid" > 0;