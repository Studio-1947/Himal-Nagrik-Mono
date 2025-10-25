import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Ride request intake, fare estimation, and scheduling entry points.
 * Disabled placeholder that will be enabled once implemented.
 */
export const bookingModule: ModuleDefinition = {
  name: 'booking',
  basePath: '/bookings',
  router,
  enabled: false,
};
