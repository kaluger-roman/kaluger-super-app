import type { FC } from "react";
import { useEffect, useRef } from "react";

import * as Styled from "./VideoTile.styled";

type CallVideoProps = {
  stream: MediaStream | null;
  muted: boolean;
  hidden?: boolean;
};

export const CallVideo: FC<CallVideoProps> = ({ stream, muted, hidden = false }) => {
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
    />
  );
};
