import type { FC } from "react";
import { useEffect, useRef } from "react";

import * as Styled from "./VideoTile.styled";
import type { VideoFit } from "./VideoTile.types";

type CallVideoProps = {
  stream: MediaStream | null;
  muted: boolean;
  hidden?: boolean;
  fit?: VideoFit;
  padded?: boolean;
};

export const CallVideo: FC<CallVideoProps> = ({
  stream,
  muted,
  hidden = false,
  fit = "cover",
  padded = false,
}) => {
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
      $hidden={hidden}
      $fit={fit}
      $padded={padded}
    />
  );
};
