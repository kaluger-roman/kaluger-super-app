import { createElement } from "react";
import type { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";
import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect } from "vitest";

import type { User } from "@shared";

import { useIsTaxEnabled } from "../user.hooks";
import { $user, updateUser } from "../user.model";

const createUser = (taxEnabled: boolean): User => ({
  id: "user-1",
  email: "tutor@test.local",
  name: "Учитель",
  createdAt: "2026-01-01T00:00:00.000Z",
  isEmailVerified: true,
  taxEnabled,
});

const renderInScope = (scope: Scope) =>
  renderHook(() => useIsTaxEnabled(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(Provider, { value: scope }, children),
  });

describe("useIsTaxEnabled", () => {
  it("should return false when there is no user", () => {
    const { result } = renderInScope(fork({ values: [[$user, null]] }));
    expect(result.current).toBe(false);
  });

  it("should return false when tax accounting is disabled", () => {
    const { result } = renderInScope(fork({ values: [[$user, createUser(false)]] }));
    expect(result.current).toBe(false);
  });

  it("should return true when tax accounting is enabled", () => {
    const { result } = renderInScope(fork({ values: [[$user, createUser(true)]] }));
    expect(result.current).toBe(true);
  });

  it("should follow changes of the user", async () => {
    const scope = fork({ values: [[$user, createUser(false)]] });
    const { result } = renderInScope(scope);

    await act(async () => {
      await allSettled(updateUser, { scope, params: createUser(true) });
    });

    expect(result.current).toBe(true);
  });
});
