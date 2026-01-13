import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { showSuccess, showError, showWarning, showInfo } from "../../model";
import { useNotifications } from "../notifications.hooks";

describe("useNotifications", () => {
  it("should return notification functions", () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.showSuccess).toBe(showSuccess);
    expect(result.current.showError).toBe(showError);
    expect(result.current.showWarning).toBe(showWarning);
    expect(result.current.showInfo).toBe(showInfo);
  });

  it("should return same functions on re-render", () => {
    const { result, rerender } = renderHook(() => useNotifications());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult.showSuccess).toBe(secondResult.showSuccess);
    expect(firstResult.showError).toBe(secondResult.showError);
    expect(firstResult.showWarning).toBe(secondResult.showWarning);
    expect(firstResult.showInfo).toBe(secondResult.showInfo);
  });
});
