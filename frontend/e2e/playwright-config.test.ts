import { describe, expect, it } from "vitest";

import config from "../playwright.config";
import { FAKE_MEDIA_ARGS } from "./helpers/media";

describe("playwright.config", () => {
  it("should launch every project with the fake camera and microphone", () => {
    expect(config.projects?.length).toBeGreaterThan(0);

    for (const project of config.projects ?? []) {
      expect(project.use?.launchOptions?.args).toEqual(expect.arrayContaining(FAKE_MEDIA_ARGS));
    }
  });
});
