# Map Location Fix Guide

## Issue: Map Showing Wrong Location

If the map is showing a location somewhere else (different country, ocean, etc.), this is typically caused by:

1. **Swapped coordinates** - Latitude and longitude in wrong order
2. **Wrong coordinate values** - Incorrect data in the database
3. **No default location** - Fallback to first driver which might be far away

## Diagnostic Steps

### Step 1: Check Browser Console

1. Open the passenger dashboard map
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Look for lines starting with `[Map Debug]`

You should see output like:
```
[Map Debug] Passenger Location: {
  latitude: 27.7172,
  longitude: 85.3240,
  formatted: "27.7172, 85.3240",
  googleMapsLink: "https://www.google.com/maps?q=27.7172,85.3240"
}
```

### Step 2: Verify Coordinates

1. **Click the Google Maps link** in the console output
2. **Check if the location is correct**

Expected coordinates for Nepal (Kathmandu area):
- Latitude: ~27.7 (between 26 and 29)
- Longitude: ~85.3 (between 80 and 88)

### Step 3: Check Coordinate Display

Look at the **bottom-left corner** of the map for a yellow box showing coordinates:
```
27.717200, 85.324000
```

## Common Issues and Fixes

### Issue 1: Coordinates are Swapped

**Symptom**: Map shows ocean or wrong continent

**Example Bad Data**:
```json
{
  "latitude": 85.324000,
  "longitude": 27.717200
}
```
This would put the location in the Arctic Ocean!

**Fix**: Update database to swap the values back

```sql
-- Check current passenger saved locations
SELECT id, label, location FROM passenger_saved_locations;

-- If coordinates are swapped, update them
UPDATE passenger_saved_locations
SET location = jsonb_build_object(
  'latitude', (location->>'longitude')::numeric,
  'longitude', (location->>'latitude')::numeric,
  'placeId', location->>'placeId',
  'description', location->>'description'
);
```

### Issue 2: No Saved Location

**Symptom**: Map centers on random driver location or doesn't load

**Fix**: Add a default passenger location through the UI or database

#### Option A: Through UI (Recommended)
1. Go to Passenger Profile/Settings
2. Add a saved location with your address
3. Mark it as default
4. Refresh the dashboard

#### Option B: Through Database
```sql
INSERT INTO passenger_saved_locations (
  id, 
  passenger_id, 
  label, 
  address, 
  location, 
  is_default, 
  created_at, 
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_PASSENGER_ID',
  'Home',
  'Kathmandu, Nepal',
  '{"latitude": 27.7172, "longitude": 85.3240, "description": "Kathmandu, Nepal"}',
  true,
  NOW(),
  NOW()
);
```

### Issue 3: Correct Format But Wrong City/Country

**Symptom**: Coordinates are in correct format but wrong actual location

**Fix**: Update the coordinates to the correct ones for your area

**Get Correct Coordinates**:
1. Go to [Google Maps](https://www.google.com/maps)
2. Right-click on your desired location
3. Click on the coordinates (e.g., "27.7172, 85.3240")
4. Update in database

```sql
UPDATE passenger_saved_locations
SET location = jsonb_set(
  location,
  '{latitude}',
  '27.7172'::jsonb
)
WHERE id = 'YOUR_LOCATION_ID';

UPDATE passenger_saved_locations
SET location = jsonb_set(
  location,
  '{longitude}',
  '85.3240'::jsonb
)
WHERE id = 'YOUR_LOCATION_ID';
```

## Reference: Valid Coordinates

### Nepal (Major Cities)

| City | Latitude | Longitude |
|------|----------|-----------|
| **Kathmandu** | 27.7172 | 85.3240 |
| Pokhara | 28.2096 | 83.9856 |
| Lalitpur (Patan) | 27.6667 | 85.3167 |
| Bhaktapur | 27.6710 | 85.4298 |
| Biratnagar | 26.4525 | 87.2718 |
| Birgunj | 27.0001 | 84.8797 |

### India (Nearby Cities)

| City | Latitude | Longitude |
|------|----------|-----------|
| **New Delhi** | 28.6139 | 77.2090 |
| Mumbai | 19.0760 | 72.8777 |
| Bangalore | 12.9716 | 77.5946 |
| Kolkata | 22.5726 | 88.3639 |

## Testing the Fix

After fixing the coordinates:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Hard refresh**: Ctrl+Shift+R
3. **Check console** for new coordinates
4. **Verify map** shows correct location
5. **Remove debug display** once confirmed

## Removing Debug Display

Once the location is fixed, remove the yellow coordinate display:

In `frontend/src/features/passenger/dashboard/PassengerMap.tsx`:

```typescript
// Remove these lines (around line 222-239):
useEffect(() => {
  if (passengerLocation) {
    console.log('[Map Debug] Passenger Location:', {
      // ...
    });
  }
  // ...
}, [passengerLocation, driverLocations]);

// And remove the yellow coordinate box (around line 742-752):
{passengerLocation && (
  <div className="pointer-events-none absolute bottom-4 left-4...">
    // ...
  </div>
)}
```

## Backend: Ensuring Correct Coordinate Storage

### When Creating/Updating Locations

Make sure your backend validation ensures correct coordinate ranges:

```typescript
// In backend validation
const locationSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  placeId: z.string().optional(),
  description: z.string().optional(),
});
```

### Driver Heartbeat Validation

Ensure driver locations are validated:

```typescript
// In dispatch service heartbeat
if (input.location) {
  if (
    input.location.latitude < -90 || input.location.latitude > 90 ||
    input.location.longitude < -180 || input.location.longitude > 180
  ) {
    throw new Error('Invalid coordinates');
  }
}
```

## Additional Resources

- [Latitude and Longitude Finder](https://www.latlong.net/)
- [Google Maps](https://www.google.com/maps)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [GPS Coordinates](https://gps-coordinates.org/)

## Quick SQL Queries

### Check all saved locations
```sql
SELECT 
  id,
  label,
  address,
  location->>'latitude' as latitude,
  location->>'longitude' as longitude,
  is_default
FROM passenger_saved_locations
ORDER BY created_at DESC;
```

### Find potentially swapped coordinates (latitude > 90 or < -90)
```sql
SELECT 
  id,
  label,
  location->>'latitude' as latitude,
  location->>'longitude' as longitude
FROM passenger_saved_locations
WHERE 
  (location->>'latitude')::numeric > 90 OR
  (location->>'latitude')::numeric < -90 OR
  (location->>'longitude')::numeric > 180 OR
  (location->>'longitude')::numeric < -180;
```

### Bulk update to swap all coordinates (USE WITH CAUTION!)
```sql
-- FIRST, backup your data!
-- CREATE TABLE passenger_saved_locations_backup AS SELECT * FROM passenger_saved_locations;

-- Then swap if needed
UPDATE passenger_saved_locations
SET location = jsonb_build_object(
  'latitude', (location->>'longitude')::numeric,
  'longitude', (location->>'latitude')::numeric,
  'placeId', location->>'placeId',
  'description', location->>'description'
)
WHERE 
  (location->>'latitude')::numeric > 90 OR
  (location->>'latitude')::numeric < -90;
```

## Support

If you're still having issues after following this guide:

1. Share the console output coordinates
2. Share a screenshot of the map
3. Confirm which city/area you expect to see
4. Check if there are any saved locations in the database


