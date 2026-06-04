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

import * as Styled from "./CallControlBar.styled";
import { callModel } from "../../model";

export const CallControlBar: FC = () => {
  const selfMedia = useUnit(callModel.$selfMediaState);
  const peerMedia = useUnit(callModel.$peerMediaState);
  const actions = useUnit({
    toggleMic: callModel.toggleMic,
    toggleCamera: callModel.toggleCamera,
    toggleScreen: callModel.toggleScreenShare,
    hangUp: callModel.hangUp,
  });

  const screenShareDisabled = peerMedia.screenSharing && !selfMedia.screenSharing;

  return (
    <Styled.BarBox>
      <Styled.ControlButton
        $active={selfMedia.micOn}
        onClick={() => actions.toggleMic()}
        aria-label={selfMedia.micOn ? "Выключить микрофон" : "Включить микрофон"}
      >
        {selfMedia.micOn ? <MicIcon /> : <MicOffIcon />}
      </Styled.ControlButton>

      <Styled.ControlButton
        $active={selfMedia.cameraOn}
        onClick={() => actions.toggleCamera()}
        aria-label={selfMedia.cameraOn ? "Выключить камеру" : "Включить камеру"}
      >
        {selfMedia.cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
      </Styled.ControlButton>

      <Styled.ScreenButton
        $sharing={selfMedia.screenSharing}
        disabled={screenShareDisabled}
        onClick={() => actions.toggleScreen()}
        aria-label={
          selfMedia.screenSharing
            ? "Остановить демонстрацию экрана"
            : "Демонстрация экрана"
        }
      >
        {selfMedia.screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
      </Styled.ScreenButton>

      <Styled.EndCallButton onClick={() => actions.hangUp()} aria-label="Завершить звонок">
        <CallEndIcon />
      </Styled.EndCallButton>
    </Styled.BarBox>
  );
};
