import { describe, it, expect } from "vitest";

import { isRecord } from "../../../lib";
import { theme } from "../index";

type FontSizeRule = { path: string; value: unknown };

const IOS_MIN_INPUT_FONT_PX = 16;
const ROOT_FONT_PX = 16;
const INPUT_COMPONENTS = [
  "MuiInputBase",
  "MuiOutlinedInput",
  "MuiFilledInput",
  "MuiInput",
  "MuiTextField",
  "MuiSelect",
  "MuiAutocomplete",
] as const;

const collectFontSizeRules = (node: unknown, path: string[] = []): FontSizeRule[] => {
  if (!isRecord(node)) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === "fontSize"
      ? [{ path: path.join(" > "), value }]
      : collectFontSizeRules(value, [...path, key])
  );
};

const toPx = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const match = /^(\d*\.?\d+)(rem|px)$/.exec(value.trim());
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  return match[2] === "rem" ? amount * ROOT_FONT_PX : amount;
};

describe("theme — modal scroll lock", () => {
  it("disables scroll lock on every modal surface so opening a popup does not shift the page layout", () => {
    expect(theme.components?.MuiModal?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiPopover?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiMenu?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiDrawer?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiDialog?.defaultProps?.disableScrollLock).toBe(true);
  });
});

describe("theme — iOS focus zoom on inputs", () => {
  it("should render every editable input at 1rem on touch devices so iOS does not zoom in on focus", () => {
    const inputOverride: unknown = theme.components?.MuiInputBase?.styleOverrides?.input;
    const coarsePointerRule = isRecord(inputOverride)
      ? inputOverride["@media (pointer: coarse)"]
      : undefined;

    expect(coarsePointerRule).toEqual(expect.objectContaining({ fontSize: "1rem" }));
  });

  it("should not set an input font size below 16px in any input component override except the label", () => {
    const shrunkRules = INPUT_COMPONENTS.flatMap((name) =>
      collectFontSizeRules(theme.components?.[name]?.styleOverrides, [name])
    )
      .filter(({ path }) => !path.includes(".MuiInputLabel-root"))
      .filter(({ value }) => !(toPx(value) >= IOS_MIN_INPUT_FONT_PX));

    expect(shrunkRules).toEqual([]);
  });
});
