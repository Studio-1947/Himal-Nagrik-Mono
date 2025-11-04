import { paymentRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const paymentModule: ModuleDefinition = {
  name: 'payment',
  basePath: '/payments',
  router: paymentRouter,
  enabled: true,
};
