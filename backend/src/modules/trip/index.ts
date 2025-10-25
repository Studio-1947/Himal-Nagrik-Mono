import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Trip lifecycle management and telemetry ingestion will be added later.
 */
export const tripModule: ModuleDefinition = {
  name: 'trip',
  basePath: '/trips',
  router,
  enabled: false,
};
