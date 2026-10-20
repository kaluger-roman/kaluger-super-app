import type { CallBanner, LocalStreams } from "./ActiveCallScreen.types";
import type { CallStatusMessage } from "../../model";
import type { CallMediaState } from "../../videoCall.types";

export const toBanner = (message: CallStatusMessage): CallBanner | null =>
  message ? { variant: message.kind, text: message.text } : null;

export const isAudioOnly = (media: CallMediaState): boolean => !media.cameraAvailable;

export const toLocalTileStream = ({
  localStream,
  screenStream,
}: LocalStreams): MediaStream | null => screenStream ?? localStream;
