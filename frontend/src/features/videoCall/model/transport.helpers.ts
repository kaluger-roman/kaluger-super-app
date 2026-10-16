import type { CallMediaState } from "../videoCall.types";
import type { CallSignalingInbound, CallTransport } from "./signaling.types";

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

export const sendMediaState = (callId: string, media: CallMediaState): void => {
  sendOverTransport({
    type: "call_media_state",
    callId,
    micOn: media.micOn,
    cameraOn: media.cameraOn,
    screenSharing: media.screenSharing,
  });
};
