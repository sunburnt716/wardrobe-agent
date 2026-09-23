// Owns the Yoga instance, the request context factory, error masking, the
// HTTP listener, and lifecycle signals. Domain logic and invariant checks
// live in the DAL (api/dal), not here -- this file only wires things
// together. Imports composition.ts for the pool/withTransaction but does
// not construct either itself, so the agent entry point (agent/runtime.ts)
// can share the same pool without pulling in an HTTP listener as a side
// effect.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { GraphQLError } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { assertDatabaseReachable, pool } from './composition';
import { InvariantViolation } from './db/errors';
import { resolvers } from './api/resolvers';
import { buildContext, type RequestContext } from './api/resolvers/context';

const typeDefs = readFileSync(
  path.join(__dirname, 'api', 'schema.graphql'),
  'utf-8',
);

const schema = createSchema<RequestContext>({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  context: ({ request }) =>
    buildContext({ headers: Object.fromEntries(request.headers) }),
  maskedErrors: {
    errorMessage: 'Unexpected error.',
    maskError(error, message) {
      // InvariantViolation.code is the stable contract Tier 1 evals and
      // clients assert on -- it must survive into extensions.code. Every
      // other error (connection lost, malformed SQL, a bug) is genuinely
      // unexpected and gets the generic masked message instead, so
      // Postgres error text (table/column names) never reaches a client.
      if (error instanceof InvariantViolation) {
        return new GraphQLError(message, {
          extensions: { code: error.code },
        });
      }
      return new GraphQLError(message, {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    },
  },
});

const httpServer = createServer(yoga);

async function main(): Promise<void> {
  // Boot check: fail fast and exit non-zero rather than starting a
  // listener that would return 500s for every request.
  await assertDatabaseReachable();

  const port = Number(process.env.PORT ?? 4000);
  httpServer.listen(port, () => {
    console.log(`Wardrobe Agent GraphQL server listening on :${port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] received ${signal}, draining and shutting down`);
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
