-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "button_style" VARCHAR(30) NOT NULL DEFAULT 'ROUNDED';

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "og_title" VARCHAR(120);

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "og_description" VARCHAR(250);

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "og_image_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "link_page_item" ADD COLUMN "availability_status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
