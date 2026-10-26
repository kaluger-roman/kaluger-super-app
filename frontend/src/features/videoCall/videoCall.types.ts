export type CallMediaState = {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  cameraAvailable: boolean;
};

// Offsets are CSS pixels from the centre of the video box, applied before the scale.
export type CallZoom = {
  scale: number;
  offsetX: number;
  offsetY: number;
};
