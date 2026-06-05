export type {
  CallHistoryRecord,
  CallStatus,
  CallDirection,
} from "@entities/callRecord";

export type CallMediaState = {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
};
