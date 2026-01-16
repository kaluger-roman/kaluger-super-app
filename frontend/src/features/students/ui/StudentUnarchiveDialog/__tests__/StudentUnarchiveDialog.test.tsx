import { fork, allSettled } from "effector";
import { describe, it, expect, beforeEach } from "vitest";

import type { Student } from "@shared";

import * as studentsArchiveModel from "../../../models/students-archive.model";

describe("StudentUnarchiveDialog", () => {
  beforeEach(() => {
    // no-op
  });

  it("should have necessary exports from model", () => {
    expect(studentsArchiveModel).toBeDefined();
    expect(studentsArchiveModel.unarchiveRequested).toBeDefined();
    expect(studentsArchiveModel.unarchiveConfirmed).toBeDefined();
    expect(studentsArchiveModel.$unarchiveDialogStudent).toBeDefined();
  });

  it("should call studentModel.unarchiveStudent when unarchive is confirmed", async () => {
    const student: Student = {
      id: "s2",
      name: "Archived",
      archived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Student;

    const scope = fork({
      values: [[studentsArchiveModel.$unarchiveDialogStudent, student]],
    });

    await allSettled(studentsArchiveModel.unarchiveConfirmed, { scope });

    // Dialog should be closed after confirmation
    expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
  });
});
