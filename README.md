# 🛒 Order API — GraphQL

API GraphQL para gerenciamento de pedidos, construída com Node.js, TypeScript, Apollo Server e PostgreSQL.

---

## Stack

| Camada       | Tecnologia                      |
|--------------|---------------------------------|
| Runtime      | Node.js 20                      |
| Linguagem    | TypeScript 5                    |
| GraphQL      | Apollo Server 5                 |
| ORM          | Prisma 7                        |
| Banco        | PostgreSQL 16                   |
| Testes       | Jest + ts-jest                  |
| Logs         | Custom logger (JSON estruturado)|
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

# Para usar o sandbox e colocar mutations:
# https://studio.apollographql.com/sandbox/explorer
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
npm run prisma:generate
npm run prisma:migrate

# 5. (Opcional) Popule com dados de exemplo
npm run prisma:seed

# 6. Inicie o servidor com hot-reload
npm run dev
```

### Rodar testes

```bash
npm test
npm run test:coverage 
```

---

## GraphQL — Exemplos de uso

Acesse o GraphQL Playground em `http://localhost:4000/graphql`.

### Criar usuário

```graphql
mutation {
  createUser(input: { name: "Maria Lúcia", email: "lucia@example.com" }) {
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
  createProduct(input: { name: "Macbook Pro 9s", price: 8999.99, stock: 10 }) {
    id
    name
    price
    stock
  }
}
```


### Listar produtos
```graphql
query {
  products {
    id
    name
    price
    stock
  }
}
```

### Listar produtos disponíveis (com estoque)
```graphql
query {
  products(onlyAvailable: true) {
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

### Por que GraphQL + Apollo Server 5?
GraphQL permite que clientes peçam exatamente os campos que precisam, evitando over/under-fetching. Apollo Server 5 é a versão mais recente, bem mantida e com suporte nativo a TypeScript.

### Por que Prisma?
Prisma oferece type-safety fim-a-fim (schema → banco → TypeScript), migrations versionadas e um query builder ergonômico. Alternativas como Knex ou DrizzleORM exigiriam mais código boilerplate para o mesmo resultado.

### Integridade de estoque em pedidos simultâneos

Esse é o ponto mais crítico do desafio. A abordagem adotada usa **duas camadas de proteção**:

1. **`SELECT FOR UPDATE`** — dentro da transaction, os rows dos produtos envolvidos são bloqueados antes da leitura do estoque. Qualquer transação concorrente que tente modificar os mesmos produtos ficará aguardando o unlock.

2. **Timeout de transação configurado** — `timeout: 10_000` evita que uma transação travada segure o lock indefinidamente, liberando recursos para outras requisições.

Resultado: dois pedidos simultâneos para o mesmo produto com estoque 1 são processados sequencialmente pelo banco. O segundo lerá o estoque já decrementado e retornará `InsufficientStockError`.

### Erros tipados como GraphQL Errors
Erros de negócio (estoque insuficiente, não encontrado, conflito de e-mail) estendem `GraphQLError` com um campo `extensions.code`. Isso permite que clientes façam tratamento programático sem parsear mensagens de texto.

### Logs estruturados
Em produção, logs são emitidos em JSON puro, facilitando ingestão por ferramentas como Datadog, CloudWatch ou Loki. O logger suporta níveis `debug`, `info`, `warn` e `error`, configuráveis via variável de ambiente `LOG_LEVEL`.

---

## Trade-offs considerados

| Decisão | Trade-off |
|---|---|
| Apollo Standalone (sem Express) | Mais simples, mas menos flexível para adicionar middlewares HTTP no futuro |
| Prisma `$transaction` com `$queryRaw` para FOR UPDATE | Mistura API alto nível com SQL raw; alternativa seria usar advisory lock, mas FOR UPDATE é mais portável |
| Testes de integração com banco real | Cobertura real do comportamento de locking e transações, ao custo de testes mais lentos e dependência de infraestrutura |
| UUID como PK | Seguro e distribuído, mas levemente mais lento em index B-tree vs BIGSERIAL |
| Email como identificador único de usuário | Simples de implementar, mas permite múltiplas contas da mesma pessoa — CPF seria mais robusto |

---

## O que faria diferente com mais tempo

### Já mitigado, mas pode evoluir
- **Preço histórico** — `orderItems.price` já persiste o preço no momento da compra. Evoluiria adicionando soft delete em produtos para preservar o histórico de pedidos mesmo após remoção.

### Melhorias prioritárias
- **DataLoader** — o Prisma já faz batch automático nos include diretos, mas em queries GraphQL aninhadas arbitrárias vindas do cliente os resolvers podem disparar queries redundantes. DataLoader resolveria isso agrupando as requisições por batch.
- **Paginação** — queries de listagem retornam todos os registros de uma vez; com volume crescente isso seria insustentável.
- **SKU em produtos** — campo único para tornar o cadastro idempotente e separar as operações de `createProduct` e `restockProduct`. Hoje múltiplas chamadas com os mesmos dados geram registros duplicados.

### Melhorias de produto
- **Status de pedido** — fluxo `PENDING → CONFIRMED → SHIPPED → DELIVERED → CANCELLED` para rastreamento e suporte a cancelamentos.
- **Autenticação JWT** — `userId` deveria vir do token, não do input. Hoje qualquer pessoa pode criar pedidos em nome de qualquer usuário.
- **CPF como identificador único** — email sozinho permite múltiplas contas da mesma pessoa.

### Infraestrutura
- **OpenTelemetry** — traces distribuídos para observabilidade em produção.
- **Rate limiting** na mutation `createOrder` por IP/usuário.
- **Healthcheck** REST em `/health` além do endpoint GraphQL.
- **Filas com BullMQ + Redis** — hoje o createOrder é síncrono e segura a conexão HTTP até a transação terminar. Com volume alto, pedidos poderiam ir para uma fila e serem processados em background, retornando um orderId imediatamente com status PENDING.
- **Cache com Redis** — cachear queries frequentes como products e users para reduzir hits desnecessários no banco em listagens.
- **Retry com backoff exponencial** — se o SELECT FOR UPDATE causar deadlock ou timeout sob concorrência alta, hoje o erro estoura direto para o cliente. Um retry automático tornaria o sistema mais resiliente.
- **Constraint de estoque negativo no banco** — a validação de estoque hoje é feita apenas no código. Um CHECK (stock >= 0) na coluna garantiria integridade mesmo contra queries diretas no banco.