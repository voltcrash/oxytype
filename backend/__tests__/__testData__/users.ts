import { mutateUser } from "../../src/db/mutation";
import * as UserDAL from "../../src/dal/user";
import { newId } from "../../src/utils/id";
import { PersonalBest } from "@oxytype/schemas/shared";

export async function createUser(
  user?: Partial<UserDAL.DBUser>,
): Promise<UserDAL.DBUser> {
  const uid = newId();
  await UserDAL.addUser(`user${uid}`, `${uid}@example.com`, uid);
  await mutateUser(uid, (profile) => {
    Object.assign(profile, user);
  });
  return await UserDAL.getUser(uid, "test");
}

export async function createUserWithoutMigration(
  user?: Partial<UserDAL.DBUser>,
): Promise<UserDAL.DBUser> {
  const uid = newId();
  await UserDAL.addUser(`user${uid}`, `${uid}@example.com`, uid);
  await mutateUser(uid, (profile) => {
    Object.assign(profile, user);
  });
  await mutateUser(uid, (profile) => {
    delete profile.testActivity;
  });

  return await UserDAL.getUser(uid, "test");
}

export function pb(
  wpm: number,
  acc: number = 90,
  timestamp: number = 1,
): PersonalBest {
  return {
    acc,
    consistency: 100,
    difficulty: "normal",
    lazyMode: false,
    language: "english",
    punctuation: false,
    raw: wpm + 1,
    wpm,
    timestamp,
  };
}
