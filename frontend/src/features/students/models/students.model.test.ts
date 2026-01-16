import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import type { Student } from "@shared";

import * as studentsModel from "./students.model";

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

describe("students.model", () => {
  describe("Dialog management", () => {
    it("should open dialog with student", async () => {
      const scope = fork();

      await allSettled(studentsModel.dialogOpened, {
        scope,
        params: mockStudent,
      });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$editingStudent)).toEqual(mockStudent);
    });

    it("should open dialog without student", async () => {
      const scope = fork();

      await allSettled(studentsModel.dialogOpened, {
        scope,
        params: undefined,
      });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$editingStudent)).toBeUndefined();
    });

    it("should close dialog and clear editing student", async () => {
      const scope = fork({
        values: [
          [studentsModel.$isDialogOpen, true],
          [studentsModel.$editingStudent, mockStudent],
        ],
      });

      await allSettled(studentsModel.dialogClosed, { scope });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(false);
      expect(scope.getState(studentsModel.$editingStudent)).toBeUndefined();
    });
  });

  describe("View dialog management", () => {
    it("should open view dialog with student", async () => {
      const scope = fork();

      await allSettled(studentsModel.viewDialogOpened, {
        scope,
        params: mockStudent,
      });

      expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$viewingStudent)).toEqual(mockStudent);
    });

    it("should close view dialog and clear viewing student", async () => {
      const scope = fork({
        values: [
          [studentsModel.$isViewDialogOpen, true],
          [studentsModel.$viewingStudent, mockStudent],
        ],
      });

      await allSettled(studentsModel.viewDialogClosed, { scope });

      expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(false);
      expect(scope.getState(studentsModel.$viewingStudent)).toBeUndefined();
    });
  });

  describe("Delete dialog management", () => {
    it("should open delete dialog with student", async () => {
      const scope = fork();

      await allSettled(studentsModel.deleteDialogOpened, {
        scope,
        params: mockStudent,
      });

      expect(scope.getState(studentsModel.$deleteDialogStudent)).toEqual(mockStudent);
    });

    it("should close delete dialog and clear student", async () => {
      const scope = fork({
        values: [[studentsModel.$deleteDialogStudent, mockStudent]],
      });

      await allSettled(studentsModel.deleteDialogClosed, { scope });

      expect(scope.getState(studentsModel.$deleteDialogStudent)).toBeNull();
    });
  });

  describe("Menu management", () => {
    const mockAnchorEl = document.createElement("div");

    it("should open menu with anchor and student", async () => {
      const scope = fork();

      await allSettled(studentsModel.menuOpened, {
        scope,
        params: { anchorEl: mockAnchorEl, student: mockStudent },
      });

      expect(scope.getState(studentsModel.$anchorEl)).toBe(mockAnchorEl);
      expect(scope.getState(studentsModel.$selectedStudent)).toEqual(mockStudent);
    });

    it("should close menu and clear anchor and student", async () => {
      const scope = fork({
        values: [
          [studentsModel.$anchorEl, mockAnchorEl],
          [studentsModel.$selectedStudent, mockStudent],
        ],
      });

      await allSettled(studentsModel.menuClosed, { scope });

      expect(scope.getState(studentsModel.$anchorEl)).toBeNull();
      expect(scope.getState(studentsModel.$selectedStudent)).toBeNull();
    });
  });

  describe("Edit from menu", () => {
    const mockAnchorEl = document.createElement("div");

    it("should open edit dialog when editing from menu", async () => {
      const scope = fork({
        values: [
          [studentsModel.$selectedStudent, mockStudent],
          [studentsModel.$anchorEl, mockAnchorEl],
        ],
      });

      await allSettled(studentsModel.editFromMenuRequested, { scope });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$editingStudent)).toEqual(mockStudent);
      expect(scope.getState(studentsModel.$anchorEl)).toBeNull();
      expect(scope.getState(studentsModel.$selectedStudent)).toBeNull();
    });

    it("should not open dialog when no student selected", async () => {
      const scope = fork({
        values: [[studentsModel.$selectedStudent, null]],
      });

      await allSettled(studentsModel.editFromMenuRequested, { scope });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$editingStudent)).toBeUndefined();
    });
  });

  describe("Delete from menu", () => {
    const mockAnchorEl = document.createElement("div");

    it("should open delete dialog when deleting from menu", async () => {
      const scope = fork({
        values: [
          [studentsModel.$selectedStudent, mockStudent],
          [studentsModel.$anchorEl, mockAnchorEl],
        ],
      });

      await allSettled(studentsModel.deleteFromMenuRequested, { scope });

      expect(scope.getState(studentsModel.$deleteDialogStudent)).toEqual(mockStudent);
      expect(scope.getState(studentsModel.$anchorEl)).toBeNull();
      expect(scope.getState(studentsModel.$selectedStudent)).toBeNull();
    });

    it("should not open delete dialog when no student selected", async () => {
      const scope = fork({
        values: [[studentsModel.$selectedStudent, null]],
      });

      await allSettled(studentsModel.deleteFromMenuRequested, { scope });

      expect(scope.getState(studentsModel.$deleteDialogStudent)).toBeNull();
    });
  });

  describe("Edit from view", () => {
    it("should open edit dialog when editing from view", async () => {
      const scope = fork({
        values: [
          [studentsModel.$viewingStudent, mockStudent],
          [studentsModel.$isViewDialogOpen, true],
        ],
      });

      await allSettled(studentsModel.editFromViewRequested, { scope });

      expect(scope.getState(studentsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(studentsModel.$editingStudent)).toEqual(mockStudent);
      expect(scope.getState(studentsModel.$viewingStudent)).toBeUndefined();
    });
  });

  describe("Delete from view", () => {
    it("should close view dialog when delete requested", async () => {
      const scope = fork({
        values: [[studentsModel.$isViewDialogOpen, true]],
      });

      await allSettled(studentsModel.deleteFromViewRequested, { scope });

      expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(false);
    });
  });
});
