import { test as base, expect } from "@playwright/test";

import { createAndLoginTutor, type AuthCredentials } from "../helpers/auth";
import { resetDatabase } from "../helpers/db";

export type TutorFixture = {
  credentials: AuthCredentials;
  userId: string;
  token: string;
};

type Fixtures = {
  freshDb: void;
  tutor: TutorFixture;
};

export const test = base.extend<Fixtures>({
  freshDb: [
    async ({}, use) => {
      await resetDatabase();
      await use();
    },
    { auto: true },
  ],
  tutor: async ({ page }, use) => {
    const tutor = await createAndLoginTutor(page);
    await use(tutor);
  },
});

export { expect };
