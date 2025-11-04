# GPS Tracking Quick Start Guide

## What's New? 🎉

Your map will now show **YOUR ACTUAL LOCATION** using GPS instead of showing Kathmandu or other saved locations!

## How to Use

### Step 1: Start the App
```bash
cd frontend
npm run dev
```

### Step 2: Open Passenger Profile/Dashboard
Navigate to the passenger page where the map is shown.

### Step 3: Allow Location Access
When prompted by your browser:
- ✅ **Click "Allow"** to use your real location
- ❌ **Click "Block"** to use saved location instead

## What You'll See

### With GPS Enabled (Recommended)
```
Top-right corner: [✓ GPS Active] (Green button)
Top-left panel: 🟢 LIVE GPS | Accuracy: ±25m
Bottom-left: 📍 Live GPS Location (Green box)
Map: Centered on YOUR actual location
Drivers: Shows drivers actually near YOU
```

### Without GPS (Saved Location)
```
Top-right corner: [📍 Use My Location] (Gray button)
Top-left panel: ⚪ SAVED LOC
Bottom-left: 📌 Saved Location (Yellow box)
Map: Shows saved location from database
```

## Toggle Location Source

### Enable GPS:
1. Click **"Use My Location"** button (top-right)
2. Allow when browser asks
3. Map updates to your real location ✅

### Disable GPS:
1. Click **"GPS Active"** button (top-right)
2. Map switches back to saved location

## Verify Your Location

### Method 1: Console Link (Recommended)
1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Look for `[Map Debug] Passenger Location:`
4. **Click the Google Maps link**
5. Verify it shows your actual location

### Method 2: Visual Check
- Look at coordinates in bottom-left corner
- Check if map shows your actual surroundings
- Green box = using GPS (should be accurate)
- Yellow box = using saved location (might be wrong)

## Troubleshooting

### Location Permission Denied?

**Chrome/Edge:**
1. Click 🔒 in address bar
2. Location → Allow
3. Refresh page

**Firefox:**
1. Click 🔒 in address bar  
2. Clear Permission
3. Reload and allow

### Not Accurate?
- Go outdoors (GPS works better outside)
- Wait 10-20 seconds for GPS to lock
- Check "Accuracy" in top-left panel (should be <50m)

### Still Wrong Location?
Enable GPS tracking:
1. Click **"Use My Location"** button
2. Make sure it changes to green **"GPS Active"**
3. Check console for Google Maps link
4. Verify accuracy is good (±5-50m)

## For Drivers

Drivers should also send their real GPS location in heartbeats. If drivers are not at correct locations, they need to integrate the same geolocation tracking.

## Key Features

✅ **Automatic** - Updates as you move  
✅ **Accurate** - Uses GPS when available  
✅ **Private** - Location not stored  
✅ **Controllable** - Easy on/off toggle  
✅ **Visual Feedback** - Always know what's being used  

## Test It!

1. Enable GPS tracking
2. Note the drivers shown
3. Simulate moving to another city:
   - Open DevTools (F12)
   - Ctrl+Shift+P → "Show Sensors"
   - Change location to different city
   - See drivers update!

## Files Changed

- ✅ `frontend/src/hooks/use-geolocation.ts` - GPS tracking hook
- ✅ `frontend/src/hooks/use-passenger-dashboard.ts` - Dashboard integration
- ✅ `frontend/src/features/passenger/dashboard/PassengerMap.tsx` - Map UI
- ✅ `frontend/src/pages/passenger/Profile.tsx` - Profile page update

## Documentation

See `REALTIME_LOCATION_TRACKING.md` for complete technical documentation.

---

**Now your map shows where you ACTUALLY are!** 🎯📍

