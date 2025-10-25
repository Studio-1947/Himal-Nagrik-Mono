import type { Router as ExpressRouter } from 'express';

import { authModule } from './auth';
import { adminModule } from './admin';
import { bookingModule } from './booking';
import { dispatchModule } from './dispatch';
import { driverModule } from './driver';
import { passengerModule } from './passenger';
import { paymentModule } from './payment';
import { supportModule } from './support';
import { tripModule } from './trip';
import type { ModuleDefinition } from './types';

const candidateModules: ModuleDefinition[] = [
  authModule,
  passengerModule,
  driverModule,
  bookingModule,
  dispatchModule,
  tripModule,
  paymentModule,
  supportModule,
  adminModule,
];

export const modules: ModuleDefinition[] = candidateModules.filter(
  (module) => module.enabled !== false,
);

export const attachModules = (router: ExpressRouter): void => {
  modules.forEach((module) => {
    router.use(module.basePath, module.router);
  });
};
