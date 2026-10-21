import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { studentWebSocketModel, webSocketModel } from "../../../model";
import type { ElsewhereReason } from "../../../model";
import { SessionElsewhereBanner } from "../SessionElsewhereBanner";

const setupBanner = (
  tutorElsewhere: ElsewhereReason | null,
  studentElsewhere: ElsewhereReason | null = null
) => {
  const scope = fork({
    values: [
      [webSocketModel.$elsewhere, tutorElsewhere],
      [studentWebSocketModel.$elsewhere, studentElsewhere],
    ],
    handlers: [
      [webSocketModel.connectWebSocketFx, () => null],
      [studentWebSocketModel.connectStudentWebSocketFx, () => null],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <SessionElsewhereBanner />
      </ThemeProvider>
    </EffectorProvider>
  );
  return scope;
};

describe("SessionElsewhereBanner", () => {
  it("should stay hidden while this tab holds the connection", () => {
    setupBanner(null);
    expect(screen.queryByText(/открыто в другой вкладке/)).not.toBeInTheDocument();
  });

  it("should take the tutor connection back to this tab", async () => {
    const scope = setupBanner("tab");
    const connects: unknown[] = [];
    createWatch({ unit: webSocketModel.connectWebSocket, fn: () => connects.push(1), scope });

    expect(screen.getByText(/открыто в другой вкладке/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Использовать здесь" }));

    expect(connects).toHaveLength(1);
  });

  it("should take the student connection back without touching the tutor one", async () => {
    const scope = setupBanner(null, "tab");
    const tutorConnects: unknown[] = [];
    createWatch({ unit: webSocketModel.connectWebSocket, fn: () => tutorConnects.push(1), scope });

    await userEvent.click(screen.getByRole("button", { name: "Использовать здесь" }));

    expect(tutorConnects).toHaveLength(0);
    expect(scope.getState(studentWebSocketModel.$isStudentWebSocketEnabled)).toBe(true);
  });

  it("should not offer a take-over while a call goes on in the other tab", () => {
    setupBanner("call");

    expect(
      screen.getByText(/В другой вкладке или на другом устройстве идёт звонок/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Использовать здесь" })).toBeDisabled();
  });
});
