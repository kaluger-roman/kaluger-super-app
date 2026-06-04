import type { FC } from "react";

import { VideocamOff as VideocamOffIcon } from "@mui/icons-material";

import { CallAvatar } from "../CallAvatar";
import { CallVideo } from "./CallVideo";
import { getTileContentKind } from "./VideoTile.helpers";
import * as Styled from "./VideoTile.styled";

type TileContentProps = {
  name: string;
  cameraOn: boolean;
  screenSharing: boolean;
  audioOnly: boolean;
  avatarSize: number;
  stream: MediaStream | null;
  muted: boolean;
};

export const TileContent: FC<TileContentProps> = ({
  name,
  cameraOn,
  screenSharing,
  audioOnly,
  avatarSize,
  stream,
  muted,
}) => {
  const showVideo = getTileContentKind(cameraOn, screenSharing) !== "placeholder";

  return (
    <>
      {stream && <CallVideo stream={stream} muted={muted} hidden={!showVideo} />}
      {!showVideo && (
        <Styled.PlaceholderColumn>
          <CallAvatar name={name} size={avatarSize} />
          <Styled.PlaceholderLabel variant="body2">
            <VideocamOffIcon fontSize="small" />
            {audioOnly ? "Камера недоступна" : "Камера выключена"}
          </Styled.PlaceholderLabel>
        </Styled.PlaceholderColumn>
      )}
    </>
  );
};
