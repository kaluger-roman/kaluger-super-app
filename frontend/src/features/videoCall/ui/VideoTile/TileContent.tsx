import type { FC } from "react";

import { VideocamOff as VideocamOffIcon } from "@mui/icons-material";

import type { CallMediaState } from "../../videoCall.types";
import { CallAvatar } from "../CallAvatar";
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
  muted: boolean;
  config: TileVariantConfig;
};

export const TileContent: FC<TileContentProps> = ({ name, media, stream, muted, config }) => {
  const kind = getTileContentKind(media);
  const showVideo = kind !== "placeholder";

  return (
    <>
      {stream && (
        <CallVideo
          stream={stream}
          muted={muted}
          hidden={!showVideo}
          fit={getVideoFit(kind)}
          layout={getVideoLayout(kind, config)}
        />
      )}
      {!showVideo && (
        <Styled.PlaceholderColumn>
          <CallAvatar name={name} size={config.avatarSize} isSelf={config.selfAvatar} />
          {config.showCameraLabel && (
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
