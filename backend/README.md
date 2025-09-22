# Himal Nagrik Backend

TypeScript + Express starter API that pairs with the Himal Nagrik frontend.

## Features
- Express server with security and logging middleware (Helmet, CORS, Morgan)
- Typed environment configuration with sensible defaults
- Health-check endpoint available at `/api/health`
- PostgreSQL connection bootstrap via environment-driven configuration
- Ready-to-use development (`npm run dev`) and production build (`npm run build && npm start`) scripts

## Getting Started

```bash
cd backend
npm install
# macOS/Linux
cp .env.example .env
# Windows PowerShell
Copy-Item .env.example .env
```

Update `.env` with your actual settings, especially `DATABASE_URL` (Neon connection string shown in the example) and then run:

```bash
npm run dev
```

The API will start on `http://localhost:5000` by default.

## Available Scripts
- `npm run dev` - runs the server with reload using ts-node-dev
- `npm run build` - compiles the TypeScript source to `dist`
- `npm start` - runs the compiled JavaScript from the `dist` folder
- `npm run typecheck` - verifies the project with the TypeScript compiler without emitting files

## Project Structure
```
backend/
  src/
    app.ts            # Express app configuration
    server.ts         # HTTP server bootstrap + DB connection lifecycle
    config/
      env.ts          # Environment variable helpers
      database.ts     # PostgreSQL pool + verification helpers
    routes/
      index.ts        # API route registrations
  .env.example
  .env               # Local environment overrides (not committed)
  package.json
  tsconfig.json
  README.md
```

## Next Steps
- Add domain-specific routes under `src/routes`
- Introduce persistence layers (repositories/services) using the shared `pool`
- Wire up automated tests to cover business logic
