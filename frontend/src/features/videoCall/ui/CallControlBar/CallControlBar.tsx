import type { FC } from "react";

import {
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
} from "@mui/icons-material";
import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { RoundCallButton } from "../RoundCallButton";
import * as Styled from "./CallControlBar.styled";

export const CallControlBar: FC = () => {
  const selfMedia = useUnit(callModel.$selfMediaState);
  const screenShareSupported = useUnit(callModel.$screenShareSupported);
  const localMediaReady = useUnit(callModel.$localMediaReady);
  const actions = useUnit({
    toggleMic: callModel.toggleMic,
    toggleCamera: callModel.toggleCamera,
    toggleScreen: callModel.toggleScreenShare,
    hangUp: callModel.hangUp,
  });

  return (
    <Styled.BarBox>
      <RoundCallButton
        $tone={selfMedia.micOn ? "neutral" : "danger"}
        $size={56}
        disabled={!localMediaReady}
        onClick={() => actions.toggleMic()}
        aria-label={selfMedia.micOn ? "Выключить микрофон" : "Включить микрофон"}
      >
        {selfMedia.micOn ? <MicIcon /> : <MicOffIcon />}
      </RoundCallButton>

      <RoundCallButton
        $tone={selfMedia.cameraOn ? "neutral" : "danger"}
        $size={56}
        disabled={!localMediaReady}
        onClick={() => actions.toggleCamera()}
        aria-label={selfMedia.cameraOn ? "Выключить камеру" : "Включить камеру"}
      >
        {selfMedia.cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
      </RoundCallButton>

      {screenShareSupported && (
        <RoundCallButton
          $tone={selfMedia.screenSharing ? "active" : "neutral"}
          $size={56}
          onClick={() => actions.toggleScreen()}
          aria-label={
            selfMedia.screenSharing ? "Остановить демонстрацию экрана" : "Демонстрация экрана"
          }
        >
          {selfMedia.screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </RoundCallButton>
      )}

      <RoundCallButton
        $tone="danger"
        $size={56}
        $wide
        onClick={() => actions.hangUp()}
        aria-label="Завершить звонок"
      >
        <CallEndIcon />
      </RoundCallButton>
    </Styled.BarBox>
  );
};
