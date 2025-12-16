import { adminRouter } from './admin.router';

import type { ModuleDefinition } from '../types';

/**
 * Admin/operations APIs (dashboards, controls) scaffold.
 */
export const adminModule: ModuleDefinition = {
  name: 'admin',
  basePath: '/admin',
  router: adminRouter,
  enabled: true,
};
