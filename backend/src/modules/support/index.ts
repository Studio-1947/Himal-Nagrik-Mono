import { supportRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const supportModule: ModuleDefinition = {
  name: 'support',
  basePath: '/support',
  router: supportRouter,
  enabled: true,
};
