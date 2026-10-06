import { readFile } from "node:fs/promises";
import {
  calibrate,
  extractSamples,
  type TimingSample,
} from "../src/anticheat/calibration";

const USAGE = `Usage: pnpm anticheat:calibrate <label>=<file.json> [...]

Each file holds timing samples: an /admin/anticheat/audits?event=anticheat_sample
response, audit rows, or an array of { keySpacing, keyDuration }. Label files
by what they are known to contain, e.g. human=reviewed.json bot=generated.json.
Prints, per label, how often each review signal fires and feature spreads.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.some((arg) => !arg.includes("="))) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const labelled = new Map<string, TimingSample[]>();
  for (const arg of args) {
    const [label = "", path = ""] = arg.split(/=(.*)/s);
    const samples = extractSamples(
      JSON.parse(await readFile(path, "utf8")) as unknown,
    );
    labelled.set(label, [...(labelled.get(label) ?? []), ...samples]);
  }
  const report = Object.fromEntries(
    [...labelled].map(([label, samples]) => [label, calibrate(samples)]),
  );
  console.log(JSON.stringify(report, null, 2));
}
void main();
