import { describe, expect, it } from "vitest";

import { isFocusLeaving, isMousePointer } from "../FullscreenControls.helpers";

describe("FullscreenControls helpers", () => {
  it("should tell a mouse from a finger or a pen", () => {
    expect(isMousePointer({ pointerType: "mouse" })).toBe(true);
    expect(isMousePointer({ pointerType: "touch" })).toBe(false);
    expect(isMousePointer({ pointerType: "pen" })).toBe(false);
  });

  it("should tell focus leaving the controls from focus moving inside them", () => {
    const container = document.createElement("div");
    const inside = document.createElement("button");
    container.append(inside);

    expect(isFocusLeaving(container, inside)).toBe(false);
    expect(isFocusLeaving(container, document.createElement("button"))).toBe(true);
    expect(isFocusLeaving(container, null)).toBe(true);
  });
});
