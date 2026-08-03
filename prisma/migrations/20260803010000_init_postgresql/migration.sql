-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "Healthcheck" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Healthcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "collection_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_collection" PRIMARY KEY ("collection_id")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_customer" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "movement_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "movement_type" VARCHAR(20) NOT NULL,
    "qty" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reason" VARCHAR(250),
    "order_id" UUID,
    "order_item_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_inventory_movement" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "order_header" (
    "order_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "customer_id" UUID,
    "shipping_name" VARCHAR(200) NOT NULL,
    "shipping_dni" VARCHAR(20),
    "shipping_phone" VARCHAR(30) NOT NULL,
    "shipping_address" VARCHAR(500) NOT NULL,
    "shipping_city" VARCHAR(120),
    "shipping_reference" VARCHAR(250),
    "notes" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "shipping_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bundle_discount" DECIMAL(18,2) DEFAULT 0,
    "coupon_discount" DECIMAL(18,2) DEFAULT 0,
    "coupon_code" VARCHAR(50),
    "total" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "payment_method" VARCHAR(30),
    "payment_reference" VARCHAR(120),
    "sales_channel" VARCHAR(30) NOT NULL DEFAULT 'SHOP',
    "external_reference" VARCHAR(200),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_order_header" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "order_photo" (
    "photo_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "public_id" VARCHAR(300),
    "caption" VARCHAR(250),
    "is_public_tracking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_order_photo" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "order_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    "product_name" VARCHAR(250) NOT NULL,
    "variant_size" VARCHAR(50) NOT NULL,
    "variant_color" VARCHAR(80) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "image_url" VARCHAR(500),
    "is_customized" BOOLEAN NOT NULL DEFAULT false,
    "custom_measurements_json" TEXT,
    "customization_surcharge" DECIMAL(18,2) DEFAULT 0,
    "customization_group_id" VARCHAR(80),
    "customization_group_label" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_order_item" PRIMARY KEY ("order_item_id")
);

-- CreateTable
CREATE TABLE "product" (
    "product_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_price" DECIMAL(18,2),
    "base_cost" DECIMAL(18,2),
    "size_guide_url" VARCHAR(500),
    "size_guide_json" TEXT,
    "is_customizable" BOOLEAN NOT NULL DEFAULT false,
    "customization_type" VARCHAR(30),
    "customization_surcharge" DECIMAL(18,2) NOT NULL DEFAULT 5,
    "custom_fabric_supply_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_product" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "product_collection" (
    "product_id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_product_collection" PRIMARY KEY ("product_id","collection_id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "image_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "public_id" VARCHAR(300) NOT NULL,
    "color" VARCHAR(80),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_product_image" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "variant_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "color" VARCHAR(80) NOT NULL,
    "price" DECIMAL(18,2),
    "cost" DECIMAL(18,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_product_variant" PRIMARY KEY ("variant_id")
);

-- CreateTable
CREATE TABLE "stock_reservation" (
    "reservation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "order_id" UUID,
    "qty" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "PK_stock_reservation" PRIMARY KEY ("reservation_id")
);

-- CreateTable
CREATE TABLE "hero_slide" (
    "slide_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_url" VARCHAR(500) NOT NULL,
    "title" VARCHAR(100),
    "subtitle" VARCHAR(100),
    "button_text" VARCHAR(50),
    "link_url" VARCHAR(300),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_hero_slide" PRIMARY KEY ("slide_id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_admin_user" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "complaint" (
    "complaint_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_number" SERIAL NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,
    "document_number" VARCHAR(20) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "parent_full_name" VARCHAR(200),
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,2),
    "description" TEXT NOT NULL,
    "claim_type" VARCHAR(20) NOT NULL,
    "claim_detail" TEXT NOT NULL,
    "consumer_request" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_complaint" PRIMARY KEY ("complaint_id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "coupon_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DECIMAL(18,2) NOT NULL,
    "min_purchase" DECIMAL(18,2),
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("coupon_id")
);

-- CreateTable
CREATE TABLE "supply" (
    "supply_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL,
    "stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_pkey" PRIMARY KEY ("supply_id")
);

-- CreateTable
CREATE TABLE "custom_color" (
    "color_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "hex" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_color_pkey" PRIMARY KEY ("color_id")
);

-- CreateTable
CREATE TABLE "supply_color_stock" (
    "supply_color_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supply_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,
    "stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_cost_override" DECIMAL(18,4),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_color_stock_pkey" PRIMARY KEY ("supply_color_id")
);

-- CreateTable
CREATE TABLE "service" (
    "service_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "unit_cost" DECIMAL(18,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "product_bom_supply" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "size" VARCHAR(50),
    "quantity" DECIMAL(18,4) NOT NULL,
    "varies_by_color" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_bom_supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bom_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit_cost_override" DECIMAL(18,2),

    CONSTRAINT "product_bom_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_lot" (
    "lot_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "product_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "total_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_lot_pkey" PRIMARY KEY ("lot_id")
);

-- CreateTable
CREATE TABLE "production_lot_item" (
    "item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "color" VARCHAR(80) NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "production_lot_item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "production_lot_consumption" (
    "consump_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "color" VARCHAR(80),
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "production_lot_consumption_pkey" PRIMARY KEY ("consump_id")
);

-- CreateTable
CREATE TABLE "supply_movement" (
    "movement_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supply_id" UUID NOT NULL,
    "movement_type" VARCHAR(20) NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "stock_before" DECIMAL(18,4) NOT NULL,
    "stock_after" DECIMAL(18,4) NOT NULL,
    "reason" VARCHAR(250),
    "lot_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_movement_pkey" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "old_values" TEXT,
    "new_values" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "analytics_session" (
    "session_id" VARCHAR(64) NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landing_path" VARCHAR(500),
    "referrer" VARCHAR(1000),
    "utm_source" VARCHAR(120),
    "utm_medium" VARCHAR(120),
    "utm_campaign" VARCHAR(180),
    "country" VARCHAR(80),
    "city" VARCHAR(120),
    "device_type" VARCHAR(30),
    "browser" VARCHAR(80),
    "os" VARCHAR(80),

    CONSTRAINT "PK_analytics_session" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "analytics_event" (
    "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(64) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "product_id" UUID,
    "product_slug" VARCHAR(180),
    "product_name" VARCHAR(250),
    "bundle_id" UUID,
    "bundle_name" VARCHAR(200),
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_analytics_event" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "bundle_promotion" (
    "bundle_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "discount_amount" DECIMAL(18,2) NOT NULL,
    "bundle_price" DECIMAL(18,2),
    "tier_2_price" DECIMAL(18,2),
    "tier_3_price" DECIMAL(18,2),
    "customization_surcharge" DECIMAL(18,2) NOT NULL DEFAULT 8,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_promotion_pkey" PRIMARY KEY ("bundle_id")
);

-- CreateTable
CREATE TABLE "bundle_promotion_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bundle_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "bundle_promotion_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UX_collection_slug" ON "collection"("slug");

-- CreateIndex
CREATE INDEX "IX_collection_active" ON "collection"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_collection_active_slug" ON "collection"("is_active", "slug");

-- CreateIndex
CREATE INDEX "IX_customer_email" ON "customer"("email");

-- CreateIndex
CREATE INDEX "IX_customer_phone" ON "customer"("phone");

-- CreateIndex
CREATE INDEX "IX_inventory_order_created" ON "inventory_movement"("order_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_inventory_variant_created" ON "inventory_movement"("variant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UX_order_code" ON "order_header"("code");

-- CreateIndex
CREATE INDEX "IX_order_customer" ON "order_header"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_order_sales_channel_created" ON "order_header"("sales_channel", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_order_status_created" ON "order_header"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_order_photo_order_created" ON "order_photo"("order_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_order_photo_tracking" ON "order_photo"("order_id", "is_public_tracking", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_order_item_order" ON "order_item"("order_id");

-- CreateIndex
CREATE INDEX "IX_order_item_variant" ON "order_item"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "UX_product_slug" ON "product"("slug");

-- CreateIndex
CREATE INDEX "IX_product_active" ON "product"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_pc_collection" ON "product_collection"("collection_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_pc_product" ON "product_collection"("product_id", "collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "UX_image_public_id" ON "product_image"("public_id");

-- CreateIndex
CREATE INDEX "IX_image_product" ON "product_image"("product_id", "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_image_product_color" ON "product_image"("product_id", "color", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "UX_variant_sku" ON "product_variant"("sku");

-- CreateIndex
CREATE INDEX "IX_variant_filter" ON "product_variant"("product_id", "is_active", "size", "color");

-- CreateIndex
CREATE INDEX "IX_variant_product" ON "product_variant"("product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "UX_variant_product_size_color" ON "product_variant"("product_id", "size", "color");

-- CreateIndex
CREATE INDEX "IX_reservation_order" ON "stock_reservation"("order_id");

-- CreateIndex
CREATE INDEX "IX_reservation_variant_status" ON "stock_reservation"("variant_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "IX_hero_slide_active_order" ON "hero_slide"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "UX_admin_username" ON "admin_user"("username");

-- CreateIndex
CREATE INDEX "IX_admin_active" ON "admin_user"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_complaint_number" ON "complaint"("complaint_number");

-- CreateIndex
CREATE INDEX "IX_complaint_created" ON "complaint"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UX_coupon_code" ON "coupon"("code");

-- CreateIndex
CREATE INDEX "coupon_code_is_active_idx" ON "coupon"("code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_color_name_key" ON "custom_color"("name");

-- CreateIndex
CREATE INDEX "custom_color_is_active_sort_order_idx" ON "custom_color"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "supply_color_stock_color_id_idx" ON "supply_color_stock"("color_id");

-- CreateIndex
CREATE UNIQUE INDEX "supply_color_stock_supply_id_color_id_key" ON "supply_color_stock"("supply_id", "color_id");

-- CreateIndex
CREATE INDEX "product_bom_supply_product_id_idx" ON "product_bom_supply"("product_id");

-- CreateIndex
CREATE INDEX "product_bom_service_product_id_idx" ON "product_bom_service"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_lot_code_key" ON "production_lot"("code");

-- CreateIndex
CREATE INDEX "supply_movement_supply_id_created_at_idx" ON "supply_movement"("supply_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_session_last_seen" ON "analytics_session"("last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_session_utm_source" ON "analytics_session"("utm_source", "first_seen_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_event_type_created" ON "analytics_event"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_event_product" ON "analytics_event"("product_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_event_bundle" ON "analytics_event"("bundle_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "IX_analytics_event_path" ON "analytics_event"("path", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bundle_promotion_item_bundle_id_product_id_key" ON "bundle_promotion_item"("bundle_id", "product_id");

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_movement_order" FOREIGN KEY ("order_id") REFERENCES "order_header"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_movement_order_item" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("order_item_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_movement_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("variant_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_header" ADD CONSTRAINT "FK_order_customer" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_photo" ADD CONSTRAINT "FK_order_photo_order" FOREIGN KEY ("order_id") REFERENCES "order_header"("order_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "FK_item_order" FOREIGN KEY ("order_id") REFERENCES "order_header"("order_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "FK_item_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("variant_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_collection" ADD CONSTRAINT "FK_pc_collection" FOREIGN KEY ("collection_id") REFERENCES "collection"("collection_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_collection" ADD CONSTRAINT "FK_pc_product" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "FK_image_product" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "FK_variant_product" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "FK_reservation_order" FOREIGN KEY ("order_id") REFERENCES "order_header"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "FK_reservation_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("variant_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply_color_stock" ADD CONSTRAINT "supply_color_stock_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supply"("supply_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_color_stock" ADD CONSTRAINT "supply_color_stock_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "custom_color"("color_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_supply" ADD CONSTRAINT "product_bom_supply_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_supply" ADD CONSTRAINT "product_bom_supply_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supply"("supply_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_service" ADD CONSTRAINT "product_bom_service_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_service" ADD CONSTRAINT "product_bom_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service"("service_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_lot" ADD CONSTRAINT "production_lot_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_lot_item" ADD CONSTRAINT "production_lot_item_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "production_lot"("lot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_lot_consumption" ADD CONSTRAINT "production_lot_consumption_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "production_lot"("lot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_movement" ADD CONSTRAINT "supply_movement_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supply"("supply_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_movement" ADD CONSTRAINT "supply_movement_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "production_lot"("lot_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "FK_audit_user" FOREIGN KEY ("user_id") REFERENCES "admin_user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "analytics_event" ADD CONSTRAINT "FK_analytics_event_session" FOREIGN KEY ("session_id") REFERENCES "analytics_session"("session_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bundle_promotion_item" ADD CONSTRAINT "bundle_promotion_item_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundle_promotion"("bundle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_promotion_item" ADD CONSTRAINT "bundle_promotion_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

