import type { FC } from "react";

import { MicOff as MicOffIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import { TileContent } from "./TileContent";
import { TILE_VARIANTS } from "./VideoTile.constants";
import * as Styled from "./VideoTile.styled";
import type { TileVariant } from "./VideoTile.types";
import type { CallMediaState } from "../../videoCall.types";
import { FullscreenToggleButton } from "../FullscreenToggleButton";
import { ScreenShareLabel } from "../ScreenShareLabel";

type VideoTileProps = {
  name: string;
  media: CallMediaState;
  variant: TileVariant;
  stream?: MediaStream | null;
  muted?: boolean;
};

export const VideoTile: FC<VideoTileProps> = ({
  name,
  media,
  variant,
  stream = null,
  muted = false,
}) => {
  const config = TILE_VARIANTS[variant];
  const micBadge = !media.micOn && (
    <Styled.StatusBadge $size={config.badgeSize} aria-label="Микрофон выключен">
      <MicOffIcon />
    </Styled.StatusBadge>
  );

  const hasTopEnd = config.fullscreenToggle || (!config.badgeInNameRow && !media.micOn);

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
      <TileContent name={name} media={media} stream={stream} muted={muted} config={config} />

      {!config.bare && (
        <Styled.TopRow>
          {media.screenSharing && <ScreenShareLabel />}
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
