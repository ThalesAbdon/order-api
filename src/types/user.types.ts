import { z } from 'zod'

export const CreateUserSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>