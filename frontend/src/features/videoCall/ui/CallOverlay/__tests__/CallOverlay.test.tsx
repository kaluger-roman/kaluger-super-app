import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel } from "../../../model";
import type { CallPhase } from "../../../model/call.types";
import { CallOverlay } from "../CallOverlay";

// The app's full-screen blocking spinner (App.styled `ModalBackdrop`) sits at modal + 1.
const BLOCKING_OVERLAY_Z_INDEX = theme.zIndex.modal + 1;

const zIndexOf = (element: Element | null): number =>
  element ? Number(getComputedStyle(element).zIndex) : Number.NaN;

const fixedAncestorOf = (element: Element): Element | null => {
  let current: Element | null = element;
  while (current && getComputedStyle(current).position !== "fixed") {
    current = current.parentElement;
  }
  return current;
};

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

  it("should keep the incoming call above the app's blocking overlay", () => {
    renderOverlay("incoming");
    const dialogRoot = screen.getByRole("dialog").closest(".MuiDialog-root");
    expect(zIndexOf(dialogRoot)).toBeGreaterThan(BLOCKING_OVERLAY_Z_INDEX);
  });

  it("should keep the call screen above the app's blocking overlay", () => {
    renderOverlay("active");
    const callScreen = fixedAncestorOf(screen.getByRole("button", { name: /завершить/i }));
    expect(zIndexOf(callScreen)).toBeGreaterThan(BLOCKING_OVERLAY_Z_INDEX);
  });
});
