import { Router } from 'express';

import type { ModuleDefinition } from '../types';

const router = Router();

/**
 * Payment capture, refunds, and payouts endpoints placeholder.
 */
export const paymentModule: ModuleDefinition = {
  name: 'payment',
  basePath: '/payments',
  router,
  enabled: false,
};
