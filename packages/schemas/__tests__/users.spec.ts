import { describe, expect, it } from "vite-plus/test";
import { UserNameSchema, UserProfileDetailsSchema } from "../src/users";

describe("user content filtering", () => {
  it.each(["miodec", "Miodec", "newMiodec"])(
    "accepts the former upstream reserved name: %s",
    (name) => {
      expect(UserNameSchema.safeParse(name).success).toBe(true);
    },
  );

  it("allows the original author to be mentioned in profiles", () => {
    expect(
      UserProfileDetailsSchema.safeParse({
        bio: "Based on work by Miodec",
        socialProfiles: { github: "miodec" },
      }).success,
    ).toBe(true);
  });

  it.each(["newBitly", "asshole"])(
    "continues rejecting disallowed content: %s",
    (name) => {
      expect(UserNameSchema.safeParse(name).success).toBe(false);
    },
  );
});
