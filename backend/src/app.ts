import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env, isProduction } from './config/env';
import { registerRoutes } from './routes';

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  registerRoutes(app, env.apiPrefix);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      statusCode: 404,
      message: 'Resource not found',
      path: req.originalUrl,
    });
  });

  // Centralized error handler keeps route handlers lean.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (!isProduction) {
      console.error(err);
    }

    res.status(500).json({
      statusCode: 500,
      message: err.message || 'Internal server error',
    });
  });

  return app;
};
