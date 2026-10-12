import { Box } from "@mui/material";

import {
  RECEIVED_MISMATCH_BACKGROUND_COLOR,
  RECEIVED_MISMATCH_BORDER_COLOR,
  RECEIVED_MISMATCH_COLOR,
} from "./ReceivedAmountHint.constants";
import { styled } from "../../lib/styled.helpers";

export const Trigger = styled(Box)<{ $isIconOnly: boolean }>(({ theme, $isIconOnly }) => ({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  gap: theme.spacing(0.5),
  padding: $isIconOnly ? 2 : "1px 8px 1px 4px",
  borderRadius: $isIconOnly ? "50%" : 8,
  border: $isIconOnly ? "none" : `1px solid ${RECEIVED_MISMATCH_BORDER_COLOR}`,
  backgroundColor: $isIconOnly ? "transparent" : RECEIVED_MISMATCH_BACKGROUND_COLOR,
  color: RECEIVED_MISMATCH_COLOR,
  fontSize: "0.8125rem",
  fontWeight: 600,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  cursor: "help",
  "& .MuiSvgIcon-root": {
    fontSize: 18,
  },
  "&:hover": {
    backgroundColor: RECEIVED_MISMATCH_BACKGROUND_COLOR,
  },
  "&:focus-visible": {
    outline: `2px solid ${RECEIVED_MISMATCH_COLOR}`,
    outlineOffset: 1,
  },
}));

export const TooltipContent = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.25, 0),
  maxWidth: 280,
}));

export const TooltipTitle = styled("span")({
  fontWeight: 700,
});
