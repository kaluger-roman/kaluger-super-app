const WAIT_FOR_POLL_MS = 10;
const WAIT_FOR_TIMEOUT_MS = 2000;

// Polls until a fire-and-forget side effect becomes observable, failing after a deadline.
export const waitFor = async (
  condition: () => boolean,
  timeoutMs = WAIT_FOR_TIMEOUT_MS
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(`waitFor: condition not met in ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_POLL_MS));
  }
};
