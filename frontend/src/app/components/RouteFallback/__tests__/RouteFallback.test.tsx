import { render } from "@testing-library/react";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect } from "vitest";

import { blockingModel } from "../../../model";
import { RouteFallback } from "../RouteFallback";

describe("RouteFallback", () => {
  it("should render nothing and raise blocking while mounted", () => {
    const scope = fork();

    const { container, unmount } = render(
      <Provider value={scope}>
        <RouteFallback />
      </Provider>
    );

    expect(container).toBeEmptyDOMElement();
    expect(scope.getState(blockingModel.$isBlocking)).toBe(true);

    unmount();

    expect(scope.getState(blockingModel.$isBlocking)).toBe(false);
  });
});
