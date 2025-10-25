# Infrastructure Layer

The `infra` directory will house shared infrastructure concerns that can be reused across modules without duplicating setup code.

Planned contents:

- `logger.ts` – centralized pino/winston logger with request correlation helpers.
- `cache/redis.ts` – Redis client factory, health checks, and key namespaces.
- `queue/index.ts` – BullMQ/Kafka producers and consumers for async workflows.
- `events/publisher.ts` – Event emitters for ride lifecycle notifications.
- `providers/*` – Integrations (payments, SMS, maps, email) with consistent adapters.

Keeping these pieces under a single folder allows services to depend on abstractions instead of direct third-party SDK calls, improving testability and maintainability.
