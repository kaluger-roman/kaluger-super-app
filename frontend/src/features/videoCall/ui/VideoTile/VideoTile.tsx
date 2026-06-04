import type { FC } from "react";

import {
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import { TileContent } from "./TileContent";
import * as Styled from "./VideoTile.styled";

type VideoTileProps = {
  name: string;
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  audioOnly: boolean;
  avatarSize?: number;
  stream?: MediaStream | null;
  muted?: boolean;
};

export const VideoTile: FC<VideoTileProps> = ({
  name,
  micOn,
  cameraOn,
  screenSharing,
  audioOnly,
  avatarSize = 96,
  stream = null,
  muted = false,
}) => (
  <Styled.TileBox $hasVideo={cameraOn} $isScreen={screenSharing}>
    <TileContent
      name={name}
      cameraOn={cameraOn}
      screenSharing={screenSharing}
      audioOnly={audioOnly}
      avatarSize={avatarSize}
      stream={stream}
      muted={muted}
    />

    {screenSharing && (
      <Tooltip title="Демонстрация экрана">
        <Styled.ScreenLabelPill>
          <ScreenShareIcon fontSize="small" />
          <Styled.ScreenLabelText>Демонстрация экрана</Styled.ScreenLabelText>
        </Styled.ScreenLabelPill>
      </Tooltip>
    )}

    <Styled.NameChipRow>
      <Tooltip title={name}>
        <Styled.NamePill>{name}</Styled.NamePill>
      </Tooltip>
    </Styled.NameChipRow>

    {!micOn && (
      <Styled.TopRightBadges>
        <Styled.StatusBadge $variant="muted" aria-label="Микрофон выключен">
          <MicOffIcon fontSize="small" />
        </Styled.StatusBadge>
      </Styled.TopRightBadges>
    )}
  </Styled.TileBox>
);
