import type { LocationPoint } from './booking.types';

interface FareBreakdown {
  label: string;
  amount: number;
}

interface FareCalculation {
  currency: string;
  amount: number;
  breakdown: FareBreakdown[];
  surgeMultiplier?: number;
  estimatedDistance?: number;
}

// Pricing constants (in INR)
const PRICING = {
  baseFare: 50,
  perKmRate: 15,
  perMinuteRate: 2,
  minimumFare: 80,
  bookingFee: 10,
  gstPercent: 5,
  nightSurchargePercent: 20, // 8 PM to 6 AM
  peakHourSurchargePercent: 15, // 8-10 AM, 5-8 PM
};

/**
 * Calculate distance between two points using Haversine formula
 */
const haversineDistanceKm = (from: LocationPoint, to: LocationPoint): number => {
  const R = 6371; // Earth radius in kilometers
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Estimate travel time based on distance (in minutes)
 */
const estimateTravelTimeMinutes = (distanceKm: number): number => {
  const averageSpeedKmh = 25; // Average speed in city
  return Math.ceil((distanceKm / averageSpeedKmh) * 60);
};

/**
 * Determine if current time is during night hours
 */
const isNightTime = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= 20 || hour < 6;
};

/**
 * Determine if current time is during peak hours
 */
const isPeakHour = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return (hour >= 8 && hour < 10) || (hour >= 17 && hour < 20);
};

/**
 * Calculate dynamic surge multiplier based on demand
 * This is a simplified version - in production, you'd use real-time data
 */
const calculateSurgeMultiplier = (
  availableDrivers: number,
  pendingBookings: number,
): number => {
  if (availableDrivers === 0) {
    return 2.0; // Maximum surge when no drivers available
  }

  const demandRatio = pendingBookings / availableDrivers;

  if (demandRatio >= 3) {
    return 2.0;
  } else if (demandRatio >= 2) {
    return 1.75;
  } else if (demandRatio >= 1.5) {
    return 1.5;
  } else if (demandRatio >= 1) {
    return 1.25;
  }

  return 1.0; // No surge
};

/**
 * Calculate fare for a ride
 */
export const calculateFare = (
  pickup: LocationPoint,
  dropoff: LocationPoint,
  options?: {
    scheduledTime?: Date;
    surgeMultiplier?: number;
    availableDrivers?: number;
    pendingBookings?: number;
  },
): FareCalculation => {
  const distanceKm = haversineDistanceKm(pickup, dropoff);
  const travelTimeMinutes = estimateTravelTimeMinutes(distanceKm);
  const scheduledTime = options?.scheduledTime || new Date();

  // Calculate base components
  const baseFare = PRICING.baseFare;
  const distanceFare = distanceKm * PRICING.perKmRate;
  const timeFare = travelTimeMinutes * PRICING.perMinuteRate;
  const bookingFee = PRICING.bookingFee;

  let subtotal = baseFare + distanceFare + timeFare + bookingFee;

  // Apply minimum fare
  if (subtotal < PRICING.minimumFare) {
    subtotal = PRICING.minimumFare;
  }

  const breakdown: FareBreakdown[] = [
    { label: 'Base fare', amount: Math.round(baseFare) },
    {
      label: `Distance (${distanceKm.toFixed(1)} km)`,
      amount: Math.round(distanceFare),
    },
    {
      label: `Time (${travelTimeMinutes} min)`,
      amount: Math.round(timeFare),
    },
    { label: 'Booking fee', amount: bookingFee },
  ];

  // Apply time-based surcharges
  if (isNightTime(scheduledTime)) {
    const nightSurcharge = Math.round(
      (subtotal * PRICING.nightSurchargePercent) / 100,
    );
    subtotal += nightSurcharge;
    breakdown.push({
      label: 'Night surcharge (20%)',
      amount: nightSurcharge,
    });
  } else if (isPeakHour(scheduledTime)) {
    const peakSurcharge = Math.round(
      (subtotal * PRICING.peakHourSurchargePercent) / 100,
    );
    subtotal += peakSurcharge;
    breakdown.push({
      label: 'Peak hour surcharge (15%)',
      amount: peakSurcharge,
    });
  }

  // Apply surge pricing
  let surgeMultiplier = options?.surgeMultiplier;
  if (!surgeMultiplier && options?.availableDrivers !== undefined) {
    surgeMultiplier = calculateSurgeMultiplier(
      options.availableDrivers,
      options.pendingBookings || 0,
    );
  }

  if (surgeMultiplier && surgeMultiplier > 1) {
    const surgeAmount = Math.round(subtotal * (surgeMultiplier - 1));
    subtotal += surgeAmount;
    breakdown.push({
      label: `Surge pricing (${surgeMultiplier.toFixed(1)}x)`,
      amount: surgeAmount,
    });
  }

  // Add GST
  const gst = Math.round((subtotal * PRICING.gstPercent) / 100);
  subtotal += gst;
  breakdown.push({
    label: `GST (${PRICING.gstPercent}%)`,
    amount: gst,
  });

  return {
    currency: 'INR',
    amount: Math.round(subtotal),
    breakdown,
    surgeMultiplier,
    estimatedDistance: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
  };
};

/**
 * Get current surge multiplier for a location
 */
export const getCurrentSurgeMultiplier = async (
  location: LocationPoint,
): Promise<number> => {
  // In production, this would:
  // 1. Query nearby available drivers
  // 2. Query pending bookings in the area
  // 3. Calculate surge based on supply/demand
  
  // For now, return a simple calculation
  // You could integrate this with the dispatch service
  return 1.0; // No surge by default
};

/**
 * Estimate fare range for a route
 */
export const estimateFareRange = (
  pickup: LocationPoint,
  dropoff: LocationPoint,
): { min: number; max: number; currency: string } => {
  const baseFare = calculateFare(pickup, dropoff);
  
  // Calculate with maximum surge
  const maxFare = calculateFare(pickup, dropoff, {
    surgeMultiplier: 2.0,
  });

  return {
    min: baseFare.amount,
    max: maxFare.amount,
    currency: 'INR',
  };
};



