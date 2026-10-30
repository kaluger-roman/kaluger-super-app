import type { FC } from "react";

import { VideocamOff as VideocamOffIcon } from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";
import { useUnit } from "effector-react";

import { peerViewModel } from "../../model";
import { SHORT_STAGE_QUERY } from "../../videoCall.constants";
import type { CallMediaState } from "../../videoCall.types";
import { CallAvatar } from "../CallAvatar";
import { InterruptionLabel } from "../InterruptionLabel";
import { CallVideo } from "./CallVideo";
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
  config: TileVariantConfig;
};

export const TileContent: FC<TileContentProps> = ({ name, media, stream, config }) => {
  const isPeerInterrupted = useUnit(peerViewModel.$isPeerInterrupted);
  const interrupted = config.isPeer && isPeerInterrupted;
  const kind = getTileContentKind(media);
  const showVideo = kind !== "placeholder";
  const shortStage = useMediaQuery(SHORT_STAGE_QUERY);

  return (
    <>
      {stream && (
        <CallVideo
          stream={stream}
          hidden={!showVideo}
          fit={getVideoFit(kind)}
          layout={getVideoLayout(kind, config, shortStage)}
          isPeer={config.isPeer}
        />
      )}
      {!showVideo && (
        <Styled.PlaceholderColumn>
          <CallAvatar name={name} size={config.avatarSize} isSelf={config.selfAvatar} />
          {interrupted && <InterruptionLabel />}
          {!interrupted && config.showCameraLabel && (
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
