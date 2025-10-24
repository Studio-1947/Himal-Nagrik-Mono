import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { pool } from '../config/database';

interface AuthenticatedRequest extends Request { 
  user: { 
    id: string; 
    role: 'passenger' | 'driver'; 
    name: string; 
    email: string;
  }; 
  token: string 
}

declare global {
  namespace Express {
    interface Request {
      user?: { 
        id: string; 
        role: 'passenger' | 'driver'; 
        name: string; 
        email: string;
      }; 
      token?: string;
    }
  }
}

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  landmark: z.string().optional(),
});

const createBookingSchema = z.object({
  pickupLocation: locationSchema,
  destinationLocation: locationSchema,
  pickupTime: z.string().datetime(),
  vehicleType: z.enum(['standard', 'premium', 'suv', 'shared']).default('standard'),
  passengerCount: z.number().int().min(1).max(8).default(1),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  specialRequests: z.string().max(500).optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['accepted', 'in_progress', 'completed', 'cancelled']),
  cancellationReason: z.string().optional(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  isAvailable: z.boolean().default(true),
});

const rateBookingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const bookingRouter = Router();

// Calculate fare based on distance, duration and vehicle type
const calculateFare = async (
  distance: number, 
  duration: number, 
  vehicleType: string
): Promise<number> => {
  const { rows } = await pool.query(
    'SELECT * FROM fare_config WHERE vehicle_type = $1 AND is_active = true',
    [vehicleType]
  );
  
  if (rows.length === 0) {
    throw new Error('Fare configuration not found');
  }

  const config = rows[0];
  const fare = config.base_fare + 
    (distance * config.per_km_rate) + 
    (duration * config.per_minute_rate);
    
  return Math.max(fare * config.surge_multiplier, config.minimum_fare);
};

// Create a new booking (Passenger only)
bookingRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'passenger') {
      return res.status(403).json({ message: 'Only passengers can create bookings' });
    }

    const data = createBookingSchema.parse(req.body);
    
    // Calculate estimated distance and duration (simplified)
    const estimatedDistance = 5; // km - In real app, use Google Maps API
    const estimatedDuration = 15; // minutes
    const estimatedFare = await calculateFare(estimatedDistance, estimatedDuration, data.vehicleType);

    const bookingId = randomUUID();
    
    const { rows } = await pool.query(`
      INSERT INTO bookings (
        id, passenger_id, pickup_location, destination_location, pickup_time,
        estimated_distance, estimated_duration, estimated_fare, vehicle_type,
        passenger_count, payment_method, special_requests
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      bookingId,
      req.user.id,
      JSON.stringify(data.pickupLocation),
      JSON.stringify(data.destinationLocation),
      data.pickupTime,
      estimatedDistance,
      estimatedDuration,
      estimatedFare,
      data.vehicleType,
      data.passengerCount,
      data.paymentMethod,
      data.specialRequests
    ]);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: rows[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        issues: error.issues
      });
    }
    next(error);
  }
});

// Get user's bookings
bookingRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, 
        p.name as passenger_name, p.phone as passenger_phone,
        d.name as driver_name, d.phone as driver_phone
      FROM bookings b
      LEFT JOIN app_users p ON b.passenger_id = p.id
      LEFT JOIN app_users d ON b.driver_id = d.id
    `;
    
    const params: any[] = [];
    
    if (req.user.role === 'passenger') {
      query += ` WHERE b.passenger_id = $1`;
      params.push(req.user.id);
    } else {
      query += ` WHERE b.driver_id = $1 OR (b.driver_id IS NULL AND b.status = 'pending')`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    
    res.json({
      bookings: rows,
      pagination: { page, limit, total: rows.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get specific booking
bookingRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, 
        p.name as passenger_name, p.phone as passenger_phone,
        d.name as driver_name, d.phone as driver_phone
      FROM bookings b
      LEFT JOIN app_users p ON b.passenger_id = p.id
      LEFT JOIN app_users d ON b.driver_id = d.id
      WHERE b.id = $1 AND (b.passenger_id = $2 OR b.driver_id = $2)
    `, [req.params.id, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking: rows[0] });
  } catch (error) {
    next(error);
  }
});

// Accept booking (Driver only)
bookingRouter.patch('/:id/accept', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can accept bookings' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if booking exists and is pending
      const { rows: bookingRows } = await client.query(
        'SELECT * FROM bookings WHERE id = $1 AND status = $2 FOR UPDATE',
        [req.params.id, 'pending']
      );
      
      if (bookingRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Booking not found or already accepted' });
      }

      // Update booking with driver
      const { rows } = await client.query(`
        UPDATE bookings 
        SET driver_id = $1, status = 'accepted', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [req.user.id, req.params.id]);

      await client.query('COMMIT');
      
      res.json({
        message: 'Booking accepted successfully',
        booking: rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Update booking status
bookingRouter.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateBookingStatusSchema.parse(req.body);
    
    // Check if user has permission to update this booking
    const { rows: bookingRows } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND (passenger_id = $2 OR driver_id = $2)',
      [req.params.id, req.user.id]
    );
    
    if (bookingRows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRows[0];
    let updateFields = ['status = $1', 'updated_at = NOW()'];
    let params = [data.status];
    let paramIndex = 2;

    if (data.status === 'cancelled') {
      updateFields.push(`cancelled_by = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
      
      if (data.cancellationReason) {
        updateFields.push(`cancellation_reason = $${paramIndex}`);
        params.push(data.cancellationReason);
        paramIndex++;
      }
    } else if (data.status === 'in_progress') {
      updateFields.push(`trip_started_at = NOW()`);
    } else if (data.status === 'completed') {
      updateFields.push(`trip_completed_at = NOW()`);
    }

    params.push(req.params.id);

    const { rows } = await pool.query(`
      UPDATE bookings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    res.json({
      message: 'Booking status updated successfully',
      booking: rows[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        issues: error.issues
      });
    }
    next(error);
  }
});

// Update driver location (Driver only)
bookingRouter.post('/location', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can update location' });
    }

    const data = updateLocationSchema.parse(req.body);
    
    await pool.query(`
      INSERT INTO driver_locations (id, driver_id, latitude, longitude, heading, speed, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (driver_id) 
      DO UPDATE SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        heading = EXCLUDED.heading,
        speed = EXCLUDED.speed,
        is_available = EXCLUDED.is_available,
        last_updated = NOW()
    `, [
      randomUUID(),
      req.user.id,
      data.latitude,
      data.longitude,
      data.heading,
      data.speed,
      data.isAvailable
    ]);

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        issues: error.issues
      });
    }
    next(error);
  }
});

// Get nearby drivers (Passenger only)
bookingRouter.get('/drivers/nearby', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'passenger') {
      return res.status(403).json({ message: 'Only passengers can view nearby drivers' });
    }

    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 10; // km

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Simple distance calculation (for production, use PostGIS)
    const { rows } = await pool.query(`
      SELECT 
        d.id,
        u.name,
        u.phone,
        u.vehicle,
        u.stats,
        dl.latitude,
        dl.longitude,
        dl.last_updated,
        (6371 * acos(cos(radians($1)) * cos(radians(dl.latitude)) * cos(radians(dl.longitude) - radians($2)) + sin(radians($1)) * sin(radians(dl.latitude)))) AS distance
      FROM app_users u
      JOIN driver_locations dl ON u.id = dl.driver_id
      WHERE u.role = 'driver' 
        AND dl.is_available = true
        AND dl.last_updated > NOW() - INTERVAL '10 minutes'
        AND (6371 * acos(cos(radians($1)) * cos(radians(dl.latitude)) * cos(radians(dl.longitude) - radians($2)) + sin(radians($1)) * sin(radians(dl.latitude)))) <= $3
      ORDER BY distance
      LIMIT 20
    `, [lat, lng, radius]);

    res.json({ drivers: rows });
  } catch (error) {
    next(error);
  }
});

// Rate a completed booking
bookingRouter.post('/:id/rate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = rateBookingSchema.parse(req.body);
    
    // Check if booking exists and is completed
    const { rows: bookingRows } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND status = $2 AND (passenger_id = $3 OR driver_id = $3)',
      [req.params.id, 'completed', req.user.id]
    );
    
    if (bookingRows.length === 0) {
      return res.status(404).json({ message: 'Completed booking not found' });
    }

    const booking = bookingRows[0];
    const ratedUserId = req.user.id === booking.passenger_id ? booking.driver_id : booking.passenger_id;

    // Check if already rated
    const { rows: existingRating } = await pool.query(
      'SELECT id FROM ratings WHERE booking_id = $1 AND rated_by = $2',
      [req.params.id, req.user.id]
    );

    if (existingRating.length > 0) {
      return res.status(400).json({ message: 'You have already rated this booking' });
    }

    // Insert rating
    await pool.query(`
      INSERT INTO ratings (id, booking_id, rated_by, rated_user, rating, comment)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      randomUUID(),
      req.params.id,
      req.user.id,
      ratedUserId,
      data.rating,
      data.comment
    ]);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        issues: error.issues
      });
    }
    next(error);
  }
});

export { bookingRouter };