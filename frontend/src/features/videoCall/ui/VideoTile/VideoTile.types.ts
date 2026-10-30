export type TileContentKind = "screen" | "video" | "placeholder";

export type VideoFit = "contain" | "cover";

// "framed": the video sits between the pills; "overlay": the pills float over a full-tile video.
export type VideoLayout = "framed" | "overlay";

export type TileVariant = "remote" | "fullscreen" | "self" | "selfCompact";

export type TileVariantConfig = {
  avatarSize: number;
  selfAvatar: boolean;
  // The tile shows the peer: its interruption and audio notice, and a blocked peer sound asks for
  // a tap on it too.
  isPeer: boolean;
  showCameraLabel: boolean;
  frameScreen: boolean;
  minHeight: number;
  inset: number;
  gap: number;
  badgeSize: number;
  badgeInNameRow: boolean;
  pillPaddingX: number;
  // A bare tile has no frame and no pills: the fullscreen controls show the name and badges.
  bare: boolean;
  fullscreenToggle: boolean;
};

// `isBlocked` — the browser refused to resume without a tap, so the tile asks for one.
export type MediaPlayback = {
  isBlocked: boolean;
  resume: () => void;
};

export type ContinueCallParams = {
  videoBlocked: boolean;
  soundBlocked: boolean;
  interrupted: boolean;
};

export type TileBackgroundParams = {
  hasVideo: boolean;
  isScreen: boolean;
  bare: boolean;
};

export type GesturePoint = {
  x: number;
  y: number;
};

export type WheelZoomInput = {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
};

export type ViewportRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

export type GestureInput = {
  scale: number;
  point: GesturePoint;
};

export type PipMediaSession = {
  setActionHandler: (action: string, handler: (() => void) | null) => void;
};

export type AutoPictureInPictureVideo = HTMLVideoElement & { autoPictureInPicture: boolean };
