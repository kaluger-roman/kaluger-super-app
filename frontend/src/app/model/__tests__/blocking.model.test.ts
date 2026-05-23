import { fork, allSettled } from "effector";
import { describe, it, expect } from "vitest";

import { studentUserModel } from "@entities/studentUser";

import { $isBlocking } from "../blocking.model";

describe("app/model/blocking.model — $isBlocking", () => {
  it("blocks while studentUserModel.getCurrentStudentFx is pending (regression: профиль ученика грузился без global overlay)", async () => {
    const scope = fork({
      handlers: [
        [
          studentUserModel.getCurrentStudentFx,
          () => new Promise(() => undefined),
        ],
      ],
    });

    expect(scope.getState($isBlocking)).toBe(false);

    void allSettled(studentUserModel.getCurrentStudentFx, { scope });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(scope.getState($isBlocking)).toBe(true);
  });
});
