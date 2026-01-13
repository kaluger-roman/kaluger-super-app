import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useDisableNumberScroll } from "../disable-number-scroll.hooks";

describe("useDisableNumberScroll", () => {
  it("should add wheel event listener to element", () => {
    const element = document.createElement("input");
    const ref = { current: element };
    const addEventListenerSpy = vi.spyOn(element, "addEventListener");

    renderHook(() => useDisableNumberScroll(ref));

    expect(addEventListenerSpy).toHaveBeenCalledWith("wheel", expect.any(Function), {
      passive: false,
    });
  });

  it("should remove wheel event listener on cleanup", () => {
    const element = document.createElement("input");
    const ref = { current: element };
    const removeEventListenerSpy = vi.spyOn(element, "removeEventListener");

    const { unmount } = renderHook(() => useDisableNumberScroll(ref));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("wheel", expect.any(Function));
  });

  it("should prevent default on wheel event", () => {
    const element = document.createElement("input");
    const ref = { current: element };

    renderHook(() => useDisableNumberScroll(ref));

    const wheelEvent = new WheelEvent("wheel");
    const preventDefaultSpy = vi.spyOn(wheelEvent, "preventDefault");

    element.dispatchEvent(wheelEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should not add listener when ref is null", () => {
    const ref = { current: null };

    expect(() => {
      renderHook(() => useDisableNumberScroll(ref));
    }).not.toThrow();
  });
});
