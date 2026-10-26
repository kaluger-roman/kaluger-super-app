export const isMousePointer = (event: { pointerType: string }): boolean =>
  event.pointerType === "mouse";

export const isFocusLeaving = (container: Element, nextTarget: EventTarget | null): boolean =>
  !(nextTarget instanceof Node && container.contains(nextTarget));
