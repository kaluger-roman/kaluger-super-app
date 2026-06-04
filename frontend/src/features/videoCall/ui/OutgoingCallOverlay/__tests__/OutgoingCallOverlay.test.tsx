import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { callModel, setCallTransport, stopAllSessions } from "../../../model";
import { OutgoingCallOverlay } from "../OutgoingCallOverlay";

const renderOutgoing = () => {
  const scope = fork({
    values: [
      [callModel.$callPhase, "outgoing"],
      [
        callModel.$outgoingCallPeer,
        { id: "stu-1", name: "Иван Смирнов", role: "student" },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <OutgoingCallOverlay />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope };
};

describe("OutgoingCallOverlay", () => {
  beforeEach(() => setCallTransport(vi.fn()));
  afterEach(() => {
    stopAllSessions();
    setCallTransport(null);
  });

  it("should render the peer name from $outgoingCallPeer", () => {
    renderOutgoing();
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
    expect(screen.getByText("Вызываем…")).toBeInTheDocument();
  });

  it("should return to idle when the call is canceled", async () => {
    const { scope } = renderOutgoing();
    await userEvent.click(screen.getByRole("button", { name: "Отменить вызов" }));
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });
});
