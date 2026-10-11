import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { lessonModel, userModel } from "@entities";
import { theme } from "@shared";
import type { Lesson, User } from "@shared";

import { lessonTaxExemptChanged } from "../../../models/lessonActions.model";
import { TaxExemptStatus } from "../TaxExemptStatus";

const user = (taxEnabled: boolean): User => ({
  id: "user-1",
  email: "tutor@test.local",
  name: "Учитель",
  createdAt: "2026-01-01T00:00:00.000Z",
  isEmailVerified: true,
  taxEnabled,
});

const createLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  isPaid: false,
  status: "SCHEDULED",
  studentId: "student-1",
  isTaxExempt: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderStatus = (scope: Scope, lesson: Lesson) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <TaxExemptStatus lesson={lesson} />
      </ThemeProvider>
    </Provider>
  );

const getSwitch = () => screen.getByRole("switch", { name: "Не облагается налогом" });

describe("TaxExemptStatus", () => {
  it("should render nothing when tax accounting is disabled", () => {
    const scope = fork({ values: [[userModel.$user, user(false)]] });
    const { container } = renderStatus(scope, createLesson({ isTaxExempt: true }));

    expect(container).toBeEmptyDOMElement();
  });

  it.each([true, false])("should show the switch checked = %s", (isTaxExempt) => {
    const scope = fork({ values: [[userModel.$user, user(true)]] });
    renderStatus(scope, createLesson({ isTaxExempt }));

    expect((getSwitch() as HTMLInputElement).checked).toBe(isTaxExempt);
  });

  it("should show the switch for a cancelled lesson", () => {
    const scope = fork({ values: [[userModel.$user, user(true)]] });
    renderStatus(scope, createLesson({ status: "CANCELLED" }));

    expect(getSwitch()).toBeEnabled();
  });

  it.each([true, false])("should request isTaxExempt = %s when toggled", async (nextValue) => {
    const updateLesson = vi.fn(async () => createLesson({ isTaxExempt: nextValue }));
    const scope = fork({
      values: [[userModel.$user, user(true)]],
      handlers: [[lessonModel.updateLessonFx, updateLesson]],
    });
    const changed = vi.fn();
    const unwatch = createWatch({ unit: lessonTaxExemptChanged, fn: changed, scope });
    renderStatus(scope, createLesson({ isTaxExempt: !nextValue }));

    await userEvent.click(getSwitch());

    expect(changed).toHaveBeenCalledWith({ lessonId: "lesson-1", isTaxExempt: nextValue });
    expect(updateLesson).toHaveBeenCalledWith({
      id: "lesson-1",
      data: { isTaxExempt: nextValue },
    });
    unwatch();
  });

  it("should disable the switch while a lesson update is in flight", async () => {
    let resolveUpdate: (lesson: Lesson) => void = () => undefined;
    const scope = fork({
      values: [[userModel.$user, user(true)]],
      handlers: [
        [
          lessonModel.updateLessonFx,
          () =>
            new Promise<Lesson>((resolve) => {
              resolveUpdate = resolve;
            }),
        ],
      ],
    });
    const pendingUpdate = allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: "lesson-1", data: { isTaxExempt: true } },
    });
    renderStatus(scope, createLesson());

    expect(getSwitch()).toBeDisabled();

    resolveUpdate(createLesson({ isTaxExempt: true }));
    await pendingUpdate;
  });
});
