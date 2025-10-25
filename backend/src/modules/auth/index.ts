import { authRouter } from './http/router';
import type { ModuleDefinition } from '../types';

export const authModule: ModuleDefinition = {
  name: 'auth',
  basePath: '/auth',
  router: authRouter,
};

export * from './auth.types';
export {
  registerSchema,
  passengerRegisterSchema,
  driverRegisterSchema,
  loginSchema,
  profileUpdateSchema,
  passengerProfileUpdateSchema,
  driverProfileUpdateSchema,
} from './auth.validation';
