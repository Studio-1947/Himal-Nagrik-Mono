# How to Book a Cab - User Guide

## Quick Start

### For Passengers

1. **Login to your account**
   - Go to the passenger dashboard
   - Navigate to `/passenger/profile`

2. **Look for the prominent "Request a ride" button**
   - It's now displayed at the TOP of your dashboard
   - Beautiful gradient button (emerald-to-sky gradient)
   - Located above the map for easy access

3. **Click "Request a ride"**
   - A booking dialog will open

4. **Fill in the booking details:**
   - **Pickup Location** (pre-filled with your saved location)
     - Label: E.g., "Mall Road Entrance"
     - Latitude & Longitude (editable)
   
   - **Dropoff Location** (required)
     - Description: E.g., "Darjeeling Railway Station"
     - Latitude & Longitude
   
   - **Notes** (optional)
     - Any special requests or instructions

5. **Submit your booking**
   - The system will:
     - ✅ Create your booking request
     - ✅ Find available drivers nearby
     - ✅ Assign a driver automatically
     - ✅ Show your booking status
   
6. **Track your ride**
   - Active booking appears in your dashboard
   - Real-time status updates
   - Driver information when assigned

## Booking Button Location

```
┌─────────────────────────────────────┐
│    Passenger Dashboard              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │    🚗 Request a ride          │ │  ← BOOKING BUTTON (TOP)
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │        MAP VIEW               │ │
│  │    (with YOU and DRIVER       │ │
│  │         labels)               │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Your preferences form below]     │
└─────────────────────────────────────┘
```

## Booking Form Fields

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Dropoff Latitude** | Destination latitude | 27.041000 |
| **Dropoff Longitude** | Destination longitude | 88.263000 |

### Auto-Filled Fields

| Field | Description | Can Edit? |
|-------|-------------|-----------|
| **Pickup Label** | Your saved location name | ✅ Yes |
| **Pickup Latitude** | Your current/saved latitude | ✅ Yes |
| **Pickup Longitude** | Your current/saved longitude | ✅ Yes |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Notes** | Special instructions | "Please call when arriving" |

## Booking Status Flow

```
1. REQUESTED
   └─> You submit the booking
   
2. DRIVER_ASSIGNED
   └─> A driver accepts your request
   
3. ENROUTE_PICKUP
   └─> Driver is coming to pick you up
   
4. PASSENGER_ONBOARD
   └─> You're in the vehicle, heading to destination
   
5. COMPLETED
   └─> Trip finished successfully
```

## Visual Improvements Made

### 1. Enhanced Map Labels ✨

**YOUR LOCATION:**
- Green pin with large **"YOU"** label
- Solid bright green background (#10b981)
- Bold white text with thick border
- Impossible to miss!

**DRIVER LOCATIONS:**
- Blue car icon with **"DRIVER"** label
- Bright blue background (#0ea5e9)
- ETA badge in top-right corner
- Clear identification

### 2. Prominent Booking Button 🎨

**Style:**
- Gradient background (emerald → sky → emerald)
- Large, centered placement
- Glowing shadow effect
- Rounded full corners
- "Request a ride" text

**Location:**
- Top of the dashboard
- Before the map
- Always visible
- Easy to find

## Backend Flow

When you book a cab, this happens:

1. **Frontend sends request** to `/api/bookings`
   ```json
   {
     "pickup": {
       "latitude": 27.717,
       "longitude": 85.324,
       "description": "Mall Road"
     },
     "dropoff": {
       "latitude": 27.041,
       "longitude": 88.263,
       "description": "Railway Station"
     },
     "notes": "Call on arrival"
   }
   ```

2. **Backend processes**:
   - ✅ Validates booking data
   - ✅ Calculates fare estimate
   - ✅ Creates booking record (status: 'requested')
   - ✅ Adds to dispatch queue
   - ✅ Triggers driver matching algorithm

3. **Dispatch system**:
   - Finds nearby available drivers
   - Calculates ETA for each driver
   - Assigns driver with best score
   - Sends real-time notification

4. **Real-time updates**:
   - You receive booking confirmation
   - Driver gets assignment notification
   - Both see live status updates
   - Map updates with driver location

## Tips for Best Experience

### ✅ DO:
- Keep GPS enabled for accurate pickup
- Fill in pickup/dropoff descriptions
- Add notes for special requests
- Check your active booking status
- Wait for driver assignment notification

### ❌ DON'T:
- Submit duplicate bookings
- Change location after booking
- Cancel without good reason
- Leave without contacting driver

## Troubleshooting

### "Request a ride" button not showing?

**Check:**
1. Are you logged in as a passenger?
2. Are you on the `/passenger/profile` page?
3. Has the dashboard loaded? (map should be visible)
4. Do you have a saved location set up?

**Solution:**
- Refresh the page
- Make sure you're logged in
- Add a default pickup location in your profile

### Booking form won't submit?

**Common issues:**
1. ❌ Missing dropoff coordinates
2. ❌ Invalid latitude/longitude format
3. ❌ Not logged in

**Solution:**
- Fill in all required fields
- Use valid coordinates (numbers with decimals)
- Check error message for specific issue

### No drivers available?

**Reasons:**
- All drivers are busy
- No drivers in your area
- Outside service hours

**Solution:**
- Wait a few minutes and try again
- Check "Nearby Drivers" count on map
- Try during peak hours (morning/evening)

## Feature Benefits

### For Passengers:
- 🎯 **Easy booking** - One button, simple form
- 📍 **GPS integration** - Uses your real location
- 🚗 **Live tracking** - See nearby drivers
- ⏱️ **ETA display** - Know wait times
- 📱 **Real-time updates** - Get notified of status changes
- 🗺️ **Visual map** - See your location and drivers clearly

### For Drivers:
- 📊 **Automatic dispatch** - Get booking notifications
- 🎯 **Smart matching** - Best routes assigned to you
- 💰 **Fare estimates** - Know earnings upfront
- 📍 **Passenger location** - Navigate easily
- ⭐ **Rating system** - Build your reputation

## API Endpoints

For developers:

```typescript
// Create booking
POST /api/bookings
Headers: { Authorization: Bearer <token> }
Body: CreateBookingPayload

// Get active booking
GET /api/bookings/active

// Get booking details
GET /api/bookings/:id

// Cancel booking
PATCH /api/bookings/:id/cancel
```

## Database Schema

Bookings are stored with:
- `id`: Unique booking ID
- `passengerId`: Your user ID
- `driverId`: Assigned driver (null if pending)
- `status`: Current booking status
- `pickupLocation`: GPS coordinates + description
- `dropoffLocation`: GPS coordinates + description
- `fareQuote`: Estimated/actual fare
- `requestedAt`: Timestamp
- `completedAt`: Timestamp (when finished)
- `metadata`: Vehicle type, payment method, notes

## Next Steps

After booking:
1. **Wait for driver assignment** (usually < 2 minutes)
2. **Check active booking panel** on your dashboard
3. **Contact driver** when they arrive
4. **Complete trip** - driver marks as complete
5. **Rate your experience** (coming soon)

## Support

If you encounter issues:
- Check this guide first
- Refresh the page
- Log out and log back in
- Contact support: care@himal.app
- Report bugs on GitHub

---

**Happy riding! 🚗💨**

*Last updated: After map improvements and booking button integration*


