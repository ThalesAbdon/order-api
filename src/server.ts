import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { typeDefs } from './graphql/schema/typeDefs'
import { resolvers } from './graphql/resolvers'
import { logger } from './utils/logger'
import prisma from './db/prisma'

async function bootstrap() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (formattedError) => {
      logger.error('GraphQL error', { message: formattedError.message })
      return {
        message: formattedError.message,
        extensions: { code: formattedError.extensions?.code },
      }
    },
  })

  const port = parseInt(process.env.PORT ?? '4000')
  const { url } = await startStandaloneServer(server, { listen: { port } })

  logger.info(`Server ready at ${url}`)
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: String(err) })
  prisma.$disconnect()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})