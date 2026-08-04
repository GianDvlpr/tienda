ALTER TABLE "order_header"
ADD COLUMN "amount_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "balance_due" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "order_header"
SET
    "amount_paid" = CASE
        WHEN "status" = 'PENDING_WS' THEN 0
        ELSE "total"
    END,
    "balance_due" = CASE
        WHEN "status" = 'PENDING_WS' THEN "total"
        ELSE 0
    END;
