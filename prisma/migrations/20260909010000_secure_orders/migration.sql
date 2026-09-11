BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE "order_header" ADD COLUMN "tracking_token" VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');
CREATE UNIQUE INDEX "order_header_tracking_token_key" ON "order_header"("tracking_token");
ALTER TABLE "admin_user" ADD COLUMN "session_version" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "order_item" ADD COLUMN "stock_deducted" BOOLEAN NOT NULL DEFAULT false;
-- Legacy normal lines were deducted in all sales paths. Custom lines were deducted
-- only in administrative flows, where an OUT movement is recorded.
UPDATE "order_item" i SET "stock_deducted" = (NOT i."is_customized" OR EXISTS (
  SELECT 1 FROM "inventory_movement" m WHERE m."order_item_id" = i."order_item_id" AND m."movement_type" = 'OUT'
));
CREATE TABLE "checkout_attempt" (
  "checkout_id" UUID PRIMARY KEY, "request_hash" VARCHAR(64) NOT NULL,
  "token_hash" VARCHAR(64), "status" VARCHAR(20) NOT NULL,
  "order_id" UUID NOT NULL, "charge_id" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_attempt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order_header"("order_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "checkout_attempt_token_hash_key" ON "checkout_attempt"("token_hash");
CREATE UNIQUE INDEX "checkout_attempt_order_id_key" ON "checkout_attempt"("order_id");
CREATE UNIQUE INDEX "checkout_attempt_charge_id_key" ON "checkout_attempt"("charge_id");
-- Preserve previously recorded header amounts without inventing a verified charge.
INSERT INTO "order_payment" ("payment_id", "order_id", "amount", "method", "reference", "notes", "created_at")
SELECT gen_random_uuid(), o."order_id", o."amount_paid" - COALESCE(p.paid, 0),
  'OTHER', NULL, 'Migración: saldo histórico de cabecera; requiere conciliación, no acredita cobro verificado', CURRENT_TIMESTAMP
FROM "order_header" o LEFT JOIN (
  SELECT "order_id", SUM("amount") AS paid FROM "order_payment" GROUP BY "order_id"
) p ON p."order_id" = o."order_id" WHERE o."amount_paid" > COALESCE(p.paid, 0);
UPDATE "order_header" o SET
  "amount_paid" = COALESCE(p.paid, 0),
  "balance_due" = GREATEST(0, o."total" - COALESCE(p.paid, 0)),
  "paid_at" = CASE WHEN COALESCE(p.paid, 0) >= o."total" AND COALESCE(p.paid, 0) > 0 THEN o."paid_at" ELSE NULL END
FROM (SELECT h."order_id", SUM(p."amount") AS paid FROM "order_header" h
LEFT JOIN "order_payment" p ON p."order_id" = h."order_id" GROUP BY h."order_id") p
WHERE p."order_id" = o."order_id";
COMMIT;
