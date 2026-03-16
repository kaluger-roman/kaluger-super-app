import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

let intersectionCallback: IntersectionObserverCallback;

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(function (
    this: unknown,
    callback: IntersectionObserverCallback
  ) {
    intersectionCallback = callback;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  })
);

describe("AnimateOnScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children", () => {
    const { getByText } = render(
      <AnimateOnScroll>
        <p>Test content</p>
      </AnimateOnScroll>
    );

    expect(getByText("Test content")).toBeInTheDocument();
  });

  it("should apply opacity-0 and translate-y-8 initially", () => {
    const { container } = render(
      <AnimateOnScroll>
        <p>Test content</p>
      </AnimateOnScroll>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-0");
    expect(wrapper.className).toContain("translate-y-8");
  });

  it("should apply opacity-100 and translate-y-0 after intersection", () => {
    const { container } = render(
      <AnimateOnScroll>
        <p>Test content</p>
      </AnimateOnScroll>
    );

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-100");
    expect(wrapper.className).toContain("translate-y-0");
  });

  it("should pass custom className through", () => {
    const { container } = render(
      <AnimateOnScroll className="custom-class">
        <p>Test content</p>
      </AnimateOnScroll>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });

  it("should set transitionDelay style when delay prop is provided", () => {
    const { container } = render(
      <AnimateOnScroll delay={200}>
        <p>Test content</p>
      </AnimateOnScroll>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.transitionDelay).toBe("200ms");
  });

  it("should set transitionDelay to 0ms by default", () => {
    const { container } = render(
      <AnimateOnScroll>
        <p>Test content</p>
      </AnimateOnScroll>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.transitionDelay).toBe("0ms");
  });
});
