import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type FC } from "react";
import { render, act } from "@testing-library/react";
import { useInView } from "@/hooks";

const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

let intersectionCallback: IntersectionObserverCallback;

const MockIntersectionObserver = vi.fn(function (
  this: unknown,
  callback: IntersectionObserverCallback
) {
  intersectionCallback = callback;
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  };
});

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Helper component that actually attaches the ref to a DOM element
const TestComponent: FC<{ options?: IntersectionObserverInit }> = ({
  options,
}) => {
  const { ref, isInView } = useInView(options);
  return createElement(
    "div",
    { ref, "data-testid": "observed", "data-in-view": String(isInView) },
    isInView ? "visible" : "hidden"
  );
};

describe("useInView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start with isInView as false", () => {
    const { result } = renderHook(() => useInView());

    expect(result.current.isInView).toBe(false);
  });

  it("should set isInView to true when element intersects", () => {
    const { getByTestId } = render(createElement(TestComponent));

    expect(getByTestId("observed").getAttribute("data-in-view")).toBe("false");

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(getByTestId("observed").getAttribute("data-in-view")).toBe("true");
  });

  it("should call observer.unobserve after first intersection", () => {
    render(createElement(TestComponent));

    expect(mockObserve).toHaveBeenCalled();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(mockUnobserve).toHaveBeenCalled();
  });

  it("should call disconnect on cleanup", () => {
    const { unmount } = render(createElement(TestComponent));

    expect(mockObserve).toHaveBeenCalled();

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should not set isInView when element is not intersecting", () => {
    const { getByTestId } = render(createElement(TestComponent));

    act(() => {
      intersectionCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(getByTestId("observed").getAttribute("data-in-view")).toBe("false");
  });

  it("should pass options to IntersectionObserver with default threshold", () => {
    render(createElement(TestComponent, { options: { rootMargin: "10px" } }));

    expect(MockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.1,
        rootMargin: "10px",
      }
    );
  });
});
