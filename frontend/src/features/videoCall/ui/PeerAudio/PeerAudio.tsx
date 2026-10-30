import type { FC } from "react";

import { useUnit } from "effector-react";

import { usePeerAudioRef } from "./PeerAudio.hooks";
import * as Styled from "./PeerAudio.styled";
import { peerAudioModel } from "../../model";

// The peer's voice plays apart from the video (FR-009), so iOS pausing the video does not mute it.
export const PeerAudio: FC = () => {
  const audioRef = usePeerAudioRef();
  const { paused } = useUnit({ paused: peerAudioModel.peerAudioPaused });

  return (
    <Styled.AudioElement
      ref={audioRef}
      autoPlay
      playsInline
      onPause={() => paused()}
      data-testid="peer-audio"
    />
  );
};
