import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order_header.findMany({
    take: 50,
    orderBy: { created_at: 'desc' },
    select: {
      order_id: true,
      code: true,
      status: true,
      shipping_name: true,
      shipping_phone: true,
      total: true,
      created_at: true,
    }
  });

  console.log(JSON.stringify(orders, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
