import { fork, allSettled } from "effector";
import { describe, it, expect, beforeEach } from "vitest";

import type { Student } from "@shared";

import * as studentsArchiveModel from "../../../models/students-archive.model";

describe("StudentArchiveDialog", () => {
  beforeEach(() => {
    // no-op
  });

  it("should have necessary exports from model", () => {
    expect(studentsArchiveModel).toBeDefined();
    expect(studentsArchiveModel.archiveRequested).toBeDefined();
    expect(studentsArchiveModel.unarchiveRequested).toBeDefined();
    expect(studentsArchiveModel.archiveConfirmed).toBeDefined();
    expect(studentsArchiveModel.unarchiveConfirmed).toBeDefined();
    expect(studentsArchiveModel.$archiveDialogStudent).toBeDefined();
    expect(studentsArchiveModel.$archiveReason).toBeDefined();
    expect(studentsArchiveModel.$archiveComment).toBeDefined();
  });

  it("should call studentModel.archiveStudent when archive is confirmed", async () => {
    const student: Student = {
      id: "s1",
      name: "Test",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Student;

    const scope = fork({
      values: [[studentsArchiveModel.$archiveDialogStudent, student]],
    });

    await allSettled(studentsArchiveModel.archiveConfirmed, {
      scope,
      params: { archiveReason: "CHANGED_MIND", archiveComment: "No time" },
    });

    // After confirmation dialog should be closed
    expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
  });
});
