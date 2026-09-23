// One-time setup run before the DAL suite (see package.json's
// "pretest:dal"). Resets the test schema exactly once, sequentially,
// before any test file starts -- test files themselves must never reset
// the schema, since node's test runner can run multiple files concurrently
// and a DROP TABLE racing an in-flight test in another file would corrupt
// results.
import { resetTestSchema, testPool } from './testDb';

async function main(): Promise<void> {
  await resetTestSchema();
  await testPool.end();
}

main().catch((err) => {
  console.error('[db] failed to reset test schema:', err);
  process.exit(1);
});
