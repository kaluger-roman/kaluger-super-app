import type { FC } from "react";

import { CallEnd as CallEndIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { CallAvatar } from "../CallAvatar";
import * as Styled from "./OutgoingCallOverlay.styled";

export const OutgoingCallOverlay: FC = () => {
  const peer = useUnit(callModel.$outgoingCallPeer);
  const cancel = useUnit(callModel.cancelCall);

  const peerName = peer?.name ?? "";

  return (
    <Styled.Backdrop>
      <Styled.Caption variant="overline">Вызываем…</Styled.Caption>

      <Styled.Ring>
        <CallAvatar name={peerName} size={120} />
      </Styled.Ring>

      <Styled.Name variant="h5">{peerName}</Styled.Name>

      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Styled.CancelButton onClick={() => cancel()} aria-label="Отменить вызов">
          <CallEndIcon />
        </Styled.CancelButton>
        <Styled.CancelLabel variant="body2">Отменить</Styled.CancelLabel>
      </Box>
    </Styled.Backdrop>
  );
};
