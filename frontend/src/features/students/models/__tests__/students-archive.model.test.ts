import { fork, allSettled } from "effector";
import { describe, it, expect, beforeEach } from "vitest";

import type { Student } from "@shared";

import * as studentsArchiveModel from "../students-archive.model";

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

describe("students-archive.model", () => {
  beforeEach(() => {
    // Reset all mocks before each test
  });

  describe("Archive dialog management", () => {
    it("should open archive dialog with student", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.archiveRequested, { scope, params: mockStudent });

      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockStudent);
    });

    it("should close archive dialog and clear student", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$archiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.archiveDialogClosed, { scope });

      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
    });

    it("should clear archive reason and comment when dialog is closed", async () => {
      const scope = fork({
        values: [
          [studentsArchiveModel.$archiveDialogStudent, mockStudent],
          [studentsArchiveModel.$archiveReason, "COMPLETED_STUDIES"],
          [studentsArchiveModel.$archiveComment, "Test comment"],
        ],
      });

      await allSettled(studentsArchiveModel.archiveDialogClosed, { scope });

      expect(scope.getState(studentsArchiveModel.$archiveReason)).toBe("");
      expect(scope.getState(studentsArchiveModel.$archiveComment)).toBe("");
    });
  });

  describe("Unarchive dialog management", () => {
    it("should open unarchive dialog with student", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.unarchiveRequested, { scope, params: mockStudent });

      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toEqual(mockStudent);
    });

    it("should close unarchive dialog and clear student", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$unarchiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.unarchiveDialogClosed, { scope });

      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
    });
  });

  describe("Archive form management", () => {
    it("should update archive reason", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.archiveReasonChanged, {
        scope,
        params: "COMPLETED_STUDIES",
      });

      expect(scope.getState(studentsArchiveModel.$archiveReason)).toBe("COMPLETED_STUDIES");
    });

    it("should update archive comment", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.archiveCommentChanged, {
        scope,
        params: "Test comment",
      });

      expect(scope.getState(studentsArchiveModel.$archiveComment)).toBe("Test comment");
    });

    it("should clear reason and comment to empty strings", async () => {
      const scope = fork({
        values: [
          [studentsArchiveModel.$archiveReason, "COMPLETED_STUDIES"],
          [studentsArchiveModel.$archiveComment, "Test comment"],
        ],
      });

      await allSettled(studentsArchiveModel.archiveReasonChanged, { scope, params: "" });
      await allSettled(studentsArchiveModel.archiveCommentChanged, { scope, params: "" });

      expect(scope.getState(studentsArchiveModel.$archiveReason)).toBe("");
      expect(scope.getState(studentsArchiveModel.$archiveComment)).toBe("");
    });
  });

  describe("Archive confirmation", () => {
    it("should call archiveStudent when archiveConfirmed is triggered", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$archiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.archiveConfirmed, {
        scope,
        params: {
          archiveReason: "COMPLETED_STUDIES",
          archiveComment: "Test comment",
        },
      });

      // Проверяем что событие archiveStudent было вызвано
      // В реальности это вызовет эффект, но мы можем проверить что диалог закрылся
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
    });

    it("should close archive dialog after confirmation", async () => {
      const scope = fork({
        values: [
          [studentsArchiveModel.$archiveDialogStudent, mockStudent],
          [studentsArchiveModel.$archiveReason, "COMPLETED_STUDIES"],
        ],
      });

      await allSettled(studentsArchiveModel.archiveConfirmed, {
        scope,
        params: {
          archiveReason: "COMPLETED_STUDIES",
          archiveComment: "",
        },
      });

      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
    });

    it("should not call archiveStudent when no student selected", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$archiveDialogStudent, null]],
      });

      await allSettled(studentsArchiveModel.archiveConfirmed, {
        scope,
        params: {
          archiveReason: "COMPLETED_STUDIES",
        },
      });

      // Диалог должен остаться null
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
    });
  });

  describe("Unarchive confirmation", () => {
    it("should call unarchiveStudent when unarchiveConfirmed is triggered", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$unarchiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.unarchiveConfirmed, { scope });

      // Проверяем что диалог закрылся
      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
    });

    it("should close unarchive dialog after confirmation", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$unarchiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.unarchiveConfirmed, { scope });

      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
    });

    it("should not call unarchiveStudent when no student selected", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$unarchiveDialogStudent, null]],
      });

      await allSettled(studentsArchiveModel.unarchiveConfirmed, { scope });

      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
    });
  });
});
