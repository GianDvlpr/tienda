import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log("--- BUNDLES ---");
        const bundles = await (prisma as any).bundle_promotion.findMany({
            include: { items: true }
        });
        console.log(JSON.stringify(bundles, null, 2));

        console.log("\n--- PRODUCTS ---");
        const products = await prisma.product.findMany({
            select: { product_id: true, name: true }
        });
        console.log(JSON.stringify(products, null, 2));

        console.log("\n--- VARIANTS ---");
        const variants = await prisma.product_variant.findMany({
            select: { variant_id: true, product_id: true, sku: true }
        });
        console.log(JSON.stringify(variants, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
