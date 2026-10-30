export type StageGeometry = {
  boxWidth: number;
  boxHeight: number;
  // 0 until the video metadata arrives.
  videoWidth: number;
  videoHeight: number;
};

export type StageOrientation = "portrait" | "landscape";

// A zoom gesture around a point given relative to the box centre.
export type ZoomAtPayload = { factor: number; focusX: number; focusY: number };

export type PanPayload = { dx: number; dy: number };

export type ContentSize = { width: number; height: number };

export type OffsetLimit = { x: number; y: number };
