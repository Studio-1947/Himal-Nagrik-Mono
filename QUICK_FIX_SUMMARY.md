# Quick Fix Summary - Map Location Issue

## What Was Done

### 1. Added Debugging Tools ✅
**File**: `frontend/src/features/passenger/dashboard/PassengerMap.tsx`

Added two debugging features:

#### A. Console Logging
Automatically logs coordinates to browser console with:
- Latitude and longitude values
- Formatted coordinates
- **Google Maps link** to verify location

#### B. Visual Coordinate Display
Yellow box in bottom-left of map shows:
- Current coordinates being used
- Reminder to check console

## How to Use

### Step 1: Open the Map
1. Start frontend: `npm run dev` (in frontend folder)
2. Navigate to Passenger Dashboard
3. Open Browser Developer Tools (F12)
4. Go to Console tab

### Step 2: Check Coordinates
Look for this in console:
```
[Map Debug] Passenger Location: {
  latitude: 27.7172,
  longitude: 85.3240,
  googleMapsLink: "https://www.google.com/maps?q=27.7172,85.3240"
}
```

### Step 3: Verify Location
1. **Click the Google Maps link** in the console
2. See if it shows the correct location
3. If wrong, note what the correct coordinates should be

### Step 4: Fix Database

**If coordinates are swapped** (e.g., showing ocean):
```sql
UPDATE passenger_saved_locations
SET location = jsonb_build_object(
  'latitude', (location->>'longitude')::numeric,
  'longitude', (location->>'latitude')::numeric
);
```

**If coordinates are just wrong**:
1. Get correct coordinates from Google Maps
2. Update database with correct values

**If no saved location exists**:
- Add a saved location through the passenger UI
- Or insert directly into database (see full guide)

## Quick Reference: Nepal Coordinates

| Location | Latitude | Longitude |
|----------|----------|-----------|
| Kathmandu | 27.7172 | 85.3240 |
| Pokhara | 28.2096 | 83.9856 |
| Lalitpur | 27.6667 | 85.3167 |

Remember:
- **Latitude**: -90 to 90 (Nepal is around 26-30)
- **Longitude**: -180 to 180 (Nepal is around 80-88)

## After Fixing

Once coordinates are correct:
1. Hard refresh browser (Ctrl+Shift+R)
2. Verify map shows correct location
3. **Remove debug code** (optional) - see `MAP_LOCATION_FIX_GUIDE.md`

## Full Documentation

For detailed instructions, see:
- **MAP_LOCATION_FIX_GUIDE.md** - Complete troubleshooting guide
- **MAP_IMPROVEMENTS.md** - All map features documentation
- **LANGUAGE_FIX.md** - Map language settings

## Common Issues

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| Map shows ocean | Swapped coordinates | Swap lat/long in DB |
| Map shows different country | Wrong coordinate values | Update with correct coords |
| Map doesn't center properly | No default location | Add saved location |
| Coordinates look weird in console | Data type issue | Check DB column type |

## Need Help?

1. Check the console output coordinates
2. Click the Google Maps link to see where it actually points
3. Compare with expected location
4. Follow the appropriate fix in `MAP_LOCATION_FIX_GUIDE.md`


