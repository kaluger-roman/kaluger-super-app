import type { FC } from "react";

import { CallEnd as CallEndIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { CallAvatar } from "../CallAvatar";
import { RoundCallButton } from "../RoundCallButton";
import * as Styled from "./OutgoingCallOverlay.styled";

export const OutgoingCallOverlay: FC = () => {
  const peer = useUnit(callModel.$outgoingCallPeer);
  const actions = useUnit({ cancel: callModel.cancelCall });

  const peerName = peer?.name ?? "";

  return (
    <Styled.Backdrop>
      <Styled.Caption variant="overline">Вызываем…</Styled.Caption>

      <Styled.Ring>
        <CallAvatar name={peerName} size={120} />
      </Styled.Ring>

      <Styled.Name variant="h5">{peerName}</Styled.Name>

      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Styled.CancelSlot>
          <RoundCallButton
            $tone="danger"
            $size={64}
            onClick={() => actions.cancel()}
            aria-label="Отменить вызов"
          >
            <CallEndIcon />
          </RoundCallButton>
        </Styled.CancelSlot>
        <Styled.CancelLabel variant="body2">Отменить</Styled.CancelLabel>
      </Box>
    </Styled.Backdrop>
  );
};
