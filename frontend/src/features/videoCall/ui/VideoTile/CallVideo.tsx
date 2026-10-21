import type { FC } from "react";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const element = videoRef.current;
    if (element && element.srcObject !== stream) {
      element.srcObject = stream;
    }
  }, [stream]);

  return (
    <Styled.VideoElement
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      data-layout={layout}
      $hidden={hidden}
      $fit={fit}
      $layout={layout}
    />
  );
};
