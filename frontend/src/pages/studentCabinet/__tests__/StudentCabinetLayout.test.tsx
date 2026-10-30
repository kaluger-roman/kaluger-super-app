import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider } from "effector-react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { studentUserModel } from "@entities";
import { theme } from "@shared";
import type { StudentSession } from "@shared";

import { StudentCabinetLayout } from "../StudentCabinetLayout";

const session: StudentSession = {
  id: "su-1",
  email: "student@example.com",
  name: "Иван",
  isEmailVerified: true,
  tutor: { name: "Анна Кузнецова" },
};

describe("StudentCabinetLayout", () => {
  it("should not offer a call from the cabinet header", () => {
    render(
      <Provider value={fork({ values: [[studentUserModel.$studentSession, session]] })}>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <StudentCabinetLayout />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText("Кабинет ученика")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /позвонить/i })).not.toBeInTheDocument();
  });
});
