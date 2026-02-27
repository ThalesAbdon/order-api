import { z } from 'zod'

export const OrderItemSchema = z.object({
  productId: z.string().uuid('Invalid productId format'),
  quantity:  z.number().int().min(1, 'Quantity must be at least 1'),
})

export const CreateOrderSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  items:  z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
})

export type OrderItemInput    = z.infer<typeof OrderItemSchema>
export type CreateOrderInput  = z.infer<typeof CreateOrderSchema>