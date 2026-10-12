import type { MouseEvent, PointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useTooltipTrigger } from "../tooltipTrigger.hooks";

const pointer = (pointerType: string) => ({ pointerType }) as PointerEvent;

describe("useTooltipTrigger", () => {
  it("should be closed initially", () => {
    const { result } = renderHook(() => useTooltipTrigger());
    expect(result.current.isOpen).toBe(false);
  });

  it("should open on mouse enter and close on mouse leave", () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => result.current.handlePointerEnter(pointer("mouse")));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handlePointerLeave(pointer("mouse")));
    expect(result.current.isOpen).toBe(false);
  });

  it("should ignore touch pointer enter and leave", () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => result.current.handlePointerEnter(pointer("touch")));
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.open());
    act(() => result.current.handlePointerLeave(pointer("touch")));
    expect(result.current.isOpen).toBe(true);
  });

  it("should open on click without letting the click bubble", () => {
    const { result } = renderHook(() => useTooltipTrigger());
    const stopPropagation = vi.fn();

    act(() => result.current.handleClick({ stopPropagation } as unknown as MouseEvent));
    act(() => result.current.handleClick({ stopPropagation } as unknown as MouseEvent));

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(result.current.isOpen).toBe(true);
  });

  it("should open and close explicitly", () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });
});
