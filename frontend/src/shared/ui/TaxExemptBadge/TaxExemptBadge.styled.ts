import { Box } from "@mui/material";

import {
  TAX_EXEMPT_BACKGROUND_COLOR,
  TAX_EXEMPT_BORDER_COLOR,
  TAX_EXEMPT_COLOR,
} from "./TaxExemptBadge.constants";
import { styled } from "../../lib/styled.helpers";

export const Badge = styled(Box)<{ $isIconOnly: boolean }>(({ theme, $isIconOnly }) => ({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  gap: theme.spacing(0.5),
  padding: $isIconOnly ? 0 : "1px 6px 1px 2px",
  borderRadius: 8,
  border: $isIconOnly ? "none" : `1px solid ${TAX_EXEMPT_BORDER_COLOR}`,
  backgroundColor: $isIconOnly ? "transparent" : TAX_EXEMPT_BACKGROUND_COLOR,
  color: TAX_EXEMPT_COLOR,
  fontSize: "0.8125rem",
  fontWeight: 600,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  cursor: "help",
  "&:focus-visible": {
    outline: `2px solid ${TAX_EXEMPT_COLOR}`,
    outlineOffset: 1,
  },
}));

export const Mark = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 24,
  height: 16,
  padding: "0 3px",
  borderRadius: 6,
  backgroundColor: TAX_EXEMPT_COLOR,
  color: "#FFFFFF",
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
});

export const TooltipContent = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.25),
  padding: theme.spacing(0.25, 0),
}));

export const TooltipTitle = styled("span")({
  fontWeight: 700,
});
