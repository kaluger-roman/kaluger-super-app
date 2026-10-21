import type { FC } from "react";

import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { CONNECTING_TEXT } from "../../videoCall.constants";
import { formatCallDuration } from "../../videoCall.helpers";
import { CallControlBar } from "../CallControlBar";
import { CallStatusBanner } from "../CallStatusBanner";
import { VideoTile } from "../VideoTile";
import * as Styled from "./ActiveCallScreen.styled";

export const ActiveCallScreen: FC = () => {
  const peerName = useUnit(callModel.$activePeerName);
  const durationSeconds = useUnit(callModel.$callDurationSeconds);
  const selfMedia = useUnit(callModel.$selfMediaState);
  const peerMedia = useUnit(callModel.$peerMediaState);
  const isConnecting = useUnit(callModel.$isConnecting);
  const localStream = useUnit(callModel.$localTileStream);
  const remoteStream = useUnit(callModel.$remoteStream);

  // The peer's shared screen needs the room, so the own tile shrinks while it is shown.
  const compactPip = peerMedia.screenSharing;

  return (
    <Styled.Root>
      <Styled.Header>
        <Styled.HeaderInfo>
          <Styled.PeerName variant="h6">{peerName}</Styled.PeerName>
          <Styled.CallTimer variant="body2">{formatCallDuration(durationSeconds)}</Styled.CallTimer>
        </Styled.HeaderInfo>
      </Styled.Header>

      <Styled.StageBox>
        {isConnecting && (
          <Styled.BannerSlot>
            <CallStatusBanner text={CONNECTING_TEXT} />
          </Styled.BannerSlot>
        )}

        <Styled.RemoteWrap $screen={peerMedia.screenSharing}>
          <VideoTile name={peerName} media={peerMedia} variant="remote" stream={remoteStream} />
        </Styled.RemoteWrap>

        <Styled.LocalPip $compact={compactPip} data-testid="local-pip" data-compact={compactPip}>
          <VideoTile
            name="Вы"
            media={selfMedia}
            variant={compactPip ? "selfCompact" : "self"}
            stream={localStream}
            muted
          />
        </Styled.LocalPip>
      </Styled.StageBox>

      <CallControlBar />
    </Styled.Root>
  );
};
