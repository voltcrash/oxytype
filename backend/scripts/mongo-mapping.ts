import { BSON } from "mongodb";
// Offline legacy documents have heterogeneous fields. Output accepts SQL primitives only.
/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-member-access, typescript/no-unsafe-argument, typescript/no-unsafe-call, typescript/no-unsafe-return, typescript/no-explicit-any */
type Document = Record<string, any>;
export type ImportRow = {
  table: string;
  key: string[];
  values: Record<string, string | number | null>;
};
export const collections = [
  "authUsers",
  "authAccounts",
  "authSessions",
  "authVerifications",
  "authRateLimits",
  "users",
  "configs",
  "presets",
  "ape-keys",
  "connections",
  "results",
  "blocklist",
  "admin-uids",
  "configuration",
  "psa",
  "public",
  "new-quotes",
  "quote-rating",
  "reports",
  "logs",
  "errors",
];
export function normalize(value: unknown): any {
  if (value instanceof Date) return value.getTime();
  if (value instanceof BSON.ObjectId) return value.toHexString();
  if (value instanceof BSON.Double || value instanceof BSON.Int32) {
    return num(value.valueOf());
  }
  if (value instanceof BSON.Long) {
    const number = value.toNumber();
    if (
      !Number.isSafeInteger(number) ||
      BSON.Long.fromNumber(number).toString() !== value.toString()
    ) {
      throw new Error("Unsafe BSON integer; manual mapping required");
    }
    return number;
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalize);
  if ("_bsontype" in value) {
    throw new Error("Unsupported BSON type; manual mapping required");
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalize(item)]),
  );
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new Error("Required legacy string missing");
  }
  return value;
}
function num(value: unknown, fallback = 0): number {
  const number = value ?? fallback;
  if (typeof number !== "number" || !Number.isFinite(number)) {
    throw new Error("Invalid legacy number");
  }
  if (Number.isInteger(number) && !Number.isSafeInteger(number)) {
    throw new Error("Unsafe legacy integer");
  }
  return number;
}
function data(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded) > 1_500_000) {
    throw new Error(
      "Legacy JSON exceeds supported row budget; archive/split required",
    );
  }
  return encoded;
}
export function mapDocument(collection: string, source: unknown): ImportRow[] {
  const d = normalize(source) as Document;
  const rows: ImportRow[] = [];
  const row = (
    table: string,
    key: string[],
    values: ImportRow["values"],
  ): void => {
    rows.push({ table, key, values });
  };
  const id = text(d["_id"] ?? d["id"]);
  const legacyTimestamp = parseInt(id.slice(0, 8), 16) * 1000;
  const uid = d["uid"];
  const json = data(d);
  if (collection === "users") {
    row("users", ["uid"], {
      uid: text(uid),
      id,
      name: text(d["name"]),
      name_key: text(d["name"]).toLowerCase(),
      email: text(d["email"]),
      discord_id:
        d["discordId"] === undefined || d["discordId"] === ""
          ? null
          : text(d["discordId"]),
      added_at: num(d["addedAt"]),
      xp: num(d["xp"]),
      time_typing: num(d["timeTyping"]),
      completed_tests: num(d["completedTests"]),
      started_tests: num(d["startedTests"]),
      banned: Number(d["banned"] ?? false),
      lb_opt_out: Number(d["lbOptOut"] ?? false),
      needs_to_change_name: Number(d["needsToChangeName"] ?? false),
      data: json,
    });
    for (const mail of d["inbox"] ?? []) {
      row("inbox", ["uid", "id"], {
        uid,
        id: text(mail.id),
        timestamp: num(mail.timestamp),
        read: Number(mail.read ?? false),
        data: data(mail),
      });
      if (Number(mail.rewards?.length ?? 0) > 0) {
        row("reward_grants", ["id"], {
          id: `${uid}:${mail.id}`,
          uid,
          origin: text(mail.id),
          claimed: Number(mail.read ?? false),
          data: data({ rewards: mail.rewards }),
        });
      }
    }
    for (const [year, counts] of Object.entries(d["testActivity"] ?? {})) {
      if (!Array.isArray(counts)) {
        throw new Error("Invalid test activity array");
      }
      counts.forEach((count, day) => {
        if (count !== 0 && count !== null && count !== undefined) {
          row("user_activity", ["uid", "day"], {
            uid,
            day: Date.UTC(Number(year), 0, day + 1),
            count: num(count),
          });
        }
      });
    }
    for (const duration of ["15", "60"]) {
      const bests = d["personalBests"]?.time?.[duration] ?? [];
      const eligible = bests.filter(
        (pb: Document) =>
          pb["punctuation"] !== true &&
          pb["numbers"] !== true &&
          pb["lazyMode"] !== true &&
          (pb["difficulty"] ?? "normal") === "normal",
      );
      const stored = d["lbPersonalBests"]?.time?.[duration] ?? {};
      const languages = new Set<string>([
        ...eligible.map((pb: Document) => pb["language"] ?? "english"),
        ...Object.keys(stored),
      ]);
      for (const language of languages) {
        const best =
          stored[language] ??
          eligible
            .filter(
              (pb: Document) => (pb["language"] ?? "english") === language,
            )
            .sort(
              (a: Document, b: Document) =>
                b["wpm"] - a["wpm"] ||
                b["acc"] - a["acc"] ||
                b["timestamp"] - a["timestamp"],
            )[0];
        row("leaderboard_bests", ["board", "uid"], {
          uid,
          board: `${language}_time_${duration}`,
          wpm: num(best["wpm"]),
          acc: num(best["acc"]),
          timestamp: num(best["timestamp"]),
          data: data(best),
        });
      }
    }
  } else if (collection === "authUsers") {
    row("auth_users", ["id"], {
      id,
      name: text(d["name"]),
      email: text(d["email"]),
      email_verified: Number(d["emailVerified"] ?? false),
      image: d["image"] ?? null,
      disabled: Number(d["disabled"] ?? false),
      created_at: num(d["createdAt"]),
      updated_at: num(d["updatedAt"]),
    });
  } else if (collection === "authAccounts") {
    const values: ImportRow["values"] = {
      id,
      user_id: text(d["userId"]),
      account_id: text(d["accountId"]),
      provider_id: text(d["providerId"]),
      created_at: num(d["createdAt"]),
      updated_at: num(d["updatedAt"]),
    };
    for (const [from, to] of Object.entries({
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      scope: "scope",
      password: "password",
    })) {
      values[to] = d[from] ?? null;
    }
    row("auth_accounts", ["id"], values);
  } else if (collection === "authSessions") {
    row("auth_sessions", ["id"], {
      id,
      user_id: text(d["userId"]),
      token: text(d["token"]),
      expires_at: num(d["expiresAt"]),
      created_at: num(d["createdAt"]),
      updated_at: num(d["updatedAt"]),
      ip_address: d["ipAddress"] ?? null,
      user_agent: d["userAgent"] ?? null,
    });
  } else if (collection === "authVerifications") {
    row("auth_verifications", ["id"], {
      id,
      identifier: text(d["identifier"]),
      value: text(d["value"]),
      expires_at: num(d["expiresAt"]),
      created_at: num(d["createdAt"]),
      updated_at: num(d["updatedAt"]),
    });
  } else if (collection === "authRateLimits") {
    row("auth_rate_limits", ["id"], {
      id,
      key: text(d["key"]),
      count: num(d["count"]),
      last_request: num(d["lastRequest"]),
    });
  } else if (collection === "configs") {
    row("configs", ["uid"], {
      uid: text(uid),
      id,
      data: data(d["config"] ?? {}),
    });
  } else if (collection === "presets") {
    row("presets", ["id"], {
      id,
      uid: text(uid),
      timestamp: num(d["timestamp"] ?? legacyTimestamp),
      data: json,
    });
  } else if (collection === "ape-keys") {
    row("ape_keys", ["id"], {
      id,
      uid: text(uid),
      name: text(d["name"]),
      enabled: Number(d["enabled"]),
      hash: text(d["hash"]),
      created_on: num(d["createdOn"]),
      modified_on: num(d["modifiedOn"]),
      last_used_on: num(d["lastUsedOn"], -1),
      use_count: num(d["useCount"]),
    });
  } else if (collection === "results") {
    row("results", ["id"], {
      id,
      uid: text(uid),
      timestamp: num(d["timestamp"]),
      mode: text(d["mode"]),
      mode2: String(d["mode2"]),
      language: d["language"] ?? "english",
      wpm: num(d["wpm"]),
      acc: num(d["acc"]),
      submission_hash: d["submissionHash"] ?? null,
      data: json,
    });
  } else if (collection === "connections") {
    row("connections", ["id"], {
      id,
      key: [text(d["initiatorUid"]), text(d["receiverUid"])].sort().join("/"),
      initiator_uid: d["initiatorUid"],
      receiver_uid: d["receiverUid"],
      initiator_name: text(d["initiatorName"]),
      receiver_name: text(d["receiverName"]),
      status: text(d["status"]),
      last_modified: num(d["lastModified"]),
    });
  } else if (collection === "blocklist") {
    for (const [key, kind] of Object.entries({
      usernameHash: "name",
      emailHash: "email",
      discordIdHash: "discordId",
    })) {
      if (d[key] !== undefined && d[key] !== "") {
        row("blocklist", ["kind", "hash"], {
          kind,
          hash: text(d[key]),
          timestamp: num(d["timestamp"]),
        });
      }
    }
  } else if (collection === "admin-uids") {
    row("admin_uids", ["uid"], { uid: text(uid) });
  } else if (collection === "configuration") {
    const { _id, ...config } = d;
    row("configuration", ["id"], { id: "main", data: data(config) });
  } else if (collection === "psa") {
    row("psas", ["id"], { id, data: json });
  } else if (collection === "public") {
    if (id === "stats") {
      row("public_stats", ["id"], {
        id,
        tests_completed: num(d["testsCompleted"]),
        tests_started: num(d["testsStarted"]),
        time_typing: num(d["timeTyping"]),
      });
    } else if (id === "speedStatsHistogram") {
      for (const board of ["english_time_15", "english_time_60"]) {
        for (const [bucket, count] of Object.entries(d[board] ?? {})) {
          row("speed_histograms", ["board", "bucket"], {
            board,
            bucket,
            count: num(count),
          });
        }
      }
    } else {
      throw new Error("Unknown public document");
    }
  } else if (collection === "new-quotes") {
    row("quote_submissions", ["id"], {
      id,
      language: text(d["language"]),
      submitted_by: text(d["submittedBy"] ?? uid),
      timestamp: num(d["timestamp"]),
      approved: Number(d["approved"] ?? false),
      data: json,
    });
  } else if (collection === "quote-rating") {
    row("quote_ratings", ["language", "quote_id"], {
      id,
      language: text(d["language"]),
      quote_id: num(d["quoteId"]),
      ratings: num(d["ratings"]),
      total_rating: num(d["totalRating"]),
    });
  } else if (collection === "reports") {
    row("reports", ["id"], {
      id,
      report_id: text(d["id"]),
      uid: text(uid),
      content_id: text(d["contentId"]),
      type: text(d["type"]),
      timestamp: num(d["timestamp"]),
      data: json,
    });
  } else if (collection === "logs" || collection === "errors") {
    row("audit_logs", ["id"], {
      id,
      uid: d["uid"] ?? "",
      event: collection === "errors" ? "server_error" : text(d["event"]),
      timestamp: num(d["timestamp"]),
      important: Number(d["important"] ?? false),
      data: json,
    });
  } else {
    throw new Error(`Unsupported collection ${collection}`);
  }
  return rows;
}
function literal(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(num(value));
  return `'${value.replaceAll("'", "''")}'`;
}
/** D1 caps SQL at 100 KB. Split large text writes; import only into an offline/empty target. */
export function rowSql(row: ImportRow): string[] {
  const values = { ...row.values };
  const tails: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    if (value.includes("\0")) {
      throw new Error("NUL in legacy text; manual mapping required");
    }
    const parts = value.match(/[\s\S]{1,8000}/gu) ?? [""];
    if (parts.length > 1 && row.key.includes(key)) {
      throw new Error("Oversized legacy key");
    }
    values[key] = parts[0] ?? "";
    if (parts.length > 1) tails[key] = parts.slice(1);
  }
  const columns = Object.keys(values);
  const query = `INSERT INTO ${row.table}(${columns.join(",")}) VALUES(${columns.map((key) => literal(values[key] ?? null)).join(",")}) ON CONFLICT(${row.key.join(",")}) DO UPDATE SET ${
    columns
      .filter((key) => !row.key.includes(key))
      .map((key) => `${key}=excluded.${key}`)
      .join(",") || `${row.key[0]}=excluded.${row.key[0]}`
  };`;
  const queries = [query];
  for (const [column, parts] of Object.entries(tails)) {
    for (const part of parts) {
      queries.push(
        `UPDATE ${row.table} SET ${column}=${column}||${literal(part)} WHERE ${row.key.map((key) => `${key}=${literal(row.values[key] ?? null)}`).join(" AND ")};`,
      );
    }
  }
  if (queries.some((sql) => Buffer.byteLength(sql) > 90_000)) {
    throw new Error("SQL exceeds import query budget");
  }
  return queries;
}
