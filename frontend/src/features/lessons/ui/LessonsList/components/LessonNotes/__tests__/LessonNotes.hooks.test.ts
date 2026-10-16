import { createElement, useEffect } from "react";
import type { RefObject } from "react";

import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useIsTextClamped } from "../LessonNotes.hooks";

type Metrics = { scrollHeight: number; clientHeight: number };

const setMetrics = (node: HTMLElement, { scrollHeight, clientHeight }: Metrics) => {
  Object.defineProperty(node, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(node, "clientHeight", { configurable: true, value: clientHeight });
};

type ProbeResult = { isClamped: boolean };

const Probe = ({
  text,
  expanded,
  metrics,
  onRender,
}: {
  text: string;
  expanded: boolean;
  metrics: Metrics;
  onRender: (result: ProbeResult) => void;
}) => {
  const { ref, isClamped } = useIsTextClamped(text, expanded);

  useEffect(() => {
    onRender({ isClamped });
  });

  return createElement("div", {
    ref: (node: HTMLDivElement | null) => {
      (ref as RefObject<HTMLElement | null>).current = node;
      if (node) setMetrics(node, metrics);
    },
  });
};

const renderProbe = (props: { text: string; expanded: boolean; metrics: Metrics }) => {
  const last: { current: ProbeResult } = { current: { isClamped: false } };
  const onRender = (result: ProbeResult) => {
    last.current = result;
  };

  const view = render(createElement(Probe, { ...props, onRender }));

  return {
    get isClamped() {
      return last.current.isClamped;
    },
    view,
  };
};

describe("useIsTextClamped", () => {
  let observers: Array<{ callback: ResizeObserverCallback; disconnect: () => void }>;

  beforeEach(() => {
    observers = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
          observers.push({ callback, disconnect: vi.fn() });
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should report isClamped=true when content overflows the clamped box", () => {
    const view = renderProbe({
      text: "long note",
      expanded: false,
      metrics: { scrollHeight: 80, clientHeight: 40 },
    });

    expect(view.isClamped).toBe(true);
  });

  it("should report isClamped=false when content fits within the box", () => {
    const view = renderProbe({
      text: "short note",
      expanded: false,
      metrics: { scrollHeight: 40, clientHeight: 40 },
    });

    expect(view.isClamped).toBe(false);
  });

  it("should not report clamping for a 1px sub-pixel overflow tolerance", () => {
    const view = renderProbe({
      text: "borderline note",
      expanded: false,
      metrics: { scrollHeight: 41, clientHeight: 40 },
    });

    expect(view.isClamped).toBe(false);
  });

  it("should not measure (stays false) while expanded even if content overflows", () => {
    const view = renderProbe({
      text: "expanded note",
      expanded: true,
      metrics: { scrollHeight: 500, clientHeight: 40 },
    });

    expect(view.isClamped).toBe(false);
  });

  it("should recompute clamping when the ResizeObserver fires after size change", () => {
    let node: HTMLElement | null = null;

    const last: { current: ProbeResult } = { current: { isClamped: false } };

    const Wrapper = ({ metrics }: { metrics: Metrics }) => {
      const { ref, isClamped } = useIsTextClamped("note", false);
      useEffect(() => {
        last.current = { isClamped };
      });
      return createElement("div", {
        ref: (el: HTMLDivElement | null) => {
          (ref as RefObject<HTMLElement | null>).current = el;
          node = el;
          if (el) setMetrics(el, metrics);
        },
      });
    };

    render(createElement(Wrapper, { metrics: { scrollHeight: 40, clientHeight: 40 } }));
    expect(last.current.isClamped).toBe(false);

    act(() => {
      if (node) setMetrics(node, { scrollHeight: 100, clientHeight: 40 });
      observers.forEach((o) => o.callback([], {} as ResizeObserver));
    });

    expect(last.current.isClamped).toBe(true);
  });
});
