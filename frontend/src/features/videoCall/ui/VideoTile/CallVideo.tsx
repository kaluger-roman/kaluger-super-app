import type { FC } from "react";
import { useRef } from "react";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";

import { VIDEO_PAUSED_LABEL } from "./VideoTile.constants";
import {
  useCallVideoPlayback,
  useStageGeometry,
  useZoomGestures,
  useZoomTransform,
} from "./VideoTile.hooks";
import * as Styled from "./VideoTile.styled";
import type { VideoFit, VideoLayout } from "./VideoTile.types";
import { callFullscreenModel, callZoomModel } from "../../model";

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
  const zoomable = useUnit(callZoomModel.$isZoomAvailable);
  const isZoomed = useUnit(callZoomModel.$isZoomed);
  const isCursorHidden = useUnit(callFullscreenModel.$isCursorHidden);
  const grabbable = zoomable && isZoomed && !isCursorHidden;
  useZoomTransform(videoRef, zoomable);
  useZoomGestures(videoRef, zoomable);
  useStageGeometry(videoRef, zoomable);

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
        data-zoomed={zoomable && isZoomed}
        data-grabbable={grabbable}
        $hidden={hidden}
        $fit={fit}
        $layout={layout}
        $zoomable={zoomable}
        $grabbable={grabbable}
      />
      {/* The video also carries the peer's voice, so it is offered even with the camera off.
          A tap on it neither shows the controls nor counts towards a double tap. */}
      {isBlocked && (
        <Styled.ResumeOverlay
          onClick={resume}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <PlayArrowIcon />
          {VIDEO_PAUSED_LABEL}
        </Styled.ResumeOverlay>
      )}
    </>
  );
};
