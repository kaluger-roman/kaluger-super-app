import type { FC } from "react";
import { useRef } from "react";

import { resumeEventPlayback } from "./VideoTile.helpers";
import { useCallVideoPlayback } from "./VideoTile.hooks";
import * as Styled from "./VideoTile.styled";
import type { VideoFit, VideoLayout } from "./VideoTile.types";

type CallVideoProps = {
  stream: MediaStream | null;
  muted: boolean;
  hidden: boolean;
  fit: VideoFit;
  layout: VideoLayout;
};

export const CallVideo: FC<CallVideoProps> = ({ stream, muted, hidden, fit, layout }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useCallVideoPlayback(videoRef, stream);

  return (
    <Styled.VideoElement
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      disablePictureInPicture
      onPause={resumeEventPlayback}
      onClick={resumeEventPlayback}
      data-layout={layout}
      $hidden={hidden}
      $fit={fit}
      $layout={layout}
    />
  );
};
