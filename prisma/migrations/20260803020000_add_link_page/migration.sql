-- CreateTable
CREATE TABLE "link_page_settings" (
    "settings_key" VARCHAR(30) NOT NULL DEFAULT 'main',
    "title" VARCHAR(120) NOT NULL DEFAULT 'Aura Boutique',
    "subtitle" VARCHAR(250),
    "avatar_url" VARCHAR(500),
    "announcement" VARCHAR(300),
    "announcement_url" VARCHAR(500),
    "is_announcement_active" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_page_settings_pkey" PRIMARY KEY ("settings_key")
);

-- CreateTable
CREATE TABLE "link_page_item" (
    "link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(250),
    "url" VARCHAR(500) NOT NULL,
    "link_type" VARCHAR(40) NOT NULL DEFAULT 'CUSTOM',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_page_item_pkey" PRIMARY KEY ("link_id")
);

-- CreateIndex
CREATE INDEX "IX_link_page_item_active_order" ON "link_page_item"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "IX_link_page_item_order" ON "link_page_item"("sort_order", "created_at" DESC);

-- Seed default content
INSERT INTO "link_page_settings" ("settings_key", "title", "subtitle", "announcement", "announcement_url", "is_announcement_active")
VALUES ('main', 'Aura Boutique', 'Moda femenina exclusiva con envios a todo el Peru', 'Nuevo catalogo disponible', '/shop', true)
ON CONFLICT ("settings_key") DO NOTHING;

INSERT INTO "link_page_item" ("title", "description", "url", "link_type", "sort_order", "is_featured", "is_active")
VALUES
    ('Ver catalogo', 'Explora prendas disponibles y nuevos ingresos', '/shop', 'CATALOG', 10, true, true),
    ('WhatsApp', 'Escribenos para consultas y pedidos', 'https://wa.me/', 'WHATSAPP', 20, false, true),
    ('Instagram', 'Novedades, outfits e inspiracion', 'https://instagram.com/', 'INSTAGRAM', 30, false, true)
ON CONFLICT DO NOTHING;
