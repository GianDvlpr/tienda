const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const variants = await prisma.product_variant.findMany({
        where: { is_active: true, stock: { gt: 0 } },
        include: { product: { select: { name: true, base_price: true } } },
        take: 5,
    });
    console.log(JSON.stringify(variants.map(v => ({
        variant_id: v.variant_id,
        product_name: v.product.name,
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: v.price ? Number(v.price) : null,
        base_price: v.product.base_price ? Number(v.product.base_price) : null,
        stock: v.stock,
    })), null, 2));
}

main().finally(() => prisma.$disconnect());