import { prisma } from '../src/lib/prisma'; // Corrección relativa al archivo 
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const lastOrder = await prisma.order_header.findFirst({
            orderBy: { created_at: 'desc' },
            select: {
                code: true,
                subtotal: true,
                discount_total: true,
                bundle_discount: true,
                coupon_discount: true,
                coupon_code: true,
                total: true
            }
        });
        console.log(JSON.stringify(lastOrder, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
