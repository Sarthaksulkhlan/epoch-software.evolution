import { run as lateDisputeAfterArchival } from './late-dispute-after-archival.js';

// Each probe runs in this fresh process, so module state starts empty.
const results = [lateDisputeAfterArchival()];
process.stdout.write(`${JSON.stringify(results)}\n`);
