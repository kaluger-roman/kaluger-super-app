import type { FC } from "react";

import { useUnit } from "effector-react";

import { callBannerModel, callFullscreenModel, callModel, peerViewModel } from "../../model";
import { formatCallDuration } from "../../videoCall.helpers";
import { BackgroundAudioHint } from "../BackgroundAudioHint";
import { CallControlBar } from "../CallControlBar";
import { CallStatusBanner } from "../CallStatusBanner";
import { FullscreenControls } from "../FullscreenControls";
import { PeerAudio } from "../PeerAudio";
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
  const peerMedia = useUnit(peerViewModel.$shownPeerMedia);
  const isPeerInterrupted = useUnit(peerViewModel.$isPeerInterrupted);
  const localStream = useUnit(callModel.$localTileStream);
  const remoteStream = useUnit(callModel.$remoteStream);
  const bannerText = useUnit(callBannerModel.$callBannerText);
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
      <PeerAudio />

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

      {!isFullscreen && <BackgroundAudioHint />}

      <Styled.StageBox $fullscreen={isFullscreen}>
        {bannerText && !isFullscreen && (
          <Styled.BannerSlot>
            <CallStatusBanner text={bannerText} />
          </Styled.BannerSlot>
        )}

        <Styled.RemoteWrap
          $screen={peerMedia.screenSharing}
          $interrupted={isPeerInterrupted}
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
