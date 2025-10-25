# Drizzle ORM Quick Start

This guide explains how we use **Drizzle ORM** in the backend and how to run the basics. If you are new to Drizzle, think of it as a type-safe layer on top of PostgreSQL that replaces handwritten SQL with composable builders.

## Why Drizzle?
- Strong TypeScript typing for queries and results.
- Schema files live alongside the code (`src/infra/database/schema`), making data model changes reviewable.
- `drizzle-kit` can generate SQL migrations from those schema definitions.
- Works directly with the existing `pg` pool, so it does not conflict with the current setup while we transition.

## Project Layout
- `drizzle.config.ts` – CLI configuration (schema path, output folder, database URL).
- `src/infra/database/schema` – Table definitions (`pgTable`, `jsonb`, etc.).
- `src/infra/database/drizzle.ts` – Shared Drizzle client created from the existing `pg` pool.
- `src/infra/database/index.ts` – Export surface used by modules (`database.db`, `database.pool`, `database.ensureConnection`).

## Common Commands
```bash
# Generate SQL migrations from the schema (writes to ./drizzle/)
npm run drizzle:generate

# Apply generated migrations
npm run drizzle:migrate
```

> Both commands read `DATABASE_URL` from your environment. Copy `backend/.env.example` to `.env` and fill in the connection string before running them.

## Writing Queries
```ts
import { database } from '@/infra/database';
import { appUsers } from '@/infra/database/schema';
import { eq } from 'drizzle-orm';

const users = await database.db
  .select()
  .from(appUsers)
  .where(eq(appUsers.role, 'driver'));
```

You still have access to `database.pool` for legacy SQL while we migrate route handlers. Avoid applying the legacy SQL migrations (`runMigrations`) and the Drizzle migrations on a brand-new database at the same time—stick to one path per environment until the transition is complete.

## Adding a New Table
1. Create a new definition inside `src/infra/database/schema` (or split into its own file and export from `index.ts`).
2. Run `npm run drizzle:generate` to produce the SQL migration.
3. Review/edit the generated SQL if needed.
4. Apply the migration locally with `npm run drizzle:migrate`.
5. Commit both the schema change and the generated SQL.

## Next Steps
- Refactor existing repositories (starting with Auth) to use `database.db`.
- Extend schemas with `relations()` helpers when we need typed joins.
- Configure CI to run Drizzle migrations during deploys.

If you get stuck or the CLI complains about credentials, double-check your `.env` and make sure PostgreSQL is reachable from your environment.
