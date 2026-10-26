import type { FC } from "react";

import { useUnit } from "effector-react";

import { callFullscreenModel, callModel } from "../../model";
import { CONNECTING_TEXT } from "../../videoCall.constants";
import { formatCallDuration } from "../../videoCall.helpers";
import { CallControlBar } from "../CallControlBar";
import { CallStatusBanner } from "../CallStatusBanner";
import { FullscreenControls } from "../FullscreenControls";
import { VideoTile } from "../VideoTile";
import {
  useCallActivity,
  useDoubleTapToggle,
  useFullscreenEscape,
  usePageZoomGuard,
} from "./ActiveCallScreen.hooks";
import * as Styled from "./ActiveCallScreen.styled";

export const ActiveCallScreen: FC = () => {
  const peerName = useUnit(callModel.$activePeerName);
  const durationSeconds = useUnit(callModel.$callDurationSeconds);
  const selfMedia = useUnit(callModel.$selfMediaState);
  const peerMedia = useUnit(callModel.$peerMediaState);
  const isConnecting = useUnit(callModel.$isConnecting);
  const localStream = useUnit(callModel.$localTileStream);
  const remoteStream = useUnit(callModel.$remoteStream);
  const isFullscreen = useUnit(callFullscreenModel.$isFullscreen);
  const isCursorHidden = useUnit(callFullscreenModel.$isCursorHidden);
  const activityHandlers = useCallActivity();
  const doubleTapHandlers = useDoubleTapToggle();
  const controlsInteractive = useUnit(callFullscreenModel.$controlsInteractive);
  useFullscreenEscape();
  usePageZoomGuard();

  // The peer's shared screen needs the room, so the own tile shrinks while it is shown.
  const compactPip = peerMedia.screenSharing;

  // Element order stays the same in both modes, so the peer's <video> is never remounted.
  return (
    <Styled.Root
      $fullscreen={isFullscreen}
      $hideCursor={isCursorHidden}
      data-fullscreen={isFullscreen}
      data-cursor-hidden={isCursorHidden}
      {...activityHandlers}
    >
      {!isFullscreen && (
        <Styled.Header>
          <Styled.HeaderInfo>
            <Styled.PeerName variant="h6">{peerName}</Styled.PeerName>
            <Styled.CallTimer variant="body2">
              {formatCallDuration(durationSeconds)}
            </Styled.CallTimer>
          </Styled.HeaderInfo>
        </Styled.Header>
      )}

      <Styled.StageBox $fullscreen={isFullscreen}>
        {isConnecting && !isFullscreen && (
          <Styled.BannerSlot>
            <CallStatusBanner text={CONNECTING_TEXT} />
          </Styled.BannerSlot>
        )}

        <Styled.RemoteWrap
          $screen={peerMedia.screenSharing}
          $fullscreen={isFullscreen}
          data-testid="remote-stage"
          {...doubleTapHandlers}
        >
          <VideoTile
            name={peerName}
            media={peerMedia}
            variant={isFullscreen ? "fullscreen" : "remote"}
            stream={remoteStream}
          />
        </Styled.RemoteWrap>

        {!isFullscreen && (
          <Styled.LocalPip $compact={compactPip} data-testid="local-pip" data-compact={compactPip}>
            <VideoTile
              name="Вы"
              media={selfMedia}
              variant={compactPip ? "selfCompact" : "self"}
              stream={localStream}
              muted
            />
          </Styled.LocalPip>
        )}
      </Styled.StageBox>

      {isFullscreen ? (
        <FullscreenControls />
      ) : (
        <Styled.ControlsGuard
          $interactive={controlsInteractive}
          data-testid="call-controls"
          data-interactive={controlsInteractive}
        >
          <CallControlBar />
        </Styled.ControlsGuard>
      )}
    </Styled.Root>
  );
};
