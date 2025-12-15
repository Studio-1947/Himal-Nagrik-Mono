import { passengerRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const passengerModule: ModuleDefinition = {
  name: 'passenger',
  basePath: '/passengers',
  router: passengerRouter,
};

export * from './passenger.types';
export {
  locationPointSchema,
  createSavedLocationSchema,
  passengerProfilePatchSchema,
  savedLocationParamsSchema,
  passengerDashboardQuerySchema,
} from './passenger.validation';
