import { tripRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const tripModule: ModuleDefinition = {
  name: 'trip',
  basePath: '/trips',
  router: tripRouter,
  enabled: true,
};
