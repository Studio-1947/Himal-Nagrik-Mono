import { dispatchRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const dispatchModule: ModuleDefinition = {
  name: 'dispatch',
  basePath: '/dispatch',
  router: dispatchRouter,
};
