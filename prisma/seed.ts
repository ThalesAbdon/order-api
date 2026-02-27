import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()

  const alice = await prisma.user.create({
    data: { name: 'Alice Silva', email: 'alice@example.com' },
  })

  const bob = await prisma.user.create({
    data: { name: 'Bob Souza', email: 'bob@example.com' },
  })

  console.log('✅ Users created')

  const notebook = await prisma.product.create({
    data: { name: 'Notebook Pro', price: 3500.0, stock: 10 },
  })

  const mouse = await prisma.product.create({
    data: { name: 'Mouse Wireless', price: 150.0, stock: 25 },
  })

  const teclado = await prisma.product.create({
    data: { name: 'Teclado Mecânico', price: 450.0, stock: 5 },
  })

  console.log('✅ Products created')

  await prisma.order.create({
    data: {
      userId: alice.id,
      total: 3650.0,
      orderItems: {
        create: [
          { productId: notebook.id, quantity: 1, price: 3500.0 },
          { productId: mouse.id,    quantity: 1, price: 150.0  },
        ],
      },
    },
  })

  await prisma.order.create({
    data: {
      userId: bob.id,
      total: 750.0,
      orderItems: {
        create: [
          { productId: mouse.id,   quantity: 2, price: 150.0 },
          { productId: teclado.id, quantity: 1, price: 450.0 },
        ],
      },
    },
  })

  console.log('✅ Orders created')
  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())