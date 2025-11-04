# Driver Ride Acceptance System - Complete Guide

## 🎯 Overview

This guide explains the complete driver ride acceptance flow, from when a passenger requests a ride to when a driver accepts it. The system uses **real-time WebSocket events**, **Redis-based dispatch**, and a **beautiful, user-friendly UI**.

---

## 📋 Table of Contents

1. [High-Level Flow](#high-level-flow)
2. [Components & Files](#components--files)
3. [How It Works - Step by Step](#how-it-works---step-by-step)
4. [UI Components Explained](#ui-components-explained)
5. [Real-Time Events](#real-time-events)
6. [Testing the System](#testing-the-system)

---

## 🔄 High-Level Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Passenger  │         │   Backend    │         │   Driver    │
│  Dashboard  │         │   Dispatch   │         │  Dashboard  │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                        │
       │  1. Request Ride      │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │  2. Create Booking    │                        │
       │  3. Start Dispatch    │                        │
       │      Worker           │                        │
       │                       │                        │
       │                       │  4. Find Available     │
       │                       │     Drivers in Area    │
       │                       │                        │
       │                       │  5. Create Offer       │
       │                       ├───────────────────────>│
       │                       │  (WebSocket Event)     │
       │                       │                        │
       │                       │     🔔 NOTIFICATION!   │
       │                       │     🔊 SOUND PLAYS     │
       │                       │                        │
       │                       │  6. Driver Accepts     │
       │                       │<───────────────────────┤
       │                       │                        │
       │  7. Booking Updated   │                        │
       │<──────────────────────┤                        │
       │  (Driver Assigned)    │                        │
       │                       │  8. Booking Details    │
       │                       ├───────────────────────>│
       │                       │                        │
       │  9. Real-time Status  │                        │
       │     Updates           │  10. Navigate to       │
       │<──────────────────────┤      Pickup            │
       │                       │<───────────────────────┤
       └───────────────────────┴────────────────────────┘
```

---

## 📁 Components & Files

### Backend Files

| File | Purpose |
|------|---------|
| `backend/src/modules/booking/booking.service.ts` | Creates bookings, triggers dispatch |
| `backend/src/modules/dispatch/dispatch.service.ts` | Manages dispatch logic, creates offers |
| `backend/src/modules/dispatch/dispatch.worker.ts` | Background worker that processes dispatch jobs |
| `backend/src/modules/dispatch/http/router.ts` | API routes for offers (list, accept, reject) |
| `backend/src/infra/realtime/socket-server.ts` | WebSocket server for real-time events |

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/dispatch-service.ts` | API client for dispatch operations |
| `frontend/src/hooks/use-driver-offers.ts` | React hook managing offers & real-time events |
| `frontend/src/components/driver/RideOfferNotification.tsx` | Modal UI showing incoming ride request |
| `frontend/src/components/driver/ActiveRideDisplay.tsx` | UI showing current active ride details |
| `frontend/src/pages/driver/Profile.tsx` | Driver dashboard (integrated components) |

---

## 🚀 How It Works - Step by Step

### Step 1: Passenger Requests a Ride

**What Happens:**
- Passenger fills out pickup/dropoff locations on their dashboard
- Clicks "Request a ride" button
- Frontend calls `bookingService.createBooking()`

**Code Location:**
```typescript
// frontend/src/features/passenger/dashboard/RequestRideButton.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const booking = await bookingService.createBooking(token, payload);
  // Booking created!
};
```

---

### Step 2: Backend Creates Booking

**What Happens:**
- Backend validates pickup/dropoff locations
- Calculates fare using `computeFareQuote()`
- Creates booking in database with status `pending_dispatch`
- Enqueues a dispatch job in Redis

**Code Location:**
```typescript
// backend/src/modules/booking/booking.service.ts
export const createBooking = async (
  payload: CreateBookingInput,
  passengerId: string
): Promise<BookingResponse> => {
  const fareQuote = await computeFareQuote(payload);
  const booking = await db.insert(bookings).values({
    status: 'pending_dispatch',
    // ... other fields
  });
  
  // Trigger dispatch worker
  await enqueueDispatchJob(booking.id);
  return booking;
};
```

---

### Step 3: Dispatch Worker Finds Drivers

**What Happens:**
- Background worker picks up the dispatch job from Redis
- Queries Redis for available drivers near pickup location
- Filters drivers by:
  - Status = "available"
  - Within geographic radius (default 5km)
  - Sufficient capacity
  - Recent heartbeat (< 2 minutes old)

**Code Location:**
```typescript
// backend/src/modules/dispatch/dispatch.worker.ts
const processDispatchJob = async (job: Job) => {
  const availableDrivers = await findNearbyDrivers(
    booking.pickup.latitude,
    booking.pickup.longitude,
    radiusKm: 5
  );
  
  // Offer to first available driver
  const offer = await createOffer(booking, driver);
};
```

---

### Step 4: Offer Created & Sent to Driver

**What Happens:**
- Backend creates an offer record in database
- Offer includes:
  - Passenger name, phone, rating
  - Pickup & dropoff locations
  - Estimated fare
  - Expiration time (60 seconds)
- Real-time WebSocket event `dispatch.offer.created` sent to driver

**Code Location:**
```typescript
// backend/src/modules/dispatch/dispatch.service.ts
export const createOfferForDriver = async (
  bookingId: string,
  driverId: string
): Promise<Offer> => {
  const offer = await db.insert(offers).values({
    bookingId,
    driverId,
    status: 'pending',
    expiresAt: new Date(Date.now() + 60000), // 60 seconds
  });
  
  // Send real-time event
  socketServer.sendToUser(driverId, {
    type: 'dispatch.offer.created',
    data: { offer: enrichedOffer }
  });
  
  return offer;
};
```

---

### Step 5: Driver Sees Notification

**What Happens:**
- Driver's browser receives WebSocket event
- `useDriverOffers` hook processes the event
- `RideOfferNotification` modal appears with:
  - Passenger details
  - Pickup/dropoff locations
  - Estimated fare
  - Countdown timer (60 seconds)
- **Notification sound plays automatically** 🔊

**Code Location:**
```typescript
// frontend/src/hooks/use-driver-offers.ts
useEffect(() => {
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type === 'dispatch.offer.created') {
      const offer = event.data?.offer;
      setCurrentOffer(offer);
      playNotificationSound(); // 🔊 Beep!
    }
  };
  
  realtimeClient.subscribe(`driver:${driverId}`, handleRealtimeEvent);
}, [driverId]);
```

---

### Step 6: Driver Accepts Offer

**What Happens:**
- Driver clicks "Accept Ride" button
- Frontend calls `dispatchService.acceptOffer(token, offerId)`
- Backend:
  - Marks offer as "accepted"
  - Updates booking status to `driver_assigned`
  - Associates driver with booking
  - Expires other pending offers for this booking
  - Sends real-time event to passenger

**Code Location:**
```typescript
// backend/src/modules/dispatch/http/router.ts
dispatchRouter.post('/offers/:offerId/accept', async (req, res) => {
  const booking = await acceptOffer(offerId, driverId);
  
  // Notify passenger
  socketServer.sendToUser(booking.passengerId, {
    type: 'booking.driver_assigned',
    data: { booking }
  });
  
  res.json(booking);
});
```

---

### Step 7: Driver Dashboard Updates

**What Happens:**
- Notification modal closes
- `ActiveRideDisplay` component shows with:
  - Current ride status
  - Passenger contact info
  - Pickup/dropoff locations
  - Navigate button (opens Google Maps)
  - Action buttons (Start Trip, Complete Trip)

**Code Location:**
```typescript
// frontend/src/pages/driver/Profile.tsx
const handleAcceptOffer = async (offerId: string) => {
  const booking = await acceptOffer(offerId);
  setActiveBooking(booking); // Shows ActiveRideDisplay
  toast({ title: "Ride Accepted!" });
};
```

---

### Step 8: Passenger Gets Update

**What Happens:**
- Passenger's dashboard receives WebSocket event
- UI updates to show:
  - "Driver assigned" status
  - Driver name, vehicle, ETA
  - Real-time location updates

**Code Location:**
```typescript
// frontend/src/hooks/use-bookings.ts (passenger side)
useEffect(() => {
  const handleEvent = (event: RealtimeEvent) => {
    if (event.type === 'booking.driver_assigned') {
      setActiveBooking(event.data.booking);
      toast({ title: "Driver on the way!" });
    }
  };
  
  realtimeClient.subscribe(`passenger:${passengerId}`, handleEvent);
}, [passengerId]);
```

---

## 🎨 UI Components Explained

### 1. RideOfferNotification

**Purpose:** Full-screen modal that appears when a new ride request arrives.

**Features:**
- ✅ Auto-play notification sound
- ⏱️ 60-second countdown timer (animated)
- 👤 Passenger info (name, rating, phone)
- 📍 Pickup & dropoff addresses
- 💰 Estimated fare with currency
- ✅ Accept button (gradient, prominent)
- ❌ Reject button with optional reason
- 🎨 Beautiful gradient background with animations

**Key Props:**
```typescript
type RideOfferNotificationProps = {
  offer: DispatchOffer | null;
  isAccepting: boolean;
  isRejecting: boolean;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string, reason?: string) => void;
};
```

**Visual States:**
- **Urgent:** Last 30 seconds - timer pulses red
- **Normal:** 30-60 seconds - timer is white
- **Expired:** 0 seconds - shows "Offer Expired" message

---

### 2. ActiveRideDisplay

**Purpose:** Card showing current active ride details after acceptance.

**Features:**
- 📊 Status indicator with color coding
  - Blue: En route to pickup
  - Green: Passenger on board
- 👤 Passenger contact with call button
- 📍 Pickup & dropoff locations
- 💰 Fare breakdown (expandable)
- 🗺️ Navigate button (opens Google Maps)
- ✅ Action buttons (context-aware)
  - "Start Trip" when heading to pickup
  - "Complete Trip" when passenger on board

**Key Props:**
```typescript
type ActiveRideDisplayProps = {
  booking: BookingResponse | null;
  onStartTrip?: () => void;
  onCompleteTrip?: () => void;
  onNavigate?: () => void;
};
```

---

### 3. useDriverOffers Hook

**Purpose:** Centralized state management for driver offers.

**Features:**
- ✅ Real-time WebSocket event handling
- ✅ Auto-load pending offers on mount
- ✅ Accept/reject offer methods
- ✅ Loading and error states
- ✅ Automatic sound notification

**Return Values:**
```typescript
{
  currentOffer: DispatchOffer | null;
  isLoading: boolean;
  error: string | null;
  isAccepting: boolean;
  isRejecting: boolean;
  acceptOffer: (offerId: string) => Promise<BookingResponse | null>;
  rejectOffer: (offerId: string, reason?: string) => Promise<boolean>;
  refreshOffers: () => Promise<void>;
}
```

---

## 📡 Real-Time Events

### Events Sent to Driver

| Event Type | When | Payload |
|------------|------|---------|
| `dispatch.offer.created` | New ride offer created | `{ offer: DispatchOffer }` |
| `dispatch.offer.expired` | Offer timeout (60s) | `{ offerId: string }` |
| `dispatch.offer.accepted` | Confirmation after accept | `{ booking: BookingResponse }` |

### Events Sent to Passenger

| Event Type | When | Payload |
|------------|------|---------|
| `booking.driver_assigned` | Driver accepts ride | `{ booking: BookingResponse }` |
| `booking.status_updated` | Status changes | `{ booking: BookingResponse }` |
| `booking.location_updated` | Driver location changes | `{ location: LocationPoint }` |

---

## 🧪 Testing the System

### Prerequisites

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Start Redis:**
   ```bash
   redis-server
   ```

### Test Scenario

**Step 1: Create Driver Account**
- Register as driver at `/auth/register`
- Complete driver profile with vehicle details
- Go to Driver Dashboard (`/driver/profile`)

**Step 2: Go Online**
- Toggle "Go Online" switch in Driver Dashboard
- Ensure GPS location is enabled
- System sends heartbeat every 30 seconds

**Step 3: Create Passenger Account**
- Open incognito window or different browser
- Register as passenger at `/auth/register`
- Go to Passenger Dashboard (`/passenger/profile`)

**Step 4: Request Ride**
- Click "Request a ride" button
- Enter pickup address (search with autocomplete)
- Enter dropoff address
- Click "Request a ride"

**Step 5: Watch Driver Dashboard**
- **Within 2 seconds**, driver should see:
  - 🔊 Notification sound plays
  - Full-screen offer modal appears
  - Countdown timer starts (60 seconds)
  - Passenger details visible
  - Pickup/dropoff locations shown
  - Estimated fare displayed

**Step 6: Accept Ride**
- Click "✅ Accept Ride" button
- Modal closes
- "Active Ride" card appears
- Toast notification: "Ride Accepted!"

**Step 7: Verify Passenger Dashboard**
- Switch to passenger browser tab
- Should show "Driver assigned" status
- Driver name, vehicle info visible
- Map shows driver location

**Step 8: Complete Ride**
- In driver dashboard, click "Start Trip"
- Status changes to "Passenger On Board"
- Click "Complete Trip"
- Ride ends, card disappears
- Ready for next ride!

---

## 🐛 Troubleshooting

### Driver Not Receiving Offers

**Check:**
1. Driver status is "available" (toggle is ON)
2. Driver sent recent heartbeat (< 2 minutes)
3. Driver is within 5km of pickup location
4. WebSocket connection is active (check browser console)

**Debug:**
```typescript
// Check Redis for driver availability
redis-cli
> KEYS driver:availability:*
> GET driver:availability:<driverId>
```

### Offer Notification Not Showing

**Check:**
1. `useDriverOffers` hook is mounted (Driver Dashboard is open)
2. WebSocket is connected (check Network tab → WS)
3. Browser console for WebSocket events
4. No JavaScript errors in console

**Debug:**
```typescript
// Add console.log in useDriverOffers
useEffect(() => {
  console.log('[useDriverOffers] Mounted, driverId:', driverId);
  
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    console.log('[useDriverOffers] Event received:', event);
  };
}, []);
```

### Sound Not Playing

**Check:**
1. Browser allows autoplay (some browsers block it)
2. Device volume is not muted
3. No browser extensions blocking audio
4. Try user interaction first (click anywhere) to enable autoplay

**Alternative:**
Use browser's built-in Notification API:
```typescript
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('New Ride Request!', {
    body: `${passenger.name} needs a ride`,
    icon: '/logo.png',
  });
}
```

---

## 🎉 Success!

You now have a fully functional **real-time driver ride acceptance system** with:
- ✅ WebSocket-based notifications
- ✅ Beautiful, user-friendly UI
- ✅ Sound alerts
- ✅ Countdown timers
- ✅ Accept/reject workflow
- ✅ Active ride management
- ✅ Google Maps integration

**Next Steps:**
- Add push notifications for mobile
- Implement driver routing with turn-by-turn directions
- Add chat between passenger and driver
- Implement ride history and earnings dashboard

Happy dispatching! 🚗💨


