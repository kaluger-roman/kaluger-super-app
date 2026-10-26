import type { FC } from "react";
import { useState } from "react";

import { VolumeUp as VolumeUpIcon } from "@mui/icons-material";

import * as Styled from "./RemoteAudio.styled";
import { ENABLE_SOUND_LABEL } from "../../videoCall.constants";
import { getCallBackgroundMock } from "../callBackgroundMock.helpers";

// The peer's voice plays apart from the video, so iOS pausing the video in the background does
// not mute it (FR-009). When the browser wants a tap to resume it, the remote tile asks for one.
export const RemoteAudio: FC = () => {
  // TODO(auto-feature): render the <audio> for callModel.$remoteStream and replace mock with
  // useCallAudioPlayback(audioRef, stream).isBlocked (hook state, like useCallVideoPlayback)
  const isBlocked = getCallBackgroundMock().remoteAudioBlocked;
  // TODO(auto-feature): replace with useCallAudioPlayback(...).resume
  const [resumed, setResumed] = useState(false);

  if (!isBlocked || resumed) return null;

  return (
    <Styled.Overlay onClick={() => setResumed(true)}>
      <Styled.Pill>
        <VolumeUpIcon />
        {ENABLE_SOUND_LABEL}
      </Styled.Pill>
    </Styled.Overlay>
  );
};
