import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { logger } from '../utils/logger';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderInput {
  userId: string;
  items: OrderItemInput[];
}

export const orderService = {
  async findAll() {
    return prisma.order.findMany({
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundError('Order', id);
    return order;
  },

  async create(input: CreateOrderInput) {
    const { userId, items } = input;

    if (!userId) throw new ValidationError('userId is required.');
    if (!items?.length) throw new ValidationError('Order must contain at least one item.');

    for (const item of items) {
      if (!item.productId) throw new ValidationError('Each item must have a productId.');
      if (!item.quantity || item.quantity < 1)
        throw new ValidationError(`Quantity for product "${item.productId}" must be at least 1.`);
    }

    const merged = new Map<string, number>();
    for (const item of items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }

    const order = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User', userId);

        const productIds = [...merged.keys()];

        const lockedProducts = await tx.$queryRaw<
          Array<{ id: string; price: Prisma.Decimal; stock: number }>
        >`
          SELECT id, price, stock
          FROM products
          WHERE id = ANY(${productIds}::uuid[])
          FOR UPDATE
        `;

        if (lockedProducts.length !== productIds.length) {
          const foundIds = lockedProducts.map((p) => p.id);
          const missing = productIds.find((id) => !foundIds.includes(id));
          throw new NotFoundError('Product', missing!);
        }

        let total = new Prisma.Decimal(0);
        const itemsToCreate: Prisma.OrderItemCreateManyOrderInput[] = [];

        for (const product of lockedProducts) {
          const requested = merged.get(product.id)!;
          if (product.stock < requested) {
            throw new InsufficientStockError(product.id, product.stock, requested);
          }

          const itemTotal = product.price.mul(requested);
          total = total.add(itemTotal);

          itemsToCreate.push({
            productId: product.id,
            quantity:  requested,
            price:     product.price,
          });
        }

        for (const product of lockedProducts) {
          await tx.product.update({
            where: { id: product.id },
            data:  { stock: { decrement: merged.get(product.id)! } },
          });
        }

        const created = await tx.order.create({
          data: {
            userId,
            total,
            orderItems: { createMany: { data: itemsToCreate } },
          },
          include: {
            user:       true,
            orderItems: { include: { product: true } },
          },
        });

        return created;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10_000, 
      }
    );

    logger.info('Order created', {
      orderId: order.id,
      userId,
      total:   order.total.toString(),
      items:   items.length,
    });

    return order;
  },
};
