# ADR 0001: Database Access and Caching Stack

## Status
Accepted – 2025-10-25

## Context
The project currently uses the `pg` driver directly inside route handlers. As we expand into multiple domain modules with richer data relationships, we need typed query composition, migrations, and transactional helpers. At the same time, upcoming features (dispatching, live trip tracking, rate limiting) require a shared caching/event backbone.

## Decision
- Adopt **Drizzle ORM** on top of PostgreSQL to provide:
  - Type-safe query builders aligned with our existing TypeScript setup.
  - Lightweight abstractions that work with the repo’s node environment (Express + serverless-ready).
  - First-class schema definition that can power migrations alongside the current SQL scripts while we transition.
- Adopt **ioredis** as the Redis client for caching and pub/sub workloads because:
  - It supports advanced Redis features (cluster, streams, pub/sub) that we need for dispatch and notifications.
  - The API integrates cleanly with TypeScript and is widely used in production.
- Introduce infrastructure factories under `src/infra` to expose the shared Drizzle database instance and Redis client without impacting existing `pool` consumers.

## Consequences
- We will add Drizzle schema definitions for each domain module. Existing raw SQL helpers remain operational until we migrate them.
- Deployment environments must provision Redis. Until then, the Redis factory will guard against missing configuration to avoid breaking current flows.
- Developers should run the Drizzle migration pipeline (`drizzle-kit`) alongside the existing SQL migrations during the transition period.

## Follow-up Actions
1. Add dependencies (`drizzle-orm`, `drizzle-kit`, `ioredis`) to the backend package manifest and document installation.
2. Implement `src/infra/database/drizzle.ts` and `src/infra/cache/redis.ts` factories with health checks.
3. Create Drizzle schema files for `app_users` and future tables, and align migration workflow.
