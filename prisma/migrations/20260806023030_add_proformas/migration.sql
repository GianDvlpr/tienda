-- CreateTable
CREATE TABLE "proforma_header" (
    "proforma_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_phone" VARCHAR(30) NOT NULL,
    "customer_email" VARCHAR(200),
    "subtotal" DECIMAL(18,2) NOT NULL,
    "shipping_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "sales_channel" VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP',
    "notes" TEXT,
    "converted_to_order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_proforma_header" PRIMARY KEY ("proforma_id")
);

-- CreateTable
CREATE TABLE "proforma_item" (
    "proforma_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proforma_id" UUID NOT NULL,
    "variant_id" UUID,
    "product_name" VARCHAR(250) NOT NULL,
    "variant_size" VARCHAR(50),
    "variant_color" VARCHAR(80),
    "sku" VARCHAR(80),
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    "image_url" VARCHAR(500),
    "is_customized" BOOLEAN NOT NULL DEFAULT false,
    "custom_measurements_json" TEXT,
    "surcharge_type" VARCHAR(20),
    "surcharge_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "customization_group_id" VARCHAR(80),
    "customization_group_label" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_proforma_item" PRIMARY KEY ("proforma_item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UX_proforma_code" ON "proforma_header"("code");

-- CreateIndex
CREATE INDEX "IX_proforma_status_created" ON "proforma_header"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_proforma_customer_created" ON "proforma_header"("customer_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_proforma_converted_order" ON "proforma_header"("converted_to_order_id");

-- CreateIndex
CREATE INDEX "IX_proforma_item_header" ON "proforma_item"("proforma_id");

-- CreateIndex
CREATE INDEX "IX_proforma_item_variant" ON "proforma_item"("variant_id");

-- AddForeignKey
ALTER TABLE "proforma_header" ADD CONSTRAINT "FK_proforma_order" FOREIGN KEY ("converted_to_order_id") REFERENCES "order_header"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proforma_item" ADD CONSTRAINT "FK_proforma_item_header" FOREIGN KEY ("proforma_id") REFERENCES "proforma_header"("proforma_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proforma_item" ADD CONSTRAINT "FK_proforma_item_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("variant_id") ON DELETE SET NULL ON UPDATE NO ACTION;
