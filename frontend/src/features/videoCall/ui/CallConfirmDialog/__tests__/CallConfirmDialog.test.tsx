import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callConfirmModel, callModel } from "../../../model";
import type { StartCallParams } from "../../../model";
import { CallConfirmDialog } from "../CallConfirmDialog";

const LESSON = {
  id: "lesson-1",
  subject: "PHYSICS" as const,
  startTime: "2026-10-23T15:00:00",
  endTime: "2026-10-23T16:00:00",
};

const renderDialog = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallConfirmDialog />
      </ThemeProvider>
    </EffectorProvider>
  );

const openWith = async (call: StartCallParams) => {
  const scope = fork();
  const started: StartCallParams[] = [];
  createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });
  renderDialog(scope);
  await allSettled(callConfirmModel.callRequested, { scope, params: call });
  return { scope, started };
};

describe("CallConfirmDialog", () => {
  it("should be closed by default", () => {
    renderDialog(fork());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should ask to start a video call with the peer name under the avatar", async () => {
    await openWith({ studentId: "s-1", peerName: "Иван Петров", lesson: null });

    const dialog = await screen.findByRole("dialog", { name: "Начать видеозвонок?" });
    expect(dialog).toHaveTextContent("Иван Петров");
    expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Позвонить" })).toBeInTheDocument();
    expect(screen.queryByText("Звонок по уроку")).not.toBeInTheDocument();
  });

  it("should show the lesson of a lesson call", async () => {
    await openWith({ peerName: "Анна Кузнецова", lesson: LESSON });

    await screen.findByRole("dialog", { name: "Начать видеозвонок?" });
    expect(screen.getByText("Звонок по уроку")).toBeInTheDocument();
    expect(screen.getByText("Физика")).toBeInTheDocument();
    expect(screen.getByText(/15:00—16:00/)).toBeInTheDocument();
  });

  it("should close without a call on «Отмена»", async () => {
    const { scope, started } = await openWith({ studentId: "s-1", peerName: "Иван", lesson: null });

    await userEvent.click(await screen.findByRole("button", { name: "Отмена" }));

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    expect(started).toEqual([]);
  });

  it("should close without a call on Escape", async () => {
    const { scope, started } = await openWith({ studentId: "s-1", peerName: "Иван", lesson: null });
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    expect(started).toEqual([]);
  });

  it("should start the call on «Позвонить»", async () => {
    const call = { studentId: "s-1", peerName: "Иван", lesson: LESSON };
    const { scope, started } = await openWith(call);

    await userEvent.click(await screen.findByRole("button", { name: "Позвонить" }));

    expect(started).toEqual([call]);
    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("should start one call on a double click", async () => {
    const { started } = await openWith({ studentId: "s-1", peerName: "Иван", lesson: null });

    await userEvent.dblClick(await screen.findByRole("button", { name: "Позвонить" }));

    expect(started).toHaveLength(1);
  });
});
