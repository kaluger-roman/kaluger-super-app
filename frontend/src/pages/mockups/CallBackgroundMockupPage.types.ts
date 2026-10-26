import type { CallMediaState, CallRole } from "@features";

export type CallPreviewConfig = {
  role: CallRole;
  peerName: string;
  peerRole: CallRole;
  peerMedia: CallMediaState;
  selfMedia: CallMediaState;
  screenShareSupported: boolean;
};

export type ToastPreviewConfig = {
  frameTitle: string;
  pageTitle: string;
  message: string;
  type: "error" | "info";
};

export type MockupLink = {
  state: string;
  title: string;
};

export type MockCameraPalette = {
  wall: [string, string];
  shirt: string;
  skin: string;
  hair: string;
};
