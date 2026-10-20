import type { FC } from "react";

import { VideocamOff as VideocamOffIcon } from "@mui/icons-material";

import { CallAvatar } from "../CallAvatar";
import { CallVideo } from "./CallVideo";
import { getTileContentKind, getVideoFit, shouldPadVideo } from "./VideoTile.helpers";
import * as Styled from "./VideoTile.styled";

type TileContentProps = {
  name: string;
  cameraOn: boolean;
  screenSharing: boolean;
  audioOnly: boolean;
  avatarSize: number;
  stream: MediaStream | null;
  muted: boolean;
  isSelf: boolean;
  compact: boolean;
};

export const TileContent: FC<TileContentProps> = ({
  name,
  cameraOn,
  screenSharing,
  audioOnly,
  avatarSize,
  stream,
  muted,
  isSelf,
  compact,
}) => {
  const contentKind = getTileContentKind(cameraOn, screenSharing);
  const showVideo = contentKind !== "placeholder";

  return (
    <>
      {stream && (
        <CallVideo
          stream={stream}
          muted={muted}
          hidden={!showVideo}
          fit={getVideoFit(contentKind)}
          padded={shouldPadVideo(contentKind, isSelf)}
        />
      )}
      {!showVideo && (
        <Styled.PlaceholderColumn>
          <CallAvatar name={name} size={avatarSize} isSelf={isSelf} />
          {!compact && (
            <Styled.PlaceholderLabel variant="body2">
              <VideocamOffIcon fontSize="small" />
              {audioOnly ? "Камера недоступна" : "Камера выключена"}
            </Styled.PlaceholderLabel>
          )}
        </Styled.PlaceholderColumn>
      )}
    </>
  );
};
