// Second entry point, alongside server.ts. Shares composition.ts's single
// pool and withTransaction binding rather than constructing its own -- "one
// pool per process, reachable from both entry points" (server/transaction
// dev spec). It must never load its own config or construct its own Pool --
// that stays in composition.ts (which is also where .env is applied).
import { assertDatabaseReachable, pool, withTransaction } from '../composition';
import { runAgentLoop, type LoopDeps } from './loop';
import { AnthropicModelClient } from './modelClient';
import { LookupPaletteProvider } from './palette';
import { DEFAULT_REPORT_DIR, FileProposalReportSink } from './proposalReport';
import { OpenMeteoWeatherProvider, type Location } from './weather';

export { pool, withTransaction };

// Agent tools (tools/) call DAL functions directly, the same way
// api/resolvers/Mutation.ts does -- passing ctx.pool for single-statement
// ops or opening a transaction via withTransaction for multi-statement
// ones. Because those DAL calls never pass through resolvers/, every
// ownership check and invariant they rely on has to already live in the
// DAL itself (see the resolver-layer dev spec's acceptance test).
export async function assertReady(): Promise<void> {
  await assertDatabaseReachable();
}

// schema.sql's users table has no location column yet (loop.ts flags this
// as an open seam). Until it does, every user resolves to one hardcoded
// location so the loop can run end to end. Replace with a profile lookup
// once the column lands.
const DEFAULT_LOCATION: Location = { latitude: 40.7128, longitude: -74.006 };

export function buildLoopDeps(): LoopDeps {
  return {
    // API key comes from ANTHROPIC_API_KEY (loaded from .env by
    // composition.ts); the SDK reads it from the environment by default.
    modelClient: new AnthropicModelClient(),
    weatherProvider: new OpenMeteoWeatherProvider(),
    getLocationForUser: async () => DEFAULT_LOCATION,
    pool,
    withTransaction,
    now: () => new Date(),
    // Deterministic colour-name -> hex until the image extraction pipeline
    // exists (see agent/palette.ts). Swap for ImagePaletteProvider here.
    paletteProvider: new LookupPaletteProvider(),
    // In-app review inbox does not exist yet -- failures land as JSON files.
    proposalReportSink: new FileProposalReportSink(DEFAULT_REPORT_DIR),
  };
}

// CLI: `npm run agent -- <userId> "<message>"`. Minimal on purpose -- this
// is the first thing that exercises model + tools + DB together.
async function main(): Promise<void> {
  const [userIdArg, ...messageParts] = process.argv.slice(2);
  const userId = Number(userIdArg);
  const message = messageParts.join(' ').trim();

  if (!Number.isInteger(userId) || userId <= 0 || message.length === 0) {
    console.error('usage: npm run agent -- <userId> "<message>"');
    process.exit(2);
  }

  await assertReady();

  const result = await runAgentLoop(buildLoopDeps(), userId, message);

  console.log(JSON.stringify(result, null, 2));
}

// Run main() only when invoked directly, not when imported for its exports.
if (require.main === module) {
  main()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('[agent] failed:', err);
      await pool.end();
      process.exit(1);
    });
}
