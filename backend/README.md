# Himal Nagrik Backend

TypeScript + Express starter API that pairs with the Himal Nagrik frontend.

## Features
- Express server with security and logging middleware (Helmet, CORS, Morgan)
- Typed environment configuration with sensible defaults
- User authentication routes with hashed passwords and JWT-based sessions
- Health-check endpoint available at `/api/health`
- PostgreSQL connection bootstrap via environment-driven configuration
- Ready-to-use development (`npm run dev`) and production build (`npm run build && npm start`) scripts
- Vercel serverless handler (`api/index.ts`) for easy deployment

## Getting Started

```bash
cd backend
npm install
# macOS/Linux
cp .env.example .env
# Windows PowerShell
Copy-Item .env.example .env
```

Update `.env` with your actual settings—be sure to provide a strong `DATABASE_URL` and `JWT_SECRET` (the fallback in `.env.example` is for local development only)—and then run:

```bash
npm run dev
```

The API will start on `http://localhost:5000` by default.

## Deployment (Vercel)
1. Install the Vercel CLI if needed: `npm i -g vercel`
2. Log in and link the project: `vercel login` then `vercel link`
3. Configure required environment variables in Vercel (`DATABASE_URL`, `NODE_ENV`, `API_PREFIX`, `JWT_SECRET`, `PORT` if overriding) using:
   - `vercel env add DATABASE_URL production`
   - `vercel env add JWT_SECRET production`
   - repeat for other environments/variables as necessary (include `JWT_EXPIRES_IN` if you override the default)
4. Deploy: `vercel` for preview, `vercel --prod` for production.

The `vercel.json` file rewrites all incoming requests to the Express app served by `api/index.ts`, so the backend behaves the same as local `/` routes while running on Vercel's Node.js 20 runtime.

## Available Scripts
- `npm run dev` - runs the server with reload using ts-node-dev
- `npm run build` - compiles the TypeScript source to `dist`
- `npm start` - runs the compiled JavaScript from the `dist` folder
- `npm run typecheck` - verifies the project with the TypeScript compiler without emitting files
- `npm run seed` - inserts demo passengers, drivers, and rides for local testing

## Project Structure
```
backend/
  api/
    index.ts         # Vercel serverless entrypoint wrapping the Express app
  src/
    app.ts           # Express app configuration
    server.ts        # HTTP server bootstrap + DB connection lifecycle
    config/
      env.ts         # Environment variable helpers
      database.ts    # PostgreSQL pool helpers shared by server + serverless
    routes/
      index.ts       # API route registrations
  .env.example
  .env              # Local environment overrides (not committed)
  package.json
  tsconfig.json
  vercel.json
  README.md
```

## Next Steps
- Add domain-specific routes under `src/routes`
- Introduce persistence layers (repositories/services) using the shared `pool`
- Wire up automated tests to cover business logic
