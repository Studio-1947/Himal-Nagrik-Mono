import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Admin/operations APIs (dashboards, controls) scaffold.
 */
export const adminModule: ModuleDefinition = {
  name: 'admin',
  basePath: '/admin',
  router,
  enabled: false,
};
