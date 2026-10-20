// A tap next to the small card must not drop the call; Escape stays a deliberate decline.
export const isDeclineClose = (reason: "backdropClick" | "escapeKeyDown"): boolean =>
  reason !== "backdropClick";
