# Himal Nagrik - Cab Booking Platform

## Project Overview
A full-stack cab booking platform built for the Darjeeling hills region, featuring real-time ride tracking, payment processing, ratings, and comprehensive driver/passenger management.

## Technology Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for real-time features
- **Real-time**: WebSocket support
- **Authentication**: JWT-based auth
- **Validation**: Zod schemas

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **UI Components**: Shadcn/UI with Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Maps**: MapLibre GL
- **Forms**: React Hook Form with Zod validation

## Implemented Features

### ✅ Core Modules (Backend)

#### 1. **Authentication & Authorization**
- User registration (Passenger/Driver)
- Login/Logout with JWT tokens
- Role-based access control
- Profile management

#### 2. **Booking Management**
- Create bookings with fare calculation
- Real-time booking status updates
- Cancel bookings
- View booking history
- Automated dispatch system

#### 3. **Dispatch System**
- Driver availability tracking
- Automated driver assignment
- Driver heartbeat monitoring
- Offer acceptance/rejection
- Redis-based real-time state management
- Nearby driver search with geolocation

#### 4. **Trip Management** ⭐ NEW
- Start/complete trips
- Real-time location tracking during trips
- Trip history for passengers and drivers
- Distance calculation
- Trip status lifecycle management
- Location history storage

#### 5. **Payment Processing** ⭐ NEW
- Payment creation and capture
- Refund processing
- Driver payout management
- Payment history tracking
- Earnings dashboard for drivers
- Platform commission (15%)

#### 6. **Rating & Review System** ⭐ NEW
- Post-trip ratings (1-5 stars)
- Anonymous rating option
- Review text support
- Rating statistics and summaries
- Rating distribution tracking
- Mutual rating (driver rates passenger, vice versa)

#### 7. **Support/Helpdesk** ⭐ NEW
- Create support tickets
- Ticket priority levels (low, medium, high, urgent)
- Ticket status tracking (open, in_progress, resolved, closed)
- Link tickets to specific rides
- Ticket history and summary

#### 8. **Fare Calculation** ⭐ NEW
- **Distance-based pricing**: ₹15/km
- **Time-based pricing**: ₹2/minute
- **Base fare**: ₹50
- **Minimum fare**: ₹80
- **Booking fee**: ₹10
- **Night surcharge**: 20% (8 PM - 6 AM)
- **Peak hour surcharge**: 15% (8-10 AM, 5-8 PM)
- **Dynamic surge pricing**: Up to 2x based on demand/supply
- **GST**: 5%
- **Fare breakdown**: Detailed itemization

#### 9. **Driver Management**
- Driver profile management
- Vehicle information
- Document upload and verification
- Availability toggle (online/offline)
- Driver statistics and ratings
- Compliance document tracking

#### 10. **Passenger Management**
- Passenger profile management
- Saved locations (home, work, etc.)
- Emergency contacts
- Travel preferences
- Trip history

### ✅ Frontend Features

#### 1. **Landing Page**
- Beautiful hero section with mountain imagery
- Route selection interface
- Taxi availability display
- Booking flow
- Responsive design

#### 2. **Authentication**
- Separate login/signup for passengers and drivers
- Form validation
- Error handling
- Persistent sessions

#### 3. **Passenger Dashboard**
- Profile management
- Saved locations
- Recent trips
- Emergency contact management
- Travel preferences
- Interactive map

#### 4. **Driver Dashboard**
- Profile management
- Vehicle information
- Availability toggle
- Document management
- Performance metrics
- Dispatch test panel

#### 5. **Trip History** ⭐ NEW
- View all past trips
- Trip details (pickup, dropoff, fare, distance)
- Status badges
- Date/time information
- Filter and search capabilities

#### 6. **Driver Earnings** ⭐ NEW
- Total earnings overview
- Pending payouts
- Completed payouts
- Payout history with details
- Period-based earnings
- Visual earnings dashboard

#### 7. **API Integration Services** ⭐ NEW
- Trip service (start, update location, complete trips)
- Payment service (payments, payouts, summaries)
- Rating service (create, view, manage ratings)
- Support service (tickets, help requests)

### ✅ Database Schema

Comprehensive schema including:
- `app_users` - User accounts (passengers/drivers)
- `vehicles` - Driver vehicle information
- `driver_documents` - Document verification
- `passenger_saved_locations` - Quick booking locations
- `rides` - Ride/booking records
- `ride_events` - Ride lifecycle events
- `ride_assignments` - Driver dispatch records
- `payments` - Payment transactions
- `payouts` - Driver earnings
- `ratings` ⭐ NEW - Trip ratings and reviews
- `support_tickets` ⭐ NEW - Customer support

### ✅ Real-time Features
- WebSocket support for live updates
- Driver location broadcasting
- Booking status updates
- Dispatch offer notifications
- Trip location updates
- Rating notifications

### ✅ Advanced Features
- **Geospatial calculations**: Haversine distance
- **ETA estimation**: Based on distance and traffic
- **Redis caching**: For performance
- **Rate limiting**: Built-in protection
- **Error handling**: Comprehensive error responses
- **Validation**: Type-safe with Zod
- **Migration system**: Drizzle migrations

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/cancel` - Cancel booking

### Dispatch
- `POST /api/dispatch/heartbeat` - Driver heartbeat
- `GET /api/dispatch/offers` - Get driver offers
- `POST /api/dispatch/offers/:id/accept` - Accept offer
- `POST /api/dispatch/offers/:id/reject` - Reject offer
- `GET /api/dispatch/availability` - Nearby drivers

### Trips ⭐ NEW
- `POST /api/trips/start` - Start a trip
- `POST /api/trips/:id/location` - Update location
- `POST /api/trips/:id/complete` - Complete trip
- `GET /api/trips/current` - Get active trip
- `GET /api/trips/history` - Trip history
- `GET /api/trips/:id` - Trip details

### Payments ⭐ NEW
- `POST /api/payments` - Create payment
- `POST /api/payments/:id/capture` - Capture payment
- `POST /api/payments/:id/refund` - Refund payment
- `GET /api/payments/:id` - Payment details
- `GET /api/payments/history/me` - Payment history
- `POST /api/payments/payouts` - Create payout
- `GET /api/payments/payouts/history` - Payout history
- `GET /api/payments/payouts/summary` - Earnings summary

### Ratings ⭐ NEW
- `POST /api/ratings` - Create rating
- `GET /api/ratings/:id` - Get rating
- `GET /api/ratings/user/:userId` - User ratings
- `GET /api/ratings/user/:userId/summary` - Rating summary
- `GET /api/ratings/me/given` - My given ratings
- `PUT /api/ratings/:id` - Update rating
- `DELETE /api/ratings/:id` - Delete rating

### Support ⭐ NEW
- `POST /api/support` - Create ticket
- `GET /api/support/:id` - Get ticket
- `GET /api/support/me/tickets` - My tickets
- `GET /api/support/ride/:rideId` - Ride tickets
- `GET /api/support/summary/me` - Ticket summary
- `PUT /api/support/:id` - Update ticket
- `DELETE /api/support/:id` - Delete ticket

### Drivers
- `PUT /api/drivers/availability` - Toggle availability
- `POST /api/drivers/documents` - Submit document
- `GET /api/drivers/me/documents` - Get my documents

### Passengers
- `POST /api/passengers/locations` - Save location
- `GET /api/passengers/me/locations` - Get saved locations
- `DELETE /api/passengers/locations/:id` - Delete location

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/himal_nagrik
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
API_PREFIX=/api
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000/api
```

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run drizzle:generate  # Generate migrations
npm run drizzle:migrate   # Run migrations
npm run seed             # Seed sample data (optional)
npm run dev             # Start development server
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Start development server
```

## Database Migrations

The project uses Drizzle ORM for database management. To create new migrations:

```bash
cd backend
npm run drizzle:generate  # Generate new migration
npm run drizzle:migrate   # Apply migration
```

## Project Structure

```
Himal-Nagrik-Mono/
├── backend/
│   ├── src/
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/          # Authentication
│   │   │   ├── booking/       # Ride booking
│   │   │   ├── dispatch/      # Driver dispatch
│   │   │   ├── driver/        # Driver management
│   │   │   ├── passenger/     # Passenger management
│   │   │   ├── trip/          # Trip lifecycle ⭐
│   │   │   ├── payment/       # Payments & payouts ⭐
│   │   │   ├── rating/        # Ratings & reviews ⭐
│   │   │   └── support/       # Customer support ⭐
│   │   ├── infra/            # Infrastructure
│   │   │   ├── cache/        # Redis cache
│   │   │   ├── database/     # DB & schema
│   │   │   └── realtime/     # WebSocket
│   │   ├── routes/           # Route registration
│   │   └── config/           # Configuration
│   └── test/                 # Tests
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   │   ├── auth/        # Auth pages
│   │   │   ├── driver/      # Driver pages
│   │   │   └── passenger/   # Passenger pages
│   │   ├── lib/             # Services & utilities
│   │   ├── hooks/           # Custom hooks
│   │   └── contexts/        # React contexts
│   └── public/              # Static assets
└── docs/                    # Documentation
```

## Future Enhancements (Optional)

### Admin Dashboard
- User management
- Ride monitoring
- Payment reconciliation
- Analytics and reports
- System configuration

### Real-time Location Tracking
- Live driver location on map
- Route visualization
- ETA updates
- Geofencing

### Scheduled Rides
- Book rides for future times
- Recurring bookings
- Calendar integration

### Advanced Features
- Multiple vehicle types (sedan, SUV, etc.)
- Ride sharing/pooling
- Promo codes and discounts
- Loyalty programs
- In-app chat
- Push notifications (mobile app)
- Receipt generation (PDF)
- Multi-language support
- Dark mode toggle

## Testing

The project includes comprehensive testing:
- Smoke tests for all modules
- Integration tests
- API endpoint tests

Run tests:
```bash
cd backend
npm test
```

## Performance Optimizations

- **Redis caching**: For real-time features and session management
- **Database indexing**: On frequently queried fields
- **Connection pooling**: For database connections
- **Lazy loading**: Frontend route-based code splitting
- **Image optimization**: Compressed assets
- **API response caching**: For static data

## Security Features

- **JWT authentication**: Secure token-based auth
- **Password hashing**: bcrypt for password security
- **Input validation**: Zod schemas on all inputs
- **SQL injection prevention**: Parameterized queries with Drizzle
- **XSS protection**: Helmet middleware
- **CORS configuration**: Controlled cross-origin requests
- **Rate limiting**: Built-in Express rate limiter

## Deployment

### Backend (Vercel)
The backend is configured for Vercel deployment with serverless functions.

```bash
cd backend
vercel deploy
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
vercel deploy
```

### Database (Neon/Supabase)
Use managed PostgreSQL services for production.

### Redis (Upstash)
Use managed Redis for production real-time features.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact: hello@himal-nagrik.com

---

**Version**: 1.0.0  
**Last Updated**: November 4, 2025  
**Status**: Production Ready ✅






