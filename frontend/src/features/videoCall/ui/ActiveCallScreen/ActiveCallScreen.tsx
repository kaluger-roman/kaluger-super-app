import type { FC } from "react";

import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { formatCallDuration } from "../../videoCall.helpers";
import { CallControlBar } from "../CallControlBar";
import { CallStatusBanner } from "../CallStatusBanner";
import { VideoTile } from "../VideoTile";
import { isAudioOnly, toBanner } from "./ActiveCallScreen.helpers";
import { useCallStreams } from "./ActiveCallScreen.hooks";
import * as Styled from "./ActiveCallScreen.styled";

export const ActiveCallScreen: FC = () => {
  const peerName = useUnit(callModel.$activePeerName);
  const durationSeconds = useUnit(callModel.$callDurationSeconds);
  const selfMedia = useUnit(callModel.$selfMediaState);
  const peerMedia = useUnit(callModel.$peerMediaState);
  const statusMessage = useUnit(callModel.$callStatusMessage);
  const { localStream, remoteStream } = useCallStreams();

  const banner = toBanner(statusMessage);

  return (
    <Styled.Root>
      <Styled.Header>
        <Styled.HeaderInfo>
          <Styled.PeerName variant="h6">{peerName}</Styled.PeerName>
          <Styled.CallTimer variant="body2">
            {formatCallDuration(durationSeconds)}
          </Styled.CallTimer>
        </Styled.HeaderInfo>
      </Styled.Header>

      <Styled.StageBox>
        {banner && (
          <Styled.BannerSlot>
            <CallStatusBanner variant={banner.variant} text={banner.text} />
          </Styled.BannerSlot>
        )}

        <Styled.RemoteWrap>
          <VideoTile
            name={peerName}
            micOn={peerMedia.micOn}
            cameraOn={peerMedia.cameraOn}
            screenSharing={peerMedia.screenSharing}
            audioOnly={isAudioOnly(peerMedia)}
            avatarSize={96}
            stream={remoteStream}
            muted={false}
          />
        </Styled.RemoteWrap>

        <Styled.LocalPip>
          <VideoTile
            name="Вы"
            micOn={selfMedia.micOn}
            cameraOn={selfMedia.cameraOn}
            screenSharing={selfMedia.screenSharing}
            audioOnly={isAudioOnly(selfMedia)}
            avatarSize={56}
            stream={localStream}
            muted
          />
        </Styled.LocalPip>
      </Styled.StageBox>

      <Styled.Controls>
        <CallControlBar />
      </Styled.Controls>
    </Styled.Root>
  );
};
