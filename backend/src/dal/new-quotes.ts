import { simpleGit } from "simple-git";
import { Collection, ObjectId } from "mongodb";
import path from "path";
import { existsSync, writeFileSync } from "fs";
import { readFile } from "node:fs/promises";
import * as db from "../init/db";
import MonkeyError from "../utils/error";
import { compareTwoStrings } from "string-similarity";
import { ApproveQuote, Quote } from "@oxytype/schemas/quotes";
import { WithObjectId } from "../utils/misc";
import { parseWithSchema as parseJsonWithSchema } from "@oxytype/util/json";
import { z } from "zod/v3";
import { Language } from "@oxytype/schemas/languages";

const JsonQuoteSchema = z.object({
  text: z.string(),
  britishText: z.string().optional(),
  approvedBy: z.string().optional(),
  source: z.string(),
  length: z.number(),
  id: z.number(),
});

const QuoteDataSchema = z.object({
  language: z.string(),
  quotes: z.array(JsonQuoteSchema),
  groups: z.array(z.tuple([z.number(), z.number()])),
});

const quoteRepositoryPath = process.env["OXYTYPE_QUOTES_REPO_PATH"];
const git =
  quoteRepositoryPath !== undefined && quoteRepositoryPath !== ""
    ? simpleGit(quoteRepositoryPath)
    : undefined;

function requireQuoteRepositoryPath(): string {
  if (quoteRepositoryPath === undefined || quoteRepositoryPath === "" || !git) {
    throw new MonkeyError(503, "Oxytype quote repository is not configured.");
  }
  return quoteRepositoryPath;
}

async function verifyQuoteRepositoryRemote(): Promise<
  ReturnType<typeof simpleGit>
> {
  const quoteGit = git;
  if (!quoteGit) {
    throw new MonkeyError(503, "Oxytype quote repository is not configured.");
  }
  const expectedRemote = process.env["OXYTYPE_QUOTES_REMOTE_URL"];
  const actualRemote = (
    await quoteGit.raw(["remote", "get-url", "origin"])
  ).trim();
  if (
    expectedRemote === undefined ||
    expectedRemote === "" ||
    actualRemote !== expectedRemote ||
    /monkeytypegame/i.test(actualRemote)
  ) {
    throw new MonkeyError(
      503,
      "Oxytype quote repository remote is not allowed.",
    );
  }
  return quoteGit;
}

type AddQuoteReturn = {
  languageError?: number;
  duplicateId?: number;
  similarityScore?: number;
};

export type DBNewQuote = WithObjectId<Quote>;

// Export for use in tests
export const getNewQuoteCollection = (): Collection<DBNewQuote> =>
  db.collection<DBNewQuote>("new-quotes");

export async function add(
  text: string,
  source: string,
  language: Language,
  uid: string,
): Promise<AddQuoteReturn | undefined> {
  const repositoryPath = requireQuoteRepositoryPath();
  const quote = {
    _id: new ObjectId(),
    text: text,
    source: source,
    language: language.toLowerCase(),
    submittedBy: uid,
    timestamp: Date.now(),
    approved: false,
  };

  if (!/^\w+$/.test(language)) {
    throw new MonkeyError(500, `Invalid language name`, language);
  }

  const count = await getNewQuoteCollection().countDocuments({
    language,
  });

  if (count >= 100) {
    throw new MonkeyError(
      409,
      "There are already 100 quotes in the queue for this language.",
    );
  }

  //check for duplicate first
  const fileDir = path.join(
    repositoryPath,
    `frontend/static/quotes/${language}.json`,
  );
  let duplicateId = -1;
  let similarityScore = -1;
  if (existsSync(fileDir)) {
    const quoteFile = await readFile(fileDir);
    const quoteFileJSON = parseJsonWithSchema(
      quoteFile.toString(),
      QuoteDataSchema,
    );
    quoteFileJSON.quotes.every((old) => {
      if (compareTwoStrings(old.text, quote.text) > 0.9) {
        duplicateId = old.id;
        similarityScore = compareTwoStrings(old.text, quote.text);
        return false;
      }
      return true;
    });
  } else {
    return { languageError: 1 };
  }
  if (duplicateId !== -1) {
    return { duplicateId, similarityScore };
  }
  await db.collection("new-quotes").insertOne(quote);
  return undefined;
}

export async function get(language: Language | "all"): Promise<DBNewQuote[]> {
  const where: {
    approved: boolean;
    language?: Language;
  } = {
    approved: false,
  };

  if (!/^\w+$/.test(language)) {
    throw new MonkeyError(500, `Invalid language name`, language);
  }

  if (language !== "all") {
    where.language = language;
  }
  return await getNewQuoteCollection()
    .find(where)
    .sort({ timestamp: 1 })
    .limit(10)
    .toArray();
}

type ApproveReturn = {
  quote: ApproveQuote;
  message: string;
};

export async function approve(
  quoteId: string,
  editQuote: string | undefined,
  editSource: string | undefined,
  name: string,
): Promise<ApproveReturn> {
  const repositoryPath = requireQuoteRepositoryPath();
  const quoteGit = await verifyQuoteRepositoryRemote();
  //check mod status
  const targetQuote = await getNewQuoteCollection().findOne({
    _id: new ObjectId(quoteId),
  });
  if (!targetQuote) {
    throw new MonkeyError(
      404,
      "Quote not found. It might have already been reviewed. Please refresh the list.",
    );
  }
  const language = targetQuote.language;

  const approvedText = editQuote ?? targetQuote.text;
  const quote: ApproveQuote = {
    text: approvedText,
    source: editSource ?? targetQuote.source,
    length: approvedText.length,
    approvedBy: name,
    id: -1,
  };
  let message = "";

  if (!/^\w+$/.test(language)) {
    throw new MonkeyError(500, `Invalid language name`, language);
  }

  const fileDir = path.join(
    repositoryPath,
    `frontend/static/quotes/${language}.json`,
  );
  await quoteGit.pull("origin", "master");
  if (existsSync(fileDir)) {
    const quoteFile = await readFile(fileDir);
    const quoteObject = parseJsonWithSchema(
      quoteFile.toString(),
      QuoteDataSchema,
    );
    quoteObject.quotes.every((old) => {
      if (compareTwoStrings(old.text, quote.text) > 0.8) {
        throw new MonkeyError(409, "Duplicate quote");
      }
      return true;
    });
    let maxid = 0;
    quoteObject.quotes.map(function (q) {
      if (q.id > maxid) {
        maxid = q.id;
      }
    });
    quote.id = maxid + 1;

    if (quote.id === -1) {
      throw new MonkeyError(500, "Failed to get max id");
    }

    quoteObject.quotes.push(quote);
    writeFileSync(fileDir, JSON.stringify(quoteObject, null, 2));
    message = `Added quote to ${language}.json.`;
  } else {
    //file doesnt exist, create it
    quote.id = 1;
    writeFileSync(
      fileDir,
      JSON.stringify({
        language: language,
        groups: [
          [0, 100],
          [101, 300],
          [301, 600],
          [601, 9999],
        ],
        quotes: [quote],
      }),
    );
    message = `Created file ${language}.json and added quote.`;
  }
  await quoteGit.add([`frontend/static/quotes/${language}.json`]);
  await quoteGit.commit(`Added quote to ${language}.json`);
  await quoteGit.push("origin", "master");
  await getNewQuoteCollection().deleteOne({ _id: new ObjectId(quoteId) });
  return { quote, message };
}

export async function refuse(quoteId: string): Promise<void> {
  await getNewQuoteCollection().deleteOne({ _id: new ObjectId(quoteId) });
}
