# Real-Time GPS Location Tracking

## Overview

Implemented automatic GPS location tracking to show **your actual location** instead of relying on saved/hardcoded locations. Both passengers and drivers can now have their real-time location tracked and displayed on the map.

## What Was Implemented

### 1. **Browser Geolocation API Integration**
**File**: `frontend/src/hooks/use-geolocation.ts`

A custom React hook that:
- ✅ Continuously tracks user's GPS location
- ✅ High accuracy mode enabled (uses GPS when available)
- ✅ Auto-updates every few seconds
- ✅ Handles permission requests
- ✅ Provides accuracy information (±X meters)
- ✅ Error handling with user-friendly messages

### 2. **Passenger Dashboard Integration**
**Files**: 
- `frontend/src/hooks/use-passenger-dashboard.ts`
- `frontend/src/pages/passenger/Profile.tsx`

Features:
- ✅ Automatically uses real GPS location when available
- ✅ Falls back to saved location if GPS is disabled
- ✅ Refreshes nearby drivers based on your actual location
- ✅ Toggle switch to enable/disable GPS tracking

### 3. **Enhanced Map Component**
**File**: `frontend/src/features/passenger/dashboard/PassengerMap.tsx`

New features:
- ✅ **GPS Toggle Button** - Enable/disable real-time location
- ✅ **Live Location Indicator** - Shows if using GPS (green pulse) or saved location
- ✅ **Accuracy Display** - Shows GPS accuracy (±X meters)
- ✅ **Location Source Label** - Clearly indicates "Live GPS" vs "Saved Location"
- ✅ **Error Messages** - User-friendly permission/error notifications
- ✅ **Color-coded Status** - Green for GPS, Yellow for saved location

## How It Works

### For Passengers

1. **Initial Load**:
   - Browser requests location permission
   - User allows/denies permission

2. **Permission Granted**:
   ```
   📍 Live GPS Active
   ├── Map centers on your actual location
   ├── Shows nearby drivers from YOUR position
   ├── Updates automatically as you move
   └── Green indicators show GPS is active
   ```

3. **Permission Denied**:
   ```
   📌 Saved Location
   ├── Falls back to saved location
   ├── Shows error message with instructions
   ├── Click "Use My Location" to try again
   └── Yellow indicators show saved location
   ```

### For Drivers (Future Implementation)

Currently drivers send location via heartbeat. The same geolocation hook can be integrated for driver apps:

```typescript
// In driver dashboard/app
const geolocation = useGeolocation({ 
  enableHighAccuracy: true, 
  watch: true 
});

// Send heartbeat with real location
if (geolocation.position) {
  await dispatchService.sendHeartbeat({
    status: 'available',
    location: {
      latitude: geolocation.position.latitude,
      longitude: geolocation.position.longitude,
    },
    capacity: 4,
  });
}
```

## User Interface

### Map Controls

#### 1. GPS Toggle Button (Top-Right)
- **When OFF** (Gray):
  ```
  [📍 Use My Location]
  ```
  Click to enable GPS tracking

- **When ON** (Green):
  ```
  [✓ GPS Active]
  ```
  Click to disable and use saved location

#### 2. Location Status Panel (Top-Left, 3rd panel)
Shows:
- **Status Indicator**: Green pulse (GPS) or Gray dot (Saved)
- **Label**: "LIVE GPS" or "SAVED LOC"
- **Accuracy**: "±25m" (only when GPS active)

#### 3. Coordinate Display (Bottom-Left)
Shows:
- **Source Icon**: 📍 (GPS) or 📌 (Saved)
- **Coordinates**: `27.717200, 85.324000`
- **Verification**: Link to check in console

Color:
- **Green border** = Using GPS
- **Yellow border** = Using saved location

#### 4. Error Display (Bottom-Center, when error)
```
⚠️ Location Access Needed
[Error message with instructions]
```

## Permission Handling

### Browser Permission States

1. **Granted** ✅
   - GPS automatically starts tracking
   - Map updates with real location
   - Green indicators appear

2. **Denied** ❌
   - Error message displayed
   - Falls back to saved location
   - User can retry by clicking "Use My Location"

3. **Prompt** ⏸️
   - Browser shows permission dialog
   - Loading state while waiting
   - Proceeds based on user choice

### How to Enable Location Access

#### Chrome/Edge:
1. Click the 🔒 lock icon in address bar
2. Find "Location" permission
3. Select "Allow"
4. Refresh the page

#### Firefox:
1. Click the 🔒 lock icon
2. Click "Clear Permission"
3. Reload page and allow when prompted

#### Safari:
1. Safari menu → Preferences
2. Websites → Location Services
3. Find your site, select "Allow"

## Testing

### Test Case 1: GPS Permission Granted
1. Open passenger dashboard/profile
2. Allow location when prompted
3. **Expected**:
   - Green "GPS Active" button
   - Green pulsing dot in status panel
   - Coordinates show your actual location
   - Map centers on you
   - Bottom-left shows "📍 Live GPS Location" (green)

### Test Case 2: GPS Permission Denied
1. Open passenger dashboard/profile
2. Deny location when prompted
3. **Expected**:
   - Gray "Use My Location" button
   - Error message displayed
   - Saved location used instead
   - Bottom-left shows "📌 Saved Location" (yellow)

### Test Case 3: Toggle GPS On/Off
1. Start with GPS enabled
2. Click "GPS Active" button
3. **Expected**:
   - Switches to saved location
   - Button changes to "Use My Location"
   - Map re-centers to saved location
   - Nearby drivers recalculated

4. Click "Use My Location"
5. **Expected**:
   - Switches back to GPS
   - Button changes to "GPS Active"
   - Map re-centers to real location

### Test Case 4: Moving While GPS Active
1. Enable GPS tracking
2. Note current driver list
3. Move to a different location (or simulate in browser DevTools)
4. **Expected**:
   - Map automatically updates
   - Nearby drivers list refreshes
   - New drivers appear/disappear based on new location

## Browser DevTools Testing

### Simulate Different Locations

1. Open Chrome DevTools (F12)
2. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Type "sensors" and select "Show Sensors"
4. In Sensors tab:
   - Select a preset location OR
   - Enter custom coordinates
5. Refresh the page to apply

### Custom Coordinates

Test different cities:

| City | Latitude | Longitude |
|------|----------|-----------|
| Kathmandu | 27.7172 | 85.3240 |
| Pokhara | 28.2096 | 83.9856 |
| New Delhi | 28.6139 | 77.2090 |
| Mumbai | 19.0760 | 72.8777 |

## Console Debugging

The map logs detailed location information to the console:

```javascript
[Map Debug] Passenger Location: {
  source: 'GPS (Real-time)',      // or 'Saved Location'
  latitude: 27.7172,
  longitude: 85.3240,
  accuracy: '±25m',                // GPS accuracy
  formatted: '27.7172, 85.3240',
  googleMapsLink: 'https://www.google.com/maps?q=27.7172,85.3240'
}
```

**Click the Google Maps link** to verify the location is correct!

## Privacy & Security

### Data Handling
- ✅ Location tracked **only in browser**
- ✅ Not stored permanently on device
- ✅ Sent to backend **only for finding nearby drivers**
- ✅ Not logged or saved in database
- ✅ User can disable anytime

### User Control
- ✅ Can toggle GPS on/off anytime
- ✅ Can revoke browser permissions
- ✅ Falls back to saved location if disabled
- ✅ Clear visual indicators of tracking status

## Technical Details

### Location Update Frequency

```typescript
const geolocation = useGeolocation({
  enableHighAccuracy: true,    // Use GPS when available
  watch: true,                 // Continuously monitor
  timeout: 15000,              // 15 second timeout
  maximumAge: 30000,          // Cache for 30 seconds
});
```

- **Dashboard refresh**: Every 20 seconds
- **GPS update**: As location changes (typically 1-5 seconds)
- **Driver search**: Triggered on location change

### Accuracy Levels

- **High Accuracy (GPS)**: ±5-50 meters
- **Medium (Wi-Fi)**: ±50-500 meters
- **Low (IP)**: ±1-10 kilometers

High accuracy mode is enabled by default for best results.

## Configuration

### Adjust Update Frequency

In `frontend/src/hooks/use-passenger-dashboard.ts`:

```typescript
// Current: Refresh every 20 seconds
const intervalId = window.setInterval(() => {
  void loadDashboard();
}, 20000); // Change this value (in milliseconds)
```

### Adjust GPS Settings

In `frontend/src/hooks/use-passenger-dashboard.ts`:

```typescript
const geolocation = useGeolocation({
  enableHighAccuracy: true,    // Set to false for lower accuracy but better battery
  watch: true,                 // Set to false to disable continuous tracking
  timeout: 15000,              // Increase if requests timing out
  maximumAge: 30000,          // Decrease for more frequent updates
});
```

## Troubleshooting

### Issue: "Location Access Needed" Error

**Solution**:
1. Check browser permissions
2. Click "Use My Location" button
3. Allow when prompted
4. If still denied, manually enable in browser settings

### Issue: GPS not accurate

**Possible causes**:
- Indoors (GPS signal weak)
- Using Wi-Fi/IP location instead of GPS
- Device doesn't have GPS

**Solution**:
- Move outdoors for better signal
- Use a device with GPS
- Check if `enableHighAccuracy` is true

### Issue: Location not updating

**Check**:
1. Is "GPS Active" button green?
2. Console showing location updates?
3. Error messages displayed?

**Solution**:
- Toggle GPS off and back on
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors

### Issue: Wrong drivers showing

**This usually means**:
- GPS permission denied, using wrong saved location
- Or saved location is incorrect

**Solution**:
1. Enable GPS tracking
2. OR update your saved location:
   - Go to profile settings
   - Add/update saved location
   - Mark as default

## API Integration

### Backend Endpoint

The location is sent to:
```
GET /api/passengers/me/summary?lat={latitude}&lng={longitude}
```

Backend uses these coordinates to:
1. Find nearby available drivers
2. Calculate distances
3. Estimate ETAs
4. Return driver list for map display

### Driver Heartbeat

For drivers to show accurate locations, they must send heartbeats with GPS coordinates:

```typescript
POST /api/dispatch/heartbeat
{
  "status": "available",
  "location": {
    "latitude": 27.7172,
    "longitude": 85.3240
  },
  "capacity": 4
}
```

## Future Enhancements

### Planned Features

1. **Geofencing**
   - Notify when entering/leaving service areas
   - Automatic status changes

2. **Location History**
   - Track passenger movement during trip
   - Verify pickup/dropoff locations

3. **Battery Optimization**
   - Adaptive update frequency
   - Lower accuracy when stationary

4. **Offline Support**
   - Cache last known location
   - Graceful degradation

5. **Driver App Integration**
   - Same GPS tracking for drivers
   - Real-time position updates on passenger map

## Performance Impact

### Battery Usage
- **High accuracy GPS**: ~2-5% per hour
- **Low accuracy (Wi-Fi)**: ~1-2% per hour
- **Impact**: Minimal for typical ride booking (5-10 minutes)

### Data Usage
- **Location updates**: ~1KB per update
- **Map tiles**: ~100KB-500KB (one-time per area)
- **Total**: Negligible (<1MB per session)

### CPU/Memory
- Negligible impact
- Standard browser geolocation API
- No heavy processing

## Summary

✅ **Real-time GPS tracking** - Your actual location, not Kathmandu!  
✅ **Auto-updates** - Map refreshes as you move  
✅ **User control** - Easy toggle on/off  
✅ **Privacy-focused** - Location not stored permanently  
✅ **Accurate drivers** - Shows actually nearby drivers  
✅ **Clear indicators** - Always know what location is being used  
✅ **Error handling** - Helpful messages if something goes wrong  

The map will now show your **actual current location** and find drivers that are **actually near you**! 🎉

