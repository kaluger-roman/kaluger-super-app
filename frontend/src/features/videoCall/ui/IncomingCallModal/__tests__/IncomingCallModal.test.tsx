import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callModel, setCallTransport, stopAllSessions } from "../../../model";
import { IncomingCallModal } from "../IncomingCallModal";

const renderIncoming = () => {
  const scope = fork({
    values: [
      [callModel.$callPhase, "incoming"],
      [callModel.$incomingCall, { callId: "call-1", callerName: "Анна Петрова" }],
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
  beforeEach(() => setCallTransport(vi.fn()));
  afterEach(() => {
    stopAllSessions();
    setCallTransport(null);
  });

  it("should render the caller name from $incomingCall", () => {
    renderIncoming();
    expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
    expect(screen.getByText("Входящий вызов")).toBeInTheDocument();
  });

  it("should leave the incoming phase when the call is rejected", async () => {
    const { scope } = renderIncoming();
    await userEvent.click(screen.getByRole("button", { name: "Отклонить вызов" }));
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should move to the active phase when accepted (leaves incoming, not idle)", async () => {
    const { scope } = renderIncoming();
    await userEvent.click(screen.getByRole("button", { name: "Принять вызов" }));
    expect(scope.getState(callModel.$callPhase)).toBe("active");
  });
});
