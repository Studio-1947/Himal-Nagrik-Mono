import type { Router } from 'express';

export type ModuleDefinition = {
  /** Human readable identifier */
  name: string;
  /** Base path mounted under the API prefix */
  basePath: string;
  /** Express router handling the module's HTTP surface */
  router: Router;
  /** Optionally disable mounting while a module is under construction */
  enabled?: boolean;
};
