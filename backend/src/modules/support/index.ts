import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Customer support tooling (tickets, escalations) placeholder.
 */
export const supportModule: ModuleDefinition = {
  name: 'support',
  basePath: '/support',
  router,
  enabled: false,
};
