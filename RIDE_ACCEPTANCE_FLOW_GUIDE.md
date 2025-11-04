# Complete Ride Acceptance Flow - How Drivers Accept Rides

## Overview

Your app has an **automatic dispatch system** that matches passengers with drivers. Here's how it works:

## 🔄 Complete Flow (Passenger → Driver → Ride)

```
1. PASSENGER REQUESTS RIDE
   ↓
2. BOOKING CREATED (Status: "requested")
   ↓
3. DISPATCH SYSTEM FINDS AVAILABLE DRIVER
   ↓
4. OFFER CREATED & SENT TO DRIVER
   ↓
5. DRIVER RECEIVES NOTIFICATION
   ↓
6. DRIVER ACCEPTS/REJECTS
   ↓
7. BOOKING UPDATED (Status: "driver_assigned")
   ↓
8. PASSENGER NOTIFIED
   ↓
9. TRIP BEGINS
```

---

## Step-by-Step Breakdown

### Step 1: Passenger Requests Ride

**Location:** `frontend/src/features/passenger/dashboard/RequestRideButton.tsx`

```typescript
// Passenger fills form and clicks "Confirm Ride Request"
await bookingService.create(token, {
  pickup: { latitude: 27.036, longitude: 88.262, description: "Mall Road" },
  dropoff: { latitude: 27.041, longitude: 88.268, description: "Station" },
  notes: "Please call on arrival"
});
```

**API Call:** `POST /api/bookings`

**Response:**
```json
{
  "id": "booking_123",
  "status": "requested",
  "pickup": {...},
  "dropoff": {...},
  "fareQuote": {
    "amount": 145,
    "currency": "INR",
    "breakdown": [...]
  },
  "requestedAt": "2024-01-15T10:30:00Z"
}
```

### Step 2: Backend Creates Booking

**Location:** `backend/src/modules/booking/booking.service.ts`

```typescript
async createBooking(user: DbUser, payload: CreateBookingInput) {
  // 1. Calculate fare
  const fareQuote = await computeFareQuote(payload);
  
  // 2. Create booking in database
  const record = await bookingRepository.createBooking(
    passengerId,
    payload,
    fareQuote
  );
  
  // 3. Add to dispatch queue
  await enqueueBookingRequest(record.id, priority);
  
  // 4. Try to dispatch immediately
  await dispatchService.handleNewBooking(record);
  
  // 5. Trigger dispatch worker
  triggerDispatchWorker();
  
  return booking;
}
```

### Step 3: Dispatch System Finds Driver

**Location:** `backend/src/modules/dispatch/dispatch.service.ts`

```typescript
async handleNewBooking(booking: BookingRecord): Promise<boolean> {
  // Find available driver (not busy, status=available)
  const driver = await findAvailableDriverRedis();
  
  if (!driver) {
    return false; // No driver available, stays in queue
  }
  
  // Create offer for the driver
  const offer = await createOfferRedis(driver.driverId, booking);
  
  // Send real-time notification to driver
  broadcastOfferCreated(offer);
  
  return true;
}
```

**How it finds drivers:**
1. Queries Redis sorted set of available drivers
2. Filters by status = "available"
3. Checks they don't already have pending offers
4. Picks the best match (based on score/timestamp)

### Step 4: Offer Created

**Offer Structure:**
```typescript
{
  id: "offer_456",
  driverId: "driver_789",
  passengerId: "passenger_123",
  bookingId: "booking_123",
  status: "pending",
  pickup: { latitude: 27.036, longitude: 88.262, description: "Mall Road" },
  dropoff: { latitude: 27.041, longitude: 88.268, description: "Station" },
  fareQuote: { amount: 145, currency: "INR" },
  expiresAt: "2024-01-15T10:32:00Z", // 2 minutes from creation
  createdAt: "2024-01-15T10:30:00Z"
}
```

**Stored in:** Redis (`offers:{driverId}` sorted set)

### Step 5: Driver Receives Notification

**Real-time Event via WebSocket:**

**Channel:** `driver:{driverId}`  
**Event Type:** `dispatch.offer.created`

```json
{
  "type": "dispatch.offer.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "offerId": "offer_456",
    "offer": {
      "id": "offer_456",
      "bookingId": "booking_123",
      "pickup": {
        "latitude": 27.036,
        "longitude": 88.262,
        "description": "Mall Road, Darjeeling"
      },
      "dropoff": {
        "latitude": 27.041,
        "longitude": 88.268,
        "description": "Railway Station"
      },
      "fareQuote": {
        "amount": 145,
        "currency": "INR"
      },
      "expiresAt": "2024-01-15T10:32:00Z",
      "passenger": {
        "name": "John Doe",
        "rating": 4.8
      }
    }
  }
}
```

### Step 6: Driver Accepts Offer

**Current State:** ⚠️ **Frontend UI Missing** (Backend fully implemented)

#### What's Implemented (Backend)

**API Endpoint:** `POST /api/dispatch/offers/:id/accept`

```typescript
// Driver clicks "Accept" button
await dispatchService.acceptOffer(driverId, offerId);
```

**What Happens:**
1. Validates offer exists and belongs to driver
2. Checks offer is still pending (not expired/accepted by other driver)
3. Updates offer status to "accepted"
4. Updates driver status to "unavailable" (busy)
5. Updates booking:
   ```typescript
   {
     status: "driver_assigned",
     driverId: driver_789,
     acceptedAt: "2024-01-15T10:30:15Z"
   }
   ```
6. Broadcasts event to passenger

#### What's Missing (Frontend)

**Need to create:** Driver Offer Notification Component

**Example Implementation Needed:**

```typescript
// File: frontend/src/components/driver/RideOfferNotification.tsx

import { useState, useEffect } from "react";
import { realtimeClient } from "@/lib/realtime";
import { dispatchService } from "@/lib/dispatch-service";

export const RideOfferNotification = ({ driverId, token }) => {
  const [currentOffer, setCurrentOffer] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    // Listen for offer notifications
    const unsubscribe = realtimeClient.subscribe(
      `driver:${driverId}`,
      (event) => {
        if (event.type === 'dispatch.offer.created') {
          setCurrentOffer(event.data.offer);
          // Play sound notification
          playNotificationSound();
        } else if (event.type === 'dispatch.offer.expired') {
          setCurrentOffer(null);
        }
      }
    );

    return () => unsubscribe();
  }, [driverId]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await dispatchService.acceptOffer(token, currentOffer.id);
      setCurrentOffer(null);
      // Show success message
    } catch (error) {
      console.error('Failed to accept offer:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    try {
      await dispatchService.rejectOffer(token, currentOffer.id);
      setCurrentOffer(null);
    } catch (error) {
      console.error('Failed to reject offer:', error);
    }
  };

  if (!currentOffer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">New Ride Request!</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-2">
            <MapPin className="text-green-500" />
            <div>
              <p className="font-semibold">Pickup</p>
              <p className="text-sm text-gray-600">
                {currentOffer.pickup.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="text-red-500" />
            <div>
              <p className="font-semibold">Dropoff</p>
              <p className="text-sm text-gray-600">
                {currentOffer.dropoff.description}
              </p>
            </div>
          </div>
          
          <div className="bg-emerald-50 p-3 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">
              ₹{currentOffer.fareQuote.amount}
            </p>
            <p className="text-sm text-gray-600">Estimated fare</p>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Expires in:</span>
            <span className="font-semibold text-red-600">
              <Countdown expiresAt={currentOffer.expiresAt} />
            </span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={handleReject}
            variant="outline"
            className="flex-1"
            disabled={isAccepting}
          >
            Reject
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            disabled={isAccepting}
          >
            {isAccepting ? "Accepting..." : "Accept Ride"}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Step 7: Booking Updated

**Database Change:**
```sql
UPDATE rides
SET 
  status = 'driver_assigned',
  driver_id = 'driver_789',
  accepted_at = NOW(),
  metadata = jsonb_set(metadata, '{acceptedBy}', '"driver_789"')
WHERE id = 'booking_123';
```

**Booking Status Flow:**
```
requested → driver_assigned → enroute_pickup → passenger_onboard → completed
```

### Step 8: Passenger Notified

**Real-time Event via WebSocket:**

**Channel:** `passenger:{passengerId}`  
**Event Type:** `booking.driver_assigned`

```json
{
  "type": "booking.driver_assigned",
  "timestamp": "2024-01-15T10:30:15Z",
  "data": {
    "bookingId": "booking_123",
    "booking": {
      "id": "booking_123",
      "status": "driver_assigned",
      "driver": {
        "id": "driver_789",
        "name": "Ram Kumar",
        "phone": "+91-9876543210",
        "vehicle": {
          "manufacturer": "Maruti",
          "model": "Swift",
          "registrationNumber": "WB 01 AB 1234",
          "color": "White"
        },
        "etaMinutes": 5
      }
    }
  }
}
```

**Frontend automatically updates** via:
- `usePassengerDashboard` hook
- Real-time subscription to passenger channel
- Dashboard refreshes to show driver info

### Step 9: Trip Begins

Driver has additional actions available:
- **Start trip:** `POST /api/trips` (when picking up passenger)
- **Complete trip:** `PATCH /api/trips/:id/complete`
- **Update location:** Via heartbeat every 30 seconds

---

## Current Implementation Status

### ✅ Fully Implemented (Backend)

| Component | Status | File |
|-----------|--------|------|
| Booking creation | ✅ | `backend/src/modules/booking/booking.service.ts` |
| Dispatch queue | ✅ | `backend/src/modules/booking/booking.queue.ts` |
| Driver matching | ✅ | `backend/src/modules/dispatch/dispatch.service.ts` |
| Offer creation | ✅ | `backend/src/modules/dispatch/dispatch.service.ts` |
| Offer acceptance API | ✅ | `backend/src/modules/dispatch/http/router.ts` |
| Offer rejection API | ✅ | `backend/src/modules/dispatch/http/router.ts` |
| Real-time notifications | ✅ | `backend/src/modules/dispatch/dispatch.service.ts` |
| Offer expiration (2 min) | ✅ | `backend/src/modules/dispatch/dispatch.worker.ts` |
| Automatic redispatch | ✅ | If driver rejects/expires, finds next driver |

### ⚠️ Missing (Frontend)

| Component | Status | What's Needed |
|-----------|--------|---------------|
| Driver offer notification UI | ❌ | Component to show incoming ride requests |
| Accept/Reject buttons | ❌ | UI to accept or reject offers |
| Countdown timer | ❌ | Show time remaining to accept |
| Sound notification | ❌ | Alert driver of new offer |
| Active ride display | ❌ | Show current ride details |
| Trip controls | ❌ | Start trip, complete trip buttons |

---

## API Endpoints for Drivers

### 1. Get Pending Offers
```http
GET /api/dispatch/offers
Authorization: Bearer <driver_token>
```

**Response:**
```json
{
  "offers": [
    {
      "id": "offer_456",
      "bookingId": "booking_123",
      "pickup": {...},
      "dropoff": {...},
      "fareQuote": {...},
      "expiresAt": "2024-01-15T10:32:00Z"
    }
  ]
}
```

### 2. Accept Offer
```http
POST /api/dispatch/offers/:id/accept
Authorization: Bearer <driver_token>
```

**Response:**
```json
{
  "id": "booking_123",
  "status": "driver_assigned",
  "driverId": "driver_789",
  "passenger": {
    "name": "John Doe",
    "phone": "+91-9876543210"
  },
  "pickup": {...},
  "dropoff": {...}
}
```

### 3. Reject Offer
```http
POST /api/dispatch/offers/:id/reject
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "reason": "Too far away"
}
```

### 4. Toggle Availability
```http
POST /api/dispatch/availability
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "status": "available", // or "unavailable"
  "latitude": 27.036,
  "longitude": 88.262,
  "capacity": 4
}
```

---

## Real-Time Events

### For Drivers

| Event Type | When | Data |
|------------|------|------|
| `dispatch.offer.created` | New ride request | Offer details |
| `dispatch.offer.accepted` | You accepted offer | Booking details |
| `dispatch.offer.expired` | Offer timed out (2 min) | Offer ID |
| `booking.updated` | Booking status changed | Updated booking |

### For Passengers

| Event Type | When | Data |
|------------|------|------|
| `booking.driver_assigned` | Driver accepted | Driver details |
| `booking.driver_enroute` | Driver heading to pickup | ETA updated |
| `booking.driver_arrived` | Driver at pickup | Notification |
| `booking.trip_started` | Trip started | Trip ID |
| `booking.trip_completed` | Trip ended | Final fare |

---

## Example: Complete Driver Experience

### Scenario: Ram (driver) receives and accepts a ride

**1. Ram sets himself online:**
```typescript
// Driver clicks "Go Online" button
await dispatchService.setAvailability(token, {
  status: 'available',
  latitude: 27.036,
  longitude: 88.262,
  capacity: 4
});
```

**2. John (passenger) requests ride:**
```typescript
// 10 km away from Ram
await bookingService.create(token, {
  pickup: { lat: 27.046, lon: 88.272, description: "Mall Road" },
  dropoff: { lat: 27.051, lon: 88.278, description: "Station" }
});
```

**3. System finds Ram:**
- Dispatch worker checks available drivers
- Ram is closest and available
- Creates offer for Ram

**4. Ram's phone shows notification:**
- **Sound plays** (ding!)
- **Full-screen popup** appears
- **Countdown timer** starts (2 minutes)

```
┌─────────────────────────────────┐
│  New Ride Request! 🚗           │
├─────────────────────────────────┤
│  📍 Pickup: Mall Road, Darjeeling│
│  📍 Dropoff: Railway Station     │
│                                  │
│  💰 Estimated Fare: ₹145        │
│                                  │
│  ⏱️ Expires in: 01:45           │
│                                  │
│  [Reject]     [Accept Ride]     │
└─────────────────────────────────┘
```

**5. Ram clicks "Accept Ride":**
```typescript
await dispatchService.acceptOffer(token, offerId);
```

**6. Popup changes to:**
```
┌─────────────────────────────────┐
│  Ride Accepted! ✅              │
├─────────────────────────────────┤
│  Passenger: John Doe            │
│  📞 +91-9876543210              │
│                                  │
│  📍 Pickup: Mall Road           │
│     10 km away (15 min drive)   │
│                                  │
│  [Navigate]  [Call Passenger]   │
└─────────────────────────────────┘
```

**7. John (passenger) sees:**
```
┌─────────────────────────────────┐
│  Driver Assigned! 🎉            │
├─────────────────────────────────┤
│  Driver: Ram Kumar              │
│  Rating: ⭐⭐⭐⭐⭐ 4.9/5.0     │
│                                  │
│  🚗 White Maruti Swift          │
│     WB 01 AB 1234               │
│                                  │
│  📍 ETA: 15 minutes             │
│                                  │
│  [Call Driver]  [Track on Map]  │
└─────────────────────────────────┘
```

---

## Testing the Flow

### Current Test Setup

**File:** `backend/test/dispatch/dispatch.smoke.test.ts`

Includes full integration test of:
1. Creating booking
2. Dispatch finding driver
3. Creating offer
4. Driver accepting offer
5. Booking status updating
6. Real-time events being sent

### Manual Testing

**1. Setup:**
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start Redis (for real-time)
redis-server
```

**2. Test Flow:**
1. Login as passenger → Request ride
2. Check backend logs for dispatch worker
3. Login as driver (different browser/incognito)
4. Driver should receive offer (via WebSocket)
5. Driver accepts → Passenger sees driver assigned

---

## Next Steps to Complete the Feature

### Priority 1: Driver Offer Notification Component

Create `frontend/src/components/driver/RideOfferNotification.tsx`:
- ✅ Show incoming ride requests
- ✅ Display pickup/dropoff
- ✅ Show fare estimate
- ✅ Countdown timer
- ✅ Accept/Reject buttons
- ✅ Sound notification

### Priority 2: Driver Active Ride Display

Create `frontend/src/components/driver/ActiveRide.tsx`:
- Show current ride details
- Passenger contact info
- Navigate to pickup button
- Call passenger button
- Complete ride button

### Priority 3: Driver Dashboard Integration

Update `frontend/src/pages/driver/Profile.tsx`:
- Add RideOfferNotification component
- Add ActiveRide component
- Show ride history
- Show earnings

---

## Summary

**✅ What Works Now:**
- Passenger can request ride
- Backend automatically finds available driver
- Offer created and stored
- APIs ready for driver to accept/reject
- Real-time notifications configured

**❌ What's Missing:**
- Driver UI to see and accept offers
- Sound notifications for drivers
- Active ride display
- Trip start/complete controls

**📝 Files to Create:**
1. `frontend/src/components/driver/RideOfferNotification.tsx`
2. `frontend/src/components/driver/ActiveRide.tsx`
3. `frontend/src/hooks/use-driver-offers.ts`
4. `frontend/src/lib/dispatch-service.ts` (enhance existing)

---

**Status:** Backend 100% complete, Frontend needs driver UI components

Would you like me to create the driver offer notification component now?


