import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(10),
        qty: z.number().int().min(1),
      })
    )
    .min(1),

  customerName: z.string().min(3),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),

  shippingName: z.string().min(3),
  shippingPhone: z.string().min(7),
  shippingAddress: z.string().min(8),
  shippingCity: z.string().optional().nullable(),
  shippingReference: z.string().optional().nullable(),

  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(['YAPE', 'PLIN', 'TRANSFER']).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const b = parsed.data;

    const itemsJson = JSON.stringify(
      b.items.map((x) => ({ variantId: x.variantId, qty: x.qty }))
    );

    const shippingCost = 0;
    const discountTotal = 0;

    // ✅ SQL Server + Prisma: usa $queryRaw con template literal
    const rows = await prisma.$queryRaw<any[]>`
      DECLARE @order_code NVARCHAR(30);
      DECLARE @order_id UNIQUEIDENTIFIER;

      EXEC dbo.USP_SHOP_CREATE_ORDER
        @items_json         = ${itemsJson},
        @customer_name      = ${b.customerName},
        @customer_phone     = ${b.customerPhone ?? null},
        @customer_email     = ${b.customerEmail ?? null},
        @shipping_name      = ${b.shippingName},
        @shipping_phone     = ${b.shippingPhone},
        @shipping_address   = ${b.shippingAddress},
        @shipping_city      = ${b.shippingCity ?? null},
        @shipping_reference = ${b.shippingReference ?? null},
        @notes              = ${b.notes ?? null},
        @payment_method     = ${b.paymentMethod ?? 'YAPE'},
        @shipping_cost      = ${shippingCost},
        @discount_total     = ${discountTotal},
        @order_code         = @order_code OUTPUT,
        @order_id           = @order_id OUTPUT;

      SELECT
        CONVERT(VARCHAR(36), @order_id) AS orderId,
        @order_code AS code;
    `;

    const out = rows?.[0] as any;
    if (!out?.orderId || !out?.code) {
      return NextResponse.json(
        { error: 'SP did not return order data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: out.orderId, code: out.code }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Checkout failed' }, { status: 500 });
  }
}