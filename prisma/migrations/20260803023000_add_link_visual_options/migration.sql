-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "theme" VARCHAR(30) NOT NULL DEFAULT 'BOUTIQUE';

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "background_image_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "background_color" VARCHAR(20);

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "enable_animations" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "link_page_item" ADD COLUMN "featured_image_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "link_page_item" ADD COLUMN "background_color" VARCHAR(20);

-- AlterTable
ALTER TABLE "link_page_item" ADD COLUMN "text_color" VARCHAR(20);
