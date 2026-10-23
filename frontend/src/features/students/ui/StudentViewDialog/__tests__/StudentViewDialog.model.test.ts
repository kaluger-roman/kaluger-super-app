import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import type { Student } from "@shared";

import { callModel } from "../../../../videoCall";
import { studentsModel } from "../../../models";
import { callRequested } from "../StudentViewDialog.model";

describe("StudentViewDialog.model callRequested", () => {
  it("should start a call to the student and close the dialog", async () => {
    const scope = fork();
    const started: unknown[] = [];
    let closed = 0;
    createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });
    createWatch({
      unit: studentsModel.viewDialogClosed,
      fn: () => {
        closed += 1;
      },
      scope,
    });

    await allSettled(callRequested, {
      scope,
      params: { id: "stu-1", name: "Иван Смирнов" } as Student,
    });

    expect(started).toEqual([{ studentId: "stu-1", peerName: "Иван Смирнов" }]);
    expect(closed).toBe(1);
  });
});
