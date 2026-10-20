import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { studentWebSocketModel, webSocketModel } from "../../../model";
import { SessionElsewhereBanner } from "../SessionElsewhereBanner";

const setupBanner = (tutorElsewhere: boolean, studentElsewhere = false) => {
  const scope = fork({
    values: [
      [webSocketModel.$isReplacedElsewhere, tutorElsewhere],
      [studentWebSocketModel.$isReplacedElsewhere, studentElsewhere],
    ],
    handlers: [
      [webSocketModel.connectWebSocketFx, () => undefined],
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
    setupBanner(false);
    expect(screen.queryByText(/открыто в другой вкладке/)).not.toBeInTheDocument();
  });

  it("should take the tutor connection back to this tab", async () => {
    const scope = setupBanner(true);
    const connects: unknown[] = [];
    createWatch({ unit: webSocketModel.connectWebSocket, fn: () => connects.push(1), scope });

    expect(screen.getByText(/открыто в другой вкладке/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Использовать здесь" }));

    expect(connects).toHaveLength(1);
    expect(scope.getState(webSocketModel.$isReplacedElsewhere)).toBe(false);
  });

  it("should take the student connection back without touching the tutor one", async () => {
    const scope = setupBanner(false, true);
    const tutorConnects: unknown[] = [];
    createWatch({ unit: webSocketModel.connectWebSocket, fn: () => tutorConnects.push(1), scope });

    await userEvent.click(screen.getByRole("button", { name: "Использовать здесь" }));

    expect(tutorConnects).toHaveLength(0);
    expect(scope.getState(studentWebSocketModel.$isReplacedElsewhere)).toBe(false);
  });
});
