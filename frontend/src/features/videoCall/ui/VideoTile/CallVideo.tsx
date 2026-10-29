import type { FC } from "react";
import { useRef } from "react";

import { useUnit } from "effector-react";

import { isContinueCallShown } from "./VideoTile.helpers";
import {
  useCallVideoPlayback,
  usePeerPictureInPicture,
  useStageGeometry,
  useZoomGestures,
  useZoomTransform,
} from "./VideoTile.hooks";
import * as Styled from "./VideoTile.styled";
import type { VideoFit, VideoLayout } from "./VideoTile.types";
import { callFullscreenModel, callZoomModel, peerAudioModel, peerViewModel } from "../../model";
import { ContinueCallOverlay } from "../ContinueCallOverlay";

type CallVideoProps = {
  stream: MediaStream | null;
  hidden: boolean;
  fit: VideoFit;
  layout: VideoLayout;
  isPeer: boolean;
};

export const CallVideo: FC<CallVideoProps> = ({ stream, hidden, fit, layout, isPeer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isBlocked, resume } = useCallVideoPlayback(videoRef, stream);
  const isPeerAudioBlocked = useUnit(peerAudioModel.$peerAudioBlocked);
  const isPeerInterrupted = useUnit(peerViewModel.$isPeerInterrupted);
  const { continueCallClicked } = useUnit({
    continueCallClicked: peerAudioModel.continueCallClicked,
  });
  const showContinue = isContinueCallShown({
    videoBlocked: isBlocked,
    soundBlocked: isPeer && isPeerAudioBlocked,
    interrupted: isPeer && isPeerInterrupted,
  });
  const zoomable = useUnit(callZoomModel.$isZoomAvailable);
  const isZoomed = useUnit(callZoomModel.$isZoomed);
  const isCursorHidden = useUnit(callFullscreenModel.$isCursorHidden);
  const grabbable = zoomable && isZoomed && !isCursorHidden;
  useZoomTransform(videoRef, zoomable);
  useZoomGestures(videoRef, zoomable);
  useStageGeometry(videoRef, zoomable);
  const pictureInPicture = isPeer && !hidden;
  usePeerPictureInPicture(videoRef, pictureInPicture);

  // The video never plays sound: the peer's voice has its own <audio> (PeerAudio).
  return (
    <>
      <Styled.VideoElement
        ref={videoRef}
        autoPlay
        playsInline
        muted
        disablePictureInPicture={!pictureInPicture}
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
      {showContinue && (
        <ContinueCallOverlay
          onContinue={() => {
            resume();
            continueCallClicked();
          }}
        />
      )}
    </>
  );
};
