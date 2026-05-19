import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { studentUserModel } from "@entities";

import { StudentProtectedRoute } from "../StudentProtectedRoute";

const renderAt = (path: string, sessionValue: unknown) => {
  const scope = fork({
    values: [[studentUserModel.$studentSession, sessionValue]],
  });
  return render(
    <EffectorProvider value={scope}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route
            path="/student/cabinet/schedule"
            element={
              <StudentProtectedRoute
                element={<div>STUDENT_SCHEDULE</div>}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    </EffectorProvider>
  );
};

describe("StudentProtectedRoute", () => {
  it("redirects to /login when no student session exists", () => {
    renderAt("/student/cabinet/schedule", null);
    expect(screen.getByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("STUDENT_SCHEDULE")).not.toBeInTheDocument();
  });

  it("renders the protected element when a student session exists", () => {
    renderAt("/student/cabinet/schedule", {
      id: "su-1",
      name: "Иван",
      email: "i@example.com",
      isEmailVerified: true,
      tutor: { name: "Анна" },
    });
    expect(screen.getByText("STUDENT_SCHEDULE")).toBeInTheDocument();
  });
});
