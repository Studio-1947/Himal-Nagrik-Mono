import { bookingRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const bookingModule: ModuleDefinition = {
  name: 'booking',
  basePath: '/bookings',
  router: bookingRouter,
};
