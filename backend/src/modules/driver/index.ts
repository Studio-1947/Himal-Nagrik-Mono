import { driverRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const driverModule: ModuleDefinition = {
  name: 'driver',
  basePath: '/drivers',
  router: driverRouter,
};

export * from './driver.types';
export * from './driver.validation';
