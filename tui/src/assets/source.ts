import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FetchJson } from "@oxytype/typing-core/languages";
import { tryCatch } from "@oxytype/util/trycatch";

/** Shipped with the package: English 200 and English quotes. */
const bundledAssetsDir = join(import.meta.dir, "..", "..", "assets");

// Core requests `/languages/<name>.json` and `quotes/<name>.json`.
const assetPattern = /^\/?(languages|quotes)\/([a-z0-9_]+)\.json$/;

export class AssetUnavailableError extends Error {
  readonly asset: string;
  constructor(asset: string) {
    // Core quote loading treats 404 messages as an empty collection.
    super(`404: ${asset} is not bundled or cached`);
    this.name = "AssetUnavailableError";
    this.asset = asset;
  }
}

export type AssetSourceOptions = {
  /** Read-only packaged assets. */
  bundledDir?: string;
  /** Downloaded assets; searched after the bundled directory. */
  cacheDir?: string;
};

/** Core `FetchJson` adapter that reads local files only. */
export function createAssetSource(options: AssetSourceOptions = {}): FetchJson {
  const directories = [
    options.bundledDir ?? bundledAssetsDir,
    ...(options.cacheDir === undefined ? [] : [options.cacheDir]),
  ];

  return async (url) => {
    const match = assetPattern.exec(url);
    if (match === null) throw new Error(`Unsupported asset URL: ${url}`);
    const asset = `${match[1]}/${match[2]}.json`;

    for (const directory of directories) {
      const read = await tryCatch(readFile(join(directory, asset), "utf8"));
      if (read.error === null) return JSON.parse(read.data) as unknown;
      if (!("code" in read.error) || read.error.code !== "ENOENT") {
        throw read.error;
      }
    }
    throw new AssetUnavailableError(asset);
  };
}
