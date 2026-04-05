import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando limpieza de datos de prueba ---');

  // 1. Stock reservations
  const resCount = await prisma.stock_reservation.deleteMany({});
  console.log(`- Reservas de stock eliminadas: ${resCount.count}`);

  // 2. Inventory movements associated with orders (ignore production ones)
  const movCount = await prisma.inventory_movement.deleteMany({
    where: {
      OR: [
        { order_id: { not: null } },
        { order_item_id: { not: null } }
      ]
    }
  });
  console.log(`- Movimientos de inventario eliminados: ${movCount.count}`);

  // 3. Order items
  const itemCount = await prisma.order_item.deleteMany({});
  console.log(`- Detalles de pedidos eliminados: ${itemCount.count}`);

  // 4. Order headers
  const orderCount = await prisma.order_header.deleteMany({});
  console.log(`- Encabezados de pedidos eliminados: ${orderCount.count}`);

  // 5. Customers (delete all, since they are tests)
  const custCount = await prisma.customer.deleteMany({});
  console.log(`- Clientes eliminados: ${custCount.count}`);

  console.log('--- Limpieza completada con éxito ---');
}

main()
  .catch(e => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
