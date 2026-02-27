import { z } from 'zod'

export const CreateProductSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  price: z.number().positive('Price must be greater than zero'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>

export const FindProductsSchema = z.object({
  onlyAvailable: z.boolean().optional(),
})

export type FindProductsInput = z.infer<typeof FindProductsSchema>