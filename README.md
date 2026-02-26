# 🛒 Order API — GraphQL

API GraphQL para gerenciamento de pedidos, construída com Node.js, TypeScript, Apollo Server e PostgreSQL.

---

## Stack

| Camada       | Tecnologia                      |
|--------------|---------------------------------|
| Runtime      | Node.js 20                      |
| Linguagem    | TypeScript 5                    |
| GraphQL      | Apollo Server 4                 |
| ORM          | Prisma 5                        |
| Banco        | PostgreSQL 16                   |
| Testes       | Jest + ts-jest                  |
| Logs         | Winston (structured JSON)       |
| Containers   | Docker + docker-compose         |
| CI           | GitHub Actions                  |

---

## Instruções de execução

### Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose
- Node.js 20+ (apenas para desenvolvimento local sem Docker)

### Com Docker (recomendado)

```bash
# Clone o projeto
git clone <repo-url>
cd order-api

# Suba tudo (banco + API + migrations automáticas)
docker compose up --build

# A API estará disponível em:
# http://localhost:4000/graphql
```

### Desenvolvimento local (hot-reload)

```bash
# 1. Inicie apenas o banco via Docker
docker compose up db -d

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env se necessário

# 3. Instale dependências
npm install

# 4. Gere o client Prisma e rode as migrations
npm run db:generate
npx prisma migrate dev --name init

# 5. (Opcional) Popule com dados de exemplo
npm run db:seed

# 6. Inicie o servidor com hot-reload
npm run dev
```

### Rodar testes

```bash
npm test
npm run test:coverage   # com relatório de cobertura
```

---

## GraphQL — Exemplos de uso

Acesse o GraphQL Playground em `http://localhost:4000/graphql`.

### Criar usuário

```graphql
mutation {
  createUser(input: { name: "Alice Silva", email: "alice@example.com" }) {
    id
    name
    email
    createdAt
  }
}
```

### Criar produto

```graphql
mutation {
  createProduct(input: { name: "Notebook Pro", price: 4999.99, stock: 10 }) {
    id
    name
    price
    stock
  }
}
```

### Emitir ordem de compra

```graphql
mutation {
  createOrder(input: {
    userId: "<user-id>"
    items: [
      { productId: "<product-id>", quantity: 2 }
    ]
  }) {
    id
    total
    items {
      product { name }
      quantity
      price
    }
  }
}
```

### Listar usuários e seus pedidos

```graphql
query {
  users {
    id
    name
    email
    orders {
      id
      total
      createdAt
    }
  }
}
```

---

## Decisões técnicas

### Por que GraphQL + Apollo Server 4?
GraphQL permite que clientes peçam exatamente os campos que precisam, evitando over/under-fetching. Apollo Server 4 é a versão mais recente, bem mantida e com suporte nativo a TypeScript.

### Por que Prisma?
Prisma oferece type-safety fim-a-fim (schema → banco → TypeScript), migrations versionadas e um query builder ergonômico. Alternativas como Knex ou DrizzleORM exigiriam mais código boilerplate para o mesmo resultado.

### Integridade de estoque em pedidos simultâneos

Esse é o ponto mais crítico do desafio. A abordagem adotada usa **duas camadas de proteção**:

1. **`SELECT FOR UPDATE`** — dentro da transaction, os rows dos produtos envolvidos são bloqueados antes da leitura do estoque. Qualquer transação concorrente que tente modificar os mesmos produtos ficará aguardando o unlock.

2. **`SERIALIZABLE` isolation level** — garante que nenhuma leitura fantasma aconteça entre a leitura e a escrita dentro da mesma TX.

Resultado: dois pedidos simultâneos para o mesmo produto com estoque 1 são processados sequencialmente pelo banco. O segundo lerá o estoque já decrementado e retornará `InsufficientStockError`.

### Erros tipados como GraphQL Errors
Erros de negócio (estoque insuficiente, não encontrado, conflito de e-mail) estendem `GraphQLError` com um campo `extensions.code`. Isso permite que clientes façam tratamento programático sem parsear mensagens de texto.

### Logs estruturados com Winston
Em produção, logs são emitidos em JSON puro, facilitando ingestão por ferramentas como Datadog, CloudWatch ou Loki. Em dev, formato human-friendly com cores.

---

## Trade-offs considerados

| Decisão | Trade-off |
|---|---|
| Apollo Standalone (sem Express) | Mais simples, mas menos flexível para adicionar middlewares HTTP no futuro |
| Prisma `$transaction` com `$queryRaw` para FOR UPDATE | Mistura API alto nível com SQL raw; alternativa seria usar Prisma Pulse ou um advisory lock, mas FOR UPDATE é mais portável |
| Mocks no lugar de banco real nos testes | Testes unitários rápidos, mas não cobrem o comportamento real do FOR UPDATE. Testes de integração (ausentes por tempo) cobririam isso |
| UUID como PK | Seguro e distribuído, mas levemente mais lento em index B-tree vs BIGSERIAL |

---

## O que faria diferente com mais tempo

- **Testes de integração** com `testcontainers` (banco PostgreSQL real em Docker durante os testes) para validar o comportamento do locking sob concorrência de fato
- **DataLoader** para resolver o problema N+1 em queries aninhadas (ex: listar orders com users)
- **Paginação e filtros** nas queries de listagem
- **Autenticação** via JWT com contexto no Apollo Server
- **Rate limiting** por IP/usuário para a mutation `createOrder`
- **Healthcheck endpoint** REST (`/health`) além do GraphQL
- **Observabilidade** com OpenTelemetry + traces distribuídos
