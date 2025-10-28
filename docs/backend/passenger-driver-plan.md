# Passenger & Driver Modules – Next Steps

With authentication now modularised and tested, the next milestone is to carve out the passenger and driver bounded contexts. This note captures the immediate backlog so we can execute in focused increments.

## Passenger Module (Phase 1 ?)
- **Domain scaffolding** – `src/modules/passenger/{http,service,repository}` now mirrors the auth layout.
- **Repository layer** – Drizzle-backed helpers cover saved locations (and are staged for ride history when needed).
- **Service endpoints** – `/passengers/me` and `/passengers/me/locations` (GET/PATCH/POST/DELETE) return enriched profiles and manage saved places.
- **DTO sharing** – passenger profile/validation exports are available via `src/modules/passenger/index.ts` and consumed in `frontend/src/lib/passenger-service.ts`.
- **Integration touchpoints** – the React auth context hydrates passenger sessions, and the passenger dashboard renders saved places with shared DTOs.
- **Tests** – Supertest/Vitest smoke coverage exercises passenger registration/login/profile + saved location flows via the in-memory harness.

## Driver Module (Phase 1 ?)
- **Domain scaffolding** – `src/modules/driver/{http,service,repository}` mirrors the passenger structure.
- **Repository layer** – Drizzle adapters cover driver documents (`driver_documents`) and seed a future vehicles table integration.
- **Service endpoints** – `/drivers/me`, `/drivers/me` (PATCH), `/drivers/me/availability/toggle`, and `/drivers/me/documents` expose profile, availability, and compliance workflows.
- **DTO sharing** – driver profile schemas/types are exported via `src/modules/driver/index.ts` and consumed in `frontend/src/lib/driver-service.ts`.
- **Frontend integration** – the auth context hydrates driver sessions, and the driver dashboard now surfaces availability toggles plus document submission.
- **Tests** – Supertest/Vitest smoke coverage mirrors the passenger harness for driver profile, availability, and document flows.

## Cross-cutting Tasks
- **Repository overrides** – formalise the in-memory repository harness so other modules can reuse the stubbing approach.
- **Error surface** – align passenger/driver error messages with the auth service helpers for consistent API responses.
- **Telemetry** – once modules harden, add request logging, metrics, and dashboards to monitor usage and failures.

Next up: begin the booking and dispatch bounded context (ride requests, matching, real-time updates) building on the completed role modules.
