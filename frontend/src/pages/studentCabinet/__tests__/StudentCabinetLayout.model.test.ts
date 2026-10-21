import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import { studentUserModel } from "@entities";
import { callModel } from "@features";
import type { StudentSession } from "@shared";

import { tutorCallRequested } from "../StudentCabinetLayout.model";

describe("StudentCabinetLayout.model tutorCallRequested", () => {
  it("should start a call to the tutor from the session", async () => {
    const scope = fork({
      values: [
        [studentUserModel.$studentSession, { tutor: { name: "Анна Петрова" } } as StudentSession],
      ],
    });
    const started: unknown[] = [];
    createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });

    await allSettled(tutorCallRequested, { scope });

    expect(started).toEqual([{ peerName: "Анна Петрова" }]);
  });

  it("should not start a call when the student has no linked tutor", async () => {
    const scope = fork({
      values: [[studentUserModel.$studentSession, { tutor: null } as StudentSession]],
    });
    const started: unknown[] = [];
    createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });

    await allSettled(tutorCallRequested, { scope });

    expect(started).toEqual([]);
  });
});
