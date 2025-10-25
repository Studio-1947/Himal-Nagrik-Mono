# Cab Booking Platform Architecture

This document captures the target architecture for evolving the existing Himal Nagrik mono-repo into a production-grade cab booking platform comparable to Uber or Ola, while reusing the current Express/React foundations.

## Guiding Principles
- **Incremental evolution** – keep existing routes, contexts and build tooling working while introducing modular boundaries.
- **Domain separation** – isolate authentication, passenger, driver, booking, dispatch, trip, payment, and support concerns.
- **Real-time first** – design APIs and infrastructure around location streaming, driver availability, and live trip state.
- **Observability and safety** – bake in audit logs, monitoring, and failure handling from the start.

## High-Level System
```
┌──────────┐       ┌─────────────┐       ┌─────────────┐
│ Frontend │◀─────▶│ REST / WS   │◀─────▶│ Application │
│ (React)  │       │ Gateway     │       │ Services    │
└──────────┘       └─────────────┘       ├─────────────┤
        ▲            ▲         ▲         │Auth & Identity│
        │            │         │         │Passenger Ops  │
        │            │         │         │Driver Ops     │
        │            │         │         │Booking/Dispatch│
        │            │         │         │Trip Tracking  │
        │            │         │         │Payments/Payout│
        │            │         │         │Support/Admin  │
        │            │         │         └─────────────┬─┘
        │            │         │                       │
        │            │         ▼                       ▼
        │            │ ┌─────────────┐        ┌────────────────┐
        │            └▶│ Redis / MQ  │◀──────▶│ PostgreSQL (+BI)│
        │                └─────────────┘        └────────────────┘
        ▼
 Mobile apps / integrations (future)
```

## Backend Modules
The backend keeps the existing `src/app.ts` and `src/routes/index.ts` entry points. New domain modules live in `src/modules/<domain>` and expose Express routers that are mounted from the existing `registerRoutes` function.

| Module | Responsibilities | Key Artifacts |
| --- | --- | --- |
| `auth` | Sign-up/login, JWT, MFA, refresh tokens, KYC state | controllers, services, repositories, schemas |
| `passenger` | Profile, preferences, saved places, ride history | passenger router, profile service |
| `driver` | Onboarding, vehicle registry, schedule, availability | driver router, compliance workflows |
| `booking` | Ride requests, fare estimation, matching orchestration entry point | booking router, service, surge engine integration |
| `dispatch` | Driver ranking, assignment lifecycle, fallback matching | dispatch service, event consumers |
| `trip` | Trip state machine, telemetry ingestion, SOS | trip router, event publisher |
| `payment` | Fare capture, refunds, wallet, driver payouts | payment router, gateway adapters |
| `support` | Ticketing, escalations, notifications | support router, case workflows |
| `admin` | Internal dashboards, feature flags, ops tooling | admin router, auth middleware |

Common infrastructure (config, logger, database, cache, event bus) lives under `src/infra`. The stack standardizes on **Drizzle ORM** (PostgreSQL driver) for typed database access while continuing to reuse the existing `pg` pool, and **ioredis** for cache/event primitives.

### Layering
- **Controller layer** (Express routers) keeps HTTP concerns: validation, auth guard, mapping DTOs.
- **Service layer** hosts business rules, uses repositories/adapters via dependency injection.
- **Repository layer** encapsulates persistence (PostgreSQL via Prisma/Drizzle) and caching (Redis).
- **Events** published through a queue (BullMQ or Kafka) for async workflows (driver matching, payouts).
- **Schedulers/Workers** run background jobs for reassignments, payout batches, document re-verification.

## Data Model Sketch

| Table | Purpose | Notes |
| --- | --- | --- |
| `users` | Base identity (passenger/driver/admin) | extends current `app_users` table with status flags |
| `driver_documents` | KYC artifacts, expiry tracking | S3-backed file references |
| `vehicles` | Driver vehicles, capacity, verification state | one-to-many with drivers |
| `rides` | Each trip request and lifecycle state | stores fare quotes, cancellation reason |
| `ride_events` | Event sourcing for ride status transitions | supports analytics/debug |
| `ride_assignments` | Match decisions, acceptance timestamps | used for SLA metrics |
| `locations` | Saved passenger locations, geo indexing | PostGIS support |
| `payments` | Passenger charges, references payment provider | includes refunds |
| `payouts` | Driver earnings settlements | ties to bank accounts |
| `support_tickets` | Customer support cases | route to ops tooling |

Indexes and materialized views will support surge, ETA prediction, and supply-demand analytics.

## Frontend Architecture
- Retain React + Vite stack, expanding to feature folders: `src/features/<domain>/{components,pages,api,stores}`.
- Shared hooks and API client definitions move into `src/lib/api` with per-domain SDK modules.
- Global state via Zustand or Redux Toolkit to track session, active ride, driver availability, and notifications.
- WebSocket client (Socket.IO) integrated through context provider for live trip events.
- Map integrations (Mapbox/Google) contained in `src/features/map`.
- Progressive enhancement for mobile: prepared to reuse components in Capacitor/Ionic builds.

## Integration Contracts
- **REST**: versioned under `/api/v1`, JSON APIs with Zod validation shared across backend/frontend.
- **WebSockets**: namespaced rooms (`ride:<id>`, `driver:<id>`, `passenger:<id>`), event types for `ride.requested`, `ride.accepted`, `eta.updated`, `driver.location`.
- **Webhooks**: payment provider callbacks, fraud alerts, SMS delivery receipts.

## Roadmap Alignment
Phase 1 (current focus) delivers module scaffolding, migrations, and auth hardening without breaking existing routes. Subsequent iterations add booking, dispatch, and payment capabilities, followed by admin/support tooling and observability.

## Open Questions
- Preferred ORM (Prisma vs Drizzle) and migration strategy.
- Messaging solution availability (Redis-only vs managed Kafka).
- Third-party integrations (maps, payments, SMS) selection based on deployment region.

Feedback on these decisions will shape the implementation details in upcoming phases.
