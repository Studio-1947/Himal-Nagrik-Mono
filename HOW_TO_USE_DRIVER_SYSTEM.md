# 🚗 How to Use the Driver System - Quick Start Guide

## For Drivers: Step-by-Step Instructions

### 1️⃣ Register as a Driver

1. Go to `/auth/register`
2. Fill in your basic information
3. Select **"Driver"** as your role
4. Complete registration

### 2️⃣ Set Up Your Profile

1. Go to **Driver Dashboard** (`/driver/profile`)
2. Fill in your details:
   - **Personal Info:** Name, phone, location, bio
   - **License:** License number
   - **Vehicle Info:**
     - Manufacturer (e.g., Toyota, Honda)
     - Model (e.g., Camry, Civic)
     - Registration number
     - Capacity (number of seats)
     - Color
   - **Stats:**
     - Total trips completed
     - Your rating (out of 5)
     - Years of experience
     - Cancellation rate
   - **Availability:**
     - Preferred shift (morning/day/evening/night)
     - Working days
3. Click **"Save changes"**

### 3️⃣ Go Online

1. In your Driver Dashboard, find the **"GPS-based Location & Status"** card
2. Enable GPS location when your browser asks
3. Click the **"Go Online"** toggle switch
4. ✅ Your status is now **"Available"**
5. The system will:
   - Track your real-time location
   - Send automatic heartbeat signals every 30 seconds
   - Make you visible to the dispatch system

> **💡 Important:** Keep the Driver Dashboard tab open while you're online!

### 4️⃣ Wait for Ride Requests

While online, you'll see:
- Your current location on the map
- Number of active drivers in the area
- Your availability status

When a passenger requests a ride nearby:
- 🔊 **You'll hear a notification sound**
- 📱 **A full-screen modal will appear**

### 5️⃣ Review the Ride Request

The notification shows:
- **Passenger Details:**
  - Name
  - Rating (⭐)
  - Phone number (with call button)
  
- **Trip Details:**
  - 📍 Pickup location
  - 📍 Dropoff location
  - 💰 Estimated fare
  
- **Timer:**
  - ⏱️ You have **60 seconds** to respond
  - Timer turns red in the last 30 seconds

### 6️⃣ Accept or Reject

**To Accept:**
- Click the green **"✅ Accept Ride"** button
- The booking is yours!
- Ride details will appear in your dashboard

**To Reject:**
- Click the red **"Reject"** button
- Optionally, provide a reason (e.g., "Too far away", "Taking a break")
- Click **"Confirm Reject"**
- The system will offer it to another driver

### 7️⃣ Navigate to Pickup

After accepting:
- The **Active Ride** card appears
- You'll see:
  - Passenger contact info
  - Pickup location
  - Dropoff location
  - Estimated fare
  
**Click "Navigate"** to open Google Maps with directions

### 8️⃣ Pick Up the Passenger

1. Drive to the pickup location
2. Call the passenger if needed (tap the phone button)
3. Once you arrive, click **"Start Trip"**

### 9️⃣ Drive to Destination

1. Follow your GPS to the dropoff location
2. The passenger can see your real-time location
3. Complete the journey safely

### 🔟 Complete the Trip

1. When you arrive at the destination
2. Click **"Complete Trip"**
3. ✅ Trip is complete!
4. You're ready for the next ride

### 📴 Go Offline

When you want to stop accepting rides:
1. Toggle the **"Go Online"** switch to OFF
2. ✅ Your status is now **"Unavailable"**
3. You won't receive new ride requests
4. Complete any ongoing rides first

---

## 📱 UI Elements Explained

### Driver Dashboard Components

**1. GPS-based Location & Status**
- Shows your current GPS location
- Online/offline toggle
- Last heartbeat timestamp
- Location accuracy

**2. Active Ride Card** (when you have an active ride)
- Passenger info with call button
- Pickup/dropoff locations
- Navigate button (opens Google Maps)
- "Start Trip" button (when heading to pickup)
- "Complete Trip" button (when passenger is on board)

**3. Ride Offer Notification** (full-screen modal)
- Appears when new ride request comes in
- Shows all trip details
- 60-second countdown timer
- Accept/reject buttons

**4. Driver Stats**
- Total trips completed
- Your rating
- Years of experience
- Cancellation rate

**5. Vehicle Information**
- Manufacturer and model
- Registration number
- Color
- Passenger capacity

---

## 🔔 Notifications

### You'll Receive Notifications For:

1. **New Ride Request** 🔊
   - Full-screen modal
   - Sound alert
   - 60-second timer

2. **Ride Accepted** ✅
   - Toast notification
   - Active ride card appears

3. **Trip Started** 🚗
   - Status updates
   - Navigation ready

4. **Trip Completed** 🎉
   - Success message
   - Ready for next ride

---

## 🗺️ Google Maps Integration

**When you click "Navigate":**
- Opens Google Maps in a new tab
- Shows directions to:
  - **Pickup location** (if heading to pickup)
  - **Dropoff location** (if passenger is on board)
- Use your phone's GPS for turn-by-turn directions

---

## ⚠️ Important Tips

### ✅ Do's

- ✅ Keep the Driver Dashboard open while online
- ✅ Respond to ride requests quickly (60-second timer)
- ✅ Keep your GPS enabled
- ✅ Update your vehicle info if it changes
- ✅ Complete your profile for better passenger trust
- ✅ Call passenger if you can't find the pickup location
- ✅ Mark yourself offline during breaks

### ❌ Don'ts

- ❌ Don't close the Driver Dashboard tab while online
- ❌ Don't disable GPS location
- ❌ Don't ignore ride requests (affects your rating)
- ❌ Don't accept rides if you need a break soon
- ❌ Don't forget to click "Complete Trip" when done

---

## 🐛 Common Issues

### "I'm not receiving ride requests"

**Check:**
1. ✅ You're online (toggle is ON)
2. ✅ GPS is enabled and working
3. ✅ Driver Dashboard tab is open
4. ✅ There are passengers requesting rides nearby
5. ✅ Your vehicle has available capacity

### "Notification sound didn't play"

**Reasons:**
- Browser blocked autoplay (click anywhere first)
- Device is muted
- Browser extension blocking audio

**Solution:** Enable browser sound permissions

### "I missed the 60-second timer"

**What happens:**
- Offer expires automatically
- Booking goes to another driver
- No penalty for missing one offer
- But frequent misses may affect your availability score

### "GPS location is inaccurate"

**Solutions:**
1. Allow high-accuracy GPS in browser
2. Move to an area with better signal
3. Restart your browser
4. Check your device's location settings

---

## 📊 How the System Finds You

The dispatch system:
1. Looks for drivers within **5km** of pickup location
2. Checks if you're **"available"** (online)
3. Verifies you sent a **heartbeat** in last 2 minutes
4. Checks if you have **available capacity**
5. Sends offer to the **nearest available driver first**

If you don't respond in 60 seconds:
- Offer expires
- Goes to the next available driver

---

## 🎯 Best Practices

### Maximize Your Earnings

1. **Stay Online During Peak Hours:**
   - Morning rush (7-9 AM)
   - Evening rush (5-7 PM)
   - Weekend nights (8 PM - 2 AM)

2. **Position Yourself Strategically:**
   - Near busy areas (malls, airports, stations)
   - High-demand neighborhoods
   - Event venues

3. **Respond Quickly:**
   - Accept rides within 10-15 seconds
   - Higher response rate = more ride offers

4. **Maintain High Rating:**
   - Be punctual
   - Keep vehicle clean
   - Be polite and professional
   - Follow GPS routes

5. **Communicate:**
   - Call if you're running late
   - Confirm pickup location if unclear
   - Let passenger know you've arrived

---

## 🆘 Need Help?

- **Technical Issues:** Contact support
- **Account Problems:** Check your profile settings
- **Payment Questions:** See earnings dashboard
- **Safety Concerns:** Use emergency button (coming soon)

---

## 🚀 You're Ready!

Now you know how to:
- ✅ Set up your driver profile
- ✅ Go online and receive ride requests
- ✅ Accept rides and navigate to passengers
- ✅ Complete trips successfully
- ✅ Troubleshoot common issues

**Happy driving! 🚗💨**


