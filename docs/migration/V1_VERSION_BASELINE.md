# Adidas Clone V1 — Runtime & Dependency Baseline

This file captures the dependency/runtime state at the Phase 0 baseline (`main` SHA `491ec01c9329a5aa6839d85b186f77c5f3e4c84e`). It is evidence for later V2 upgrades; it is not a recommendation to keep these versions.

## Runtime / infrastructure

| Component | V1 baseline |
|---|---|
| Backend Docker runtime | `node:20-alpine` |
| Jenkins Node tool | `node20` |
| PostgreSQL | `postgres:16` |
| RabbitMQ | `rabbitmq:3-management` |
| Elasticsearch | `8.15.0` |
| Kibana | `8.15.0` |
| Docker Compose | single shared V1 compose file |

V2 design target: Node 24 LTS and a single aligned Nest dependency major across the backend monorepo.

## API Gateway

Important package constraints in V1:

```text
@nestjs/common              ^10.0.0
@nestjs/core                ^10.0.0
@nestjs/platform-express    ^10.0.0
@nestjs/microservices       ^11.1.6
@nestjs/jwt                 ^11.0.1
@nestjs/testing             ^10.0.0
amqp-connection-manager     ^4.1.14
amqplib                     ^0.10.9
nodemailer                  ^7.0.10
typescript                  ^5.1.3
```

This confirms a V1 Nest major-version mismatch that must be corrected during Phase 1 foundation work.

## User Service

```text
@nestjs/common              ^11.1.6
@nestjs/core                ^11.1.6
@nestjs/microservices       ^11.1.6
@nestjs/platform-express    ^10.0.0
@nestjs/testing             ^10.0.0
@prisma/client              ^6.16.2
prisma                      ^6.16.2
firebase-admin              ^13.6.0
bcrypt                      ^6.0.0
typescript                  ^5.1.3
```

V1 also copies `firebase-admin-key.json` into the User Service image at build time. V2 must replace this with safer secret ownership/mounting in the Identity domain.

## Product Service

```text
@nestjs/common              11.1.6
@nestjs/core                11.1.6
@nestjs/platform-express    11.1.6
@nestjs/microservices       ^11.1.6
@prisma/client              ^6.17.1
prisma                      ^6.17.1
@elastic/elasticsearch      8
@nestjs/elasticsearch       ^11.1.0
cloudinary                  ^2.8.0
@google/genai               ^1.29.0
amqp-connection-manager     ^5.0.0
typescript                  ^5.1.3
```

## Order Service

```text
@nestjs/common              ^10.0.0
@nestjs/core                ^10.0.0
@nestjs/microservices       ^10.0.0
@nestjs/platform-express    ^10.0.0
@prisma/client              ^6.18.0
prisma                      ^6.18.0
stripe                      ^19.3.0
amqp-connection-manager     ^5.0.0
typescript                  ^5.1.3
```

Stripe ownership moves to Payment Service in V2.

## Customer frontend

```text
React                       ^19.1.1
React DOM                   ^19.1.1
Vite                        ^7.1.7
React Router DOM            ^7.9.1
TanStack React Query        ^5.90.6
Zustand                     ^5.0.8
Axios                       ^1.13.1
Firebase                    ^12.5.0
Stripe React                ^5.3.0
Stripe.js                   ^8.3.0
Ant Design                  ^5.28.0
Tailwind CSS                ^4.1.13
```

V2 keeps this general stack and migrates the customer app gradually to TypeScript, React Hook Form, Zod, generated OpenAPI types and automated tests.

## Admin frontend

```text
React                       ^18.2.0
React DOM                   ^18.2.0
Vite                        ^6.1.0
TypeScript                  ~5.7.2
React Router DOM            ^7.9.5
TanStack React Query        ^5.90.7
Axios                       ^1.13.2
Ant Design                  ^5.28.0
```

Note that customer and admin applications currently use different React/Vite major versions. That is a recorded V1 fact, not a Phase 0 problem to fix.

## Phase 1 upgrade rules

When Phase 1 begins:

1. Upgrade runtime/dependencies separately from domain extraction.
2. Align Nest packages to one compatible major before creating the 8-service V2 topology.
3. Do not combine Node/Nest upgrade and Inventory extraction in the same commit.
4. Build/test the unchanged V1 behavior after dependency alignment before continuing.
5. Update the architecture baseline if a planned V2 technology choice must materially change.
