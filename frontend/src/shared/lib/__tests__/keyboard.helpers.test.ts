import { describe, it, expect, vi } from "vitest";
import type { KeyboardEvent } from "react";

import { handleActivationKey } from "../keyboard.helpers";

const makeEvent = (key: string): KeyboardEvent<HTMLElement> =>
  ({ key, preventDefault: vi.fn() } as unknown as KeyboardEvent<HTMLElement>);

describe("handleActivationKey", () => {
  it("should call handler and preventDefault on Enter", () => {
    const handler = vi.fn();
    const event = makeEvent("Enter");

    handleActivationKey(handler)(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("should call handler and preventDefault on Space", () => {
    const handler = vi.fn();
    const event = makeEvent(" ");

    handleActivationKey(handler)(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("should ignore other keys", () => {
    const handler = vi.fn();
    const event = makeEvent("Tab");

    handleActivationKey(handler)(event);

    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
