// When the agent produces an otherwise-valid proposal but cannot format a
// valid look card after one corrective retry, the proposal is discarded
// (never persisted -- validation runs before the DAL write) and a report is
// filed here for a human to review IN THE APP.
//
// The in-app inbox does not exist yet. Until it does, FileProposalReportSink
// drops one JSON file per failure into a directory. Swapping to a real sink
// (a DB table the app reads, a queue) is a one-implementation change wired
// in composition.ts -- nothing else references this shape.
//
// A discarded proposal is NOT marked rejected: 'rejected' is a user verdict
// on a look they were shown, and get_outfit_feedback reads rejections as
// signal. A card that never rendered was never shown.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProposalReport {
  userId: number;
  occasion: string | null;
  // The garment set the agent had settled on -- the proposal was sound
  // except for the card.
  garmentIds: number[];
  attemptedAt: string; // ISO
  // Human-readable validation failures from the last (second) attempt.
  validationErrors: string[];
  // Exactly what the model sent to propose_outfit on that attempt.
  rawModelInput: unknown;
}

export interface ProposalReportSink {
  file(report: ProposalReport): Promise<void>;
}

// Default sink: <dir>/proposal-<userId>-<iso-with-safe-chars>.json
export class FileProposalReportSink implements ProposalReportSink {
  constructor(private readonly dir: string) {}

  async file(report: ProposalReport): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const stamp = report.attemptedAt.replace(/[:.]/g, '-');
    const filename = `proposal-${report.userId}-${stamp}.json`;
    await writeFile(
      path.join(this.dir, filename),
      JSON.stringify(report, null, 2),
      'utf-8',
    );
  }
}

// Where FileProposalReportSink writes unless composition.ts overrides it.
export const DEFAULT_REPORT_DIR = path.join(__dirname, 'reports');
