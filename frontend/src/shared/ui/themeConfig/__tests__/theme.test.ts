import { describe, it, expect } from "vitest";

import { theme } from "../index";

describe("theme — modal scroll lock", () => {
  it("disables scroll lock on every modal surface so opening a popup does not shift the page layout", () => {
    expect(theme.components?.MuiModal?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiPopover?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiMenu?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiDrawer?.defaultProps?.disableScrollLock).toBe(true);
    expect(theme.components?.MuiDialog?.defaultProps?.disableScrollLock).toBe(true);
  });
});
