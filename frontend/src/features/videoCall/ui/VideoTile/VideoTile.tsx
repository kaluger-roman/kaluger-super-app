import type { FC } from "react";

import { MicOff as MicOffIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useUnit } from "effector-react";

import { TileContent } from "./TileContent";
import { TILE_VARIANTS } from "./VideoTile.constants";
import * as Styled from "./VideoTile.styled";
import type { TileVariant } from "./VideoTile.types";
import { peerViewModel } from "../../model";
import type { CallMediaState } from "../../videoCall.types";
import { FullscreenToggleButton } from "../FullscreenToggleButton";
import { PeerAudioNotice } from "../PeerAudioNotice";
import { ScreenShareLabel } from "../ScreenShareLabel";

type VideoTileProps = {
  name: string;
  media: CallMediaState;
  variant: TileVariant;
  stream?: MediaStream | null;
};

// The peer's tile gets the peer's shown media (`peerViewModel.$shownPeerMedia`): no video while
// the peer is interrupted.
export const VideoTile: FC<VideoTileProps> = ({ name, media, variant, stream = null }) => {
  const config = TILE_VARIANTS[variant];
  const peerAudioNotice = useUnit(peerViewModel.$peerAudioNotice);
  const audioNotice = config.isPeer ? peerAudioNotice : null;
  // A mic the system suspended gets its own amber notice instead of the red "turned off" badge.
  const micBadge = !media.micOn && !audioNotice && (
    <Styled.StatusBadge $size={config.badgeSize} aria-label="Микрофон выключен">
      <MicOffIcon />
    </Styled.StatusBadge>
  );

  const hasTopEnd = config.fullscreenToggle || (!config.badgeInNameRow && Boolean(micBadge));

  return (
    <Styled.TileBox
      $hasVideo={media.cameraOn}
      $isScreen={media.screenSharing}
      $bare={config.bare}
      $minHeight={config.minHeight}
      $inset={config.inset}
      $gap={config.gap}
      data-variant={variant}
    >
      <TileContent name={name} media={media} stream={stream} config={config} />

      {!config.bare && (
        <Styled.TopRow>
          {media.screenSharing && <ScreenShareLabel />}
          {config.isPeer && <PeerAudioNotice />}
          {hasTopEnd && (
            <Styled.TopEnd>
              {!config.badgeInNameRow && micBadge}
              {config.fullscreenToggle && <FullscreenToggleButton placement="tile" />}
            </Styled.TopEnd>
          )}
        </Styled.TopRow>
      )}

      {!config.bare && (
        <Styled.NameRow>
          <Tooltip title={name}>
            <Styled.NamePill $paddingX={config.pillPaddingX}>{name}</Styled.NamePill>
          </Tooltip>
          {config.badgeInNameRow && micBadge}
        </Styled.NameRow>
      )}
    </Styled.TileBox>
  );
};
