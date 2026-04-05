import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.$queryRaw<any[]>`SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.USP_SHOP_LIST_PRODUCTS')) AS [Definition]`;
    console.log(res?.[0]?.Definition);
}

main().finally(() => prisma.$disconnect());
