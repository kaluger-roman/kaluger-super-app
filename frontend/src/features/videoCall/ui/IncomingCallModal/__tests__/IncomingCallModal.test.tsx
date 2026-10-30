import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import { installTransport, resetCallFlow } from "../../../model/__tests__/callFlow";
import { IncomingCallModal } from "../IncomingCallModal";

const LESSON = {
  id: "lesson-1",
  subject: "PHYSICS" as const,
  startTime: "2026-10-23T15:00:00",
  endTime: "2026-10-23T16:00:00",
};

const renderIncoming = (lesson: typeof LESSON | null = null) => {
  const scope = fork({
    values: [
      [callModel.$callPhase, "incoming"],
      [
        callModel.$incomingCall,
        { callId: "call-1", callerName: "Анна Петрова", role: "tutor", lesson },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <IncomingCallModal />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope };
};

describe("IncomingCallModal", () => {
  beforeEach(() => {
    installTransport();
  });
  afterEach(() => {
    resetCallFlow();
  });

  it("should render the caller name from $incomingCall", () => {
    renderIncoming();
    expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
    expect(screen.getByText("Входящий вызов")).toBeInTheDocument();
  });

  it("should show the lesson of a lesson call", () => {
    renderIncoming(LESSON);
    expect(screen.getByText("Звонок по уроку")).toBeInTheDocument();
    expect(screen.getByText("Физика")).toBeInTheDocument();
    expect(screen.getByText(/15:00\s*[—–-]\s*16:00/)).toBeInTheDocument();
  });

  it("should not show a lesson block for a call without a lesson", () => {
    renderIncoming();
    expect(screen.queryByText("Звонок по уроку")).not.toBeInTheDocument();
  });

  it("should leave the incoming phase when the call is rejected", async () => {
    const { scope } = renderIncoming();
    await userEvent.click(screen.getByRole("button", { name: "Отклонить вызов" }));
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should start connecting when accepted (leaves incoming, not idle)", async () => {
    const { scope } = renderIncoming();
    await userEvent.click(screen.getByRole("button", { name: "Принять вызов" }));
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
  });

  it("should keep ringing when the backdrop around the card is clicked", async () => {
    const { scope } = renderIncoming();
    const container = document.querySelector(".MuiDialog-container");
    expect(container).not.toBeNull();
    await userEvent.click(container as HTMLElement);
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(screen.getByText("Входящий вызов")).toBeInTheDocument();
  });

  it("should decline the call on Escape", async () => {
    const { scope } = renderIncoming();
    await userEvent.keyboard("{Escape}");
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });
});
