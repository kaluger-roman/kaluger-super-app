import type { FC } from "react";
import { useRef } from "react";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";

import { VIDEO_PAUSED_LABEL } from "./VideoTile.constants";
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
  const { isBlocked, resume } = useCallVideoPlayback(videoRef, stream);

  return (
    <>
      <Styled.VideoElement
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        disablePictureInPicture
        onPause={resume}
        onClick={resume}
        data-layout={layout}
        $hidden={hidden}
        $fit={fit}
        $layout={layout}
      />
      {/* The video also carries the peer's voice, so it is offered even with the camera off. */}
      {isBlocked && (
        <Styled.ResumeOverlay onClick={resume}>
          <PlayArrowIcon />
          {VIDEO_PAUSED_LABEL}
        </Styled.ResumeOverlay>
      )}
    </>
  );
};
