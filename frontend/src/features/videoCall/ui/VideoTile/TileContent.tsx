import type { FC } from "react";

import { VideocamOff as VideocamOffIcon } from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";

import type { CallMediaState, TileInterruption } from "../../videoCall.types";
import { CallAvatar } from "../CallAvatar";
import { CallVideo } from "./CallVideo";
import { InterruptionLabel } from "./InterruptionLabel";
import { SHORT_STAGE_QUERY } from "./VideoTile.constants";
import {
  getCameraLabel,
  getTileContentKind,
  getVideoFit,
  getVideoLayout,
} from "./VideoTile.helpers";
import * as Styled from "./VideoTile.styled";
import type { TileVariantConfig } from "./VideoTile.types";

type TileContentProps = {
  name: string;
  media: CallMediaState;
  stream: MediaStream | null;
  muted: boolean;
  config: TileVariantConfig;
  interruption: TileInterruption | null;
};

export const TileContent: FC<TileContentProps> = ({
  name,
  media,
  stream,
  muted,
  config,
  interruption,
}) => {
  const kind = getTileContentKind(media);
  // A frozen last frame would pass for a live peer, so an interrupted tile shows the placeholder.
  const showVideo = kind !== "placeholder" && !interruption;
  const shortStage = useMediaQuery(SHORT_STAGE_QUERY);

  return (
    <>
      {stream && (
        <CallVideo
          stream={stream}
          muted={muted}
          hidden={!showVideo}
          fit={getVideoFit(kind)}
          layout={getVideoLayout(kind, config, shortStage)}
        />
      )}
      {!showVideo && (
        <Styled.PlaceholderColumn>
          <CallAvatar name={name} size={config.avatarSize} isSelf={config.selfAvatar} />
          {interruption && <InterruptionLabel interruption={interruption} />}
          {!interruption && config.showCameraLabel && (
            <Styled.PlaceholderLabel variant="body2">
              <VideocamOffIcon fontSize="small" />
              {getCameraLabel(media)}
            </Styled.PlaceholderLabel>
          )}
        </Styled.PlaceholderColumn>
      )}
    </>
  );
};
