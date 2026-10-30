import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";

import { callModel, callPresenceModel } from "../../../model";
import type { CallRole } from "../../../model";
import type { PeerPresenceState } from "../../../videoCall.types";
import { InterruptionLabel } from "../InterruptionLabel";

const MINIMIZED: PeerPresenceState = {
  presence: "background",
  audioSuspended: false,
  videoSuspended: true,
};

const scopeOf = (role: CallRole, presence: PeerPresenceState) =>
  fork({
    values: [
      [callModel.$callRole, role],
      [callPresenceModel.$peerPresence, presence],
    ],
  });

const renderLabel = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <InterruptionLabel />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("InterruptionLabel", () => {
  it("should say nothing while the peer is on screen", () => {
    renderLabel(fork());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should show the tutor a paused student, not a spinner", () => {
    renderLabel(scopeOf("tutor", MINIMIZED));

    expect(screen.getByRole("status")).toHaveTextContent("Ученик свернул приложение");
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "minimized");
    expect(screen.getByTestId("PauseCircleOutlineIcon")).toBeInTheDocument();
  });

  it("should show the student a reconnecting tutor with a spinner", () => {
    renderLabel(scopeOf("student", MINIMIZED));

    expect(screen.getByRole("status")).toHaveTextContent("Восстанавливаем связь…");
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "reconnecting");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
