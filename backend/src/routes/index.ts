import type { Application } from 'express';
import { Router } from 'express';

import { env } from '../config/env';
import { version } from '../../package.json';
import { attachModules } from '../modules';

const router = Router();

const renderHomePage = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Himal Nagrik API</title>
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top, #0f172a, #020617 60%);
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 18px;
      padding: 2.75rem 3.25rem;
      max-width: 36rem;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.55);
      text-align: center;
    }
    h1 {
      font-size: clamp(1.85rem, 2.5vw, 2.25rem);
      margin-bottom: 0.75rem;
    }
    p {
      margin: 0.35rem 0;
      line-height: 1.6;
    }
    a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(56, 189, 248, 0.14);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 999px;
      padding: 0.4rem 1rem;
      margin-bottom: 1.35rem;
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    .grid strong {
      color: #facc15;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">Backend Online</div>
    <h1>Himal Nagrik API</h1>
    <p>Version <strong>${version}</strong></p>
    <div class="grid">
      <p>Running on port <strong>${env.port}</strong></p>
      <p>Environment: <strong>${env.nodeEnv}</strong></p>
    </div>
    <p>Explore the API health check at <a href="${env.apiPrefix}/health">${env.apiPrefix}/health</a></p>
  </main>
</body>
</html>`;

type HealthResponse = {
  status: 'ok';
  message: string;
  uptime: number;
  timestamp: string;
  environment: string;
};

router.get<unknown, HealthResponse>('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'API is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

attachModules(router);

export const registerRoutes = (app: Application, prefix = '/api'): void => {
  app.get('/', (_req, res) => {
    res.type('html').send(renderHomePage());
  });

  app.use(prefix, router);
};
