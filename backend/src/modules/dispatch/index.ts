import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Driver assignment, ranking, and fallback logic attaches here.
 */
export const dispatchModule: ModuleDefinition = {
  name: 'dispatch',
  basePath: '/dispatch',
  router,
  enabled: false,
};
