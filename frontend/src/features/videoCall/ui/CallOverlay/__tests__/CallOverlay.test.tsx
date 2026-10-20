import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import type { CallPhase } from "../../../model/call.types";
import { CallOverlay } from "../CallOverlay";

const renderOverlay = (phase: CallPhase) => {
  const scope = fork({
    values: [
      [callModel.$callPhase, phase],
      [callModel.$incomingCall, { callId: "call-1", callerName: "Анна Петрова", role: "tutor" }],
      [callModel.$outgoingCallPeer, { name: "Иван Смирнов", role: "student" }],
    ],
  });
  return render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallOverlay />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("CallOverlay", () => {
  it("should render nothing while there is no call", () => {
    const { container } = renderOverlay("idle");
    expect(container).toBeEmptyDOMElement();
  });

  it("should show the incoming call modal while ringing", () => {
    renderOverlay("incoming");
    expect(screen.getByText("Входящий вызов")).toBeInTheDocument();
  });

  it("should show the dialing overlay for an outgoing call", () => {
    renderOverlay("outgoing");
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
    expect(screen.queryByText("Входящий вызов")).not.toBeInTheDocument();
  });

  it("should show the call controls once the call is active", () => {
    renderOverlay("active");
    expect(screen.getByRole("button", { name: /завершить/i })).toBeInTheDocument();
  });

  it("should show the call screen while the call is still connecting", () => {
    renderOverlay("connecting");
    expect(screen.getByRole("button", { name: /завершить/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Соединение…");
  });

  it("should render the call screen outside the app tree, at the document body", () => {
    const { container } = renderOverlay("outgoing");
    expect(container).toBeEmptyDOMElement();
    expect(document.body).toHaveTextContent("Иван Смирнов");
  });
});
