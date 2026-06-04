import type { CallSignalingInbound } from "./signaling.types";

type CallTransport = (message: CallSignalingInbound) => void;

let transport: CallTransport | null = null;

export const setCallTransport = (next: CallTransport | null): void => {
  transport = next;
};

export const sendOverTransport = (message: CallSignalingInbound): void => {
  if (!transport) {
    console.error("Call transport is not initialized");
    return;
  }
  transport(message);
};
