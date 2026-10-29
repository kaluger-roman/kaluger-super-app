import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import type { Student } from "@shared";

import { callConfirmModel, callModel } from "../../../../videoCall";
import { studentsModel } from "../../../models";
import { callRequested } from "../StudentViewDialog.model";

const STUDENT = { id: "stu-1", name: "Иван Смирнов" } as Student;

const LESSON = {
  id: "lesson-1",
  subject: "MATHEMATICS" as const,
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
};

const setup = () => {
  const scope = fork({
    values: [
      [studentsModel.$isViewDialogOpen, true],
      [studentsModel.$viewingStudent, STUDENT],
    ],
  });
  const started: unknown[] = [];
  createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });
  return { scope, started };
};

describe("StudentViewDialog.model callRequested", () => {
  it("should open the confirmation without a lesson and keep the card open", async () => {
    const { scope, started } = setup();

    await allSettled(callRequested, { scope, params: STUDENT });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(true);
    expect(scope.getState(callConfirmModel.$call)).toEqual({
      studentId: "stu-1",
      peerName: "Иван Смирнов",
      lesson: null,
    });
    expect(started).toEqual([]);
    expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(true);
  });

  it("should start the call and close the card once the call is confirmed", async () => {
    const { scope, started } = setup();

    await allSettled(callRequested, { scope, params: STUDENT });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(started).toEqual([{ studentId: "stu-1", peerName: "Иван Смирнов", lesson: null }]);
    expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(false);
  });

  it("should keep the card open and start nothing when the confirmation is dismissed", async () => {
    const { scope, started } = setup();

    await allSettled(callRequested, { scope, params: STUDENT });
    await allSettled(callConfirmModel.confirmDismissed, { scope });

    expect(started).toEqual([]);
    expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(true);
  });

  it("should leave the card alone when a lesson call is confirmed", async () => {
    const { scope } = setup();

    await allSettled(callConfirmModel.callRequested, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван Смирнов", lesson: LESSON },
    });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(true);
  });
});
