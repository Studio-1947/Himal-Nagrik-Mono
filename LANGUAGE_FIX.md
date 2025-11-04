# Map Language Fix - Hindi to English

## Problem
The map was displaying labels in Hindi language because:
- OpenStreetMap's default tiles automatically show labels in the local language of the region
- For Nepal/India region, this defaults to Hindi/Nepali/local scripts
- This made the map difficult to read for English-speaking users

## Solution
Switched from OpenStreetMap default tiles to **CartoDB Voyager tiles** which:
- ✅ Display all labels in **English** regardless of region
- ✅ Maintain high accuracy for Nepal and surrounding areas
- ✅ Provide clean, readable street and place names
- ✅ Work without requiring any API keys or setup
- ✅ Free to use with proper attribution

## Changes Made

### File: `frontend/src/config/map.ts`
- Changed tile source from `tile.openstreetmap.org` to `basemaps.cartocdn.com/rastertiles/voyager`
- Added multiple tile servers (a, b, c) for better load distribution
- Updated attribution to include CARTO

## Result
- **All map labels now appear in English**
- Street names, place names, and landmarks are readable
- No API keys or configuration needed
- Maintains accurate mapping data for all regions

## For Advanced Users

If you need more control over language or want premium features:

### Option 1: Use Maptiler (Recommended for Production)
```bash
# 1. Sign up at https://www.maptiler.com/ (Free: 100k requests/month)
# 2. Get your API key
# 3. Create/edit frontend/.env file:
VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_KEY

# For other languages (e.g., Nepali):
# VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY&language=ne
```

### Option 2: Use Mapbox
```bash
# 1. Sign up at https://www.mapbox.com/ (Free: 50k requests/month)
# 2. Get your access token
# 3. Create/edit frontend/.env file:
VITE_MAP_STYLE_URL=https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=YOUR_TOKEN
```

## Verification

To verify the fix is working:
1. Start the frontend development server: `npm run dev`
2. Navigate to the map view
3. Check that all labels (street names, cities, landmarks) are in English
4. Zoom in/out to verify labels at different zoom levels

## Language Support Matrix

| Map Provider | Default Language | Multi-language Support | API Key Required |
|-------------|------------------|----------------------|------------------|
| **CartoDB Voyager** (Current) | English | No | ❌ No |
| OpenStreetMap Default | Local (Hindi/Nepali) | No | ❌ No |
| Maptiler | Configurable | ✅ Yes | ✅ Yes |
| Mapbox | Configurable | ✅ Yes | ✅ Yes |

## Troubleshooting

### Labels still showing in Hindi?
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+Shift+R)
3. Check that the tile URLs include `cartocdn.com/rastertiles/voyager`
4. Open browser DevTools → Network tab and verify tile requests

### Want to switch to a different language?
Use Maptiler or Mapbox with language parameter:
- English: `language=en`
- Nepali: `language=ne`
- Hindi: `language=hi`
- Spanish: `language=es`
- French: `language=fr`


