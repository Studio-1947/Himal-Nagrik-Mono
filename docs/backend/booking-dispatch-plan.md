# Booking & Dispatch Domain Plan

This note summarises the current state of the booking/dispatch domain and what remains.

## Booking Module (Phase 1 ?)
- REST endpoints live: `POST /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`.
- Repository + service layers persist rides, compute placeholder fare quotes, and enqueue requests.
- Booking creation now invokes the dispatch service to create driver offers when availability exists.
- Smoke tests (`test/booking/booking.smoke.test.ts`) cover create, fetch, and cancel flows.

## Dispatch Module (Phase 1 ?)
- Driver heartbeat API (`POST /dispatch/availability/heartbeat`) stores availability snapshots in Redis.
- `GET /dispatch/offers`, `POST /dispatch/offers/:id/accept`, and `POST /dispatch/offers/:id/reject` manage ride offers.
- Accepting an offer updates the booking to `driver_assigned`; rejections trigger reassignment when possible.
- Redis-backed dispatch service persists driver states/offers and broadcasts updates over WebSockets.
- Dispatch smoke test validates heartbeat -> offer -> acceptance workflow.

## Real-Time & Queueing (Updated)
- Booking requests are pushed into a Redis sorted-set queue and processed by the background dispatch worker.
- The worker attempts driver assignment, re-queues unmatched bookings, and emits WebSocket notifications.
- WebSocket gateway mounted on `/ws` handles driver/passenger channels for offer lifecycle events.

## Next Steps
1. [x] Replace in-memory dispatch state with Redis (driver availability hash, sorted sets for queues).
2. [x] Add background worker to process booking queue and implement driver ranking logic.
3. [x] Introduce WebSocket gateway for passenger/driver rooms and broadcast offer/assignment events.
4. Expand booking/dispatch tests to cover rejection retry and timeout/expiry scenarios.
5. Surface booking creation/assignment status in the frontend using the new booking hook.
