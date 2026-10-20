export type CallBanner = {
  variant: "info" | "error";
  text: string;
};

export type CallStreams = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export type LocalStreams = {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
};
