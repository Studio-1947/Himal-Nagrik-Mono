import { ratingRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const ratingModule: ModuleDefinition = {
  name: 'rating',
  basePath: '/ratings',
  router: ratingRouter,
  enabled: true,
};






