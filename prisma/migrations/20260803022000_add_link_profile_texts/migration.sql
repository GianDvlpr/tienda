-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "logo_text" VARCHAR(80) NOT NULL DEFAULT 'Aura';

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "eyebrow_text" VARCHAR(80) NOT NULL DEFAULT 'Links oficiales';

-- AlterTable
ALTER TABLE "link_page_settings" ADD COLUMN "footer_text" VARCHAR(120) NOT NULL DEFAULT 'Aura Boutique';
