import type { FC } from "react";

import {
  MicOff as MicOffIcon,
  MicOffOutlined as MicSuspendedIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import { TileContent } from "./TileContent";
import { TILE_VARIANTS } from "./VideoTile.constants";
import * as Styled from "./VideoTile.styled";
import type { TileVariant } from "./VideoTile.types";
import type { CallMediaState, TileInterruption } from "../../videoCall.types";
import { FullscreenToggleButton } from "../FullscreenToggleButton";
import { ScreenShareLabel } from "../ScreenShareLabel";

type VideoTileProps = {
  name: string;
  media: CallMediaState;
  variant: TileVariant;
  stream?: MediaStream | null;
  muted?: boolean;
  interruption?: TileInterruption | null;
  audioNotice?: string | null;
};

export const VideoTile: FC<VideoTileProps> = ({
  name,
  media,
  variant,
  stream = null,
  muted = false,
  interruption = null,
  audioNotice = null,
}) => {
  const config = TILE_VARIANTS[variant];
  // A mic the system suspended gets its own amber notice instead of the red "turned off" badge.
  const micBadge = !media.micOn && !audioNotice && (
    <Styled.StatusBadge $size={config.badgeSize} aria-label="Микрофон выключен">
      <MicOffIcon />
    </Styled.StatusBadge>
  );

  const hasTopEnd = config.fullscreenToggle || (!config.badgeInNameRow && Boolean(micBadge));

  return (
    <Styled.TileBox
      $hasVideo={media.cameraOn && !interruption}
      $isScreen={media.screenSharing && !interruption}
      $bare={config.bare}
      $minHeight={config.minHeight}
      $inset={config.inset}
      $gap={config.gap}
      data-variant={variant}
    >
      <TileContent
        name={name}
        media={media}
        stream={stream}
        muted={muted}
        config={config}
        interruption={interruption}
      />

      {!config.bare && (
        <Styled.TopRow>
          {media.screenSharing && !interruption && <ScreenShareLabel />}
          {audioNotice && (
            <Styled.AudioNoticePill role="status">
              <MicSuspendedIcon fontSize="small" />
              {audioNotice}
            </Styled.AudioNoticePill>
          )}
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
