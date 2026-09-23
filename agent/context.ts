// Ambient context, injected by the runtime at dispatch (tool layer dev spec
// §2). Never exposed in a tool schema -- userId in a schema would let the
// model claim to be any user, and now is injected so recency windows are
// testable without freezing system time.
import type { Pool } from 'pg';
import type { TxClient } from '../db/transaction';
import type { PaletteProvider } from './palette';
import type { ProposalReportSink } from './proposalReport';
import type { StatedWeather, WeatherSnapshot } from './weather';

// Snapshot of what get_candidates was called with, stashed by its handler so
// propose_outfit can persist the same weather/occasion/vibe onto the
// outfits row later in the same conversation (db/schema.sql: weather/vibe
// context is a decision-time snapshot, not a live lookup -- it must record
// what the agent was actually told, and get_candidates is the only tool
// call that receives it as model input). Mutable and conversation-scoped:
// each AgentContext instance backs exactly one conversation loop.
export interface CandidateCallSnapshot {
  occasion?: string;
  requestedVibe?: string;
  // The garment ids the last get_candidates call returned. get_palette
  // defaults to this set when the model omits garment_ids, and propose_outfit
  // uses it only for the failure report's context.
  candidateGarmentIds?: number[];
}

export interface AgentContext {
  userId: number;
  // Single-statement reads/writes pass this straight to the DAL, same
  // split as RequestContext (api/resolvers/context.ts) -- a bare Pool
  // structurally satisfies Queryable.
  pool: Pool;
  // Multi-statement writes (propose_outfit) call this instead of passing
  // ctx.pool -- it opens a transaction and hands the handler a branded
  // TxClient, the only thing proposeOutfit will accept.
  withTransaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>;
  // The effective weather the filter and the outfits snapshot use. Starts
  // equal to forecastWeather; get_candidates replaces it with
  // applyStatedWeather(forecastWeather, statedWeather) whenever the user has
  // stated the weather, so propose_outfit (which reads ctx.weather) records
  // what the proposal was actually made on.
  weather: WeatherSnapshot;
  // The untouched forecast (live or fallback), kept so get_candidates can
  // always show the user what the forecast said even after an override, and
  // so repeated calls re-derive from a stable base rather than compounding.
  forecastWeather: WeatherSnapshot;
  // Accumulated across get_candidates calls this conversation: once the user
  // says "it's 80 out", that sticks for later calls unless they restate it.
  statedWeather: StatedWeather | null;
  now: Date;
  lastCandidateCall: CandidateCallSnapshot | null;
  // Backs the get_palette tool. Injected, not a live import, so the loop can
  // run with the deterministic lookup provider and swap in image extraction
  // later without touching the tool.
  paletteProvider: PaletteProvider;
  // Where a discarded proposal's failure report goes (agent/proposalReport.ts).
  proposalReportSink: ProposalReportSink;
  // How many times propose_outfit has been called this conversation with a
  // well-formed garment set but an invalid look card. The first failure is a
  // corrective retry; the second files a report and ends the loop.
  presentationFailures: number;
}
