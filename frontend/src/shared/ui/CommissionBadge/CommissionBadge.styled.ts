import { Box } from "@mui/material";

import {
  COMMISSION_FACT_BORDER_COLOR,
  COMMISSION_FACT_COLOR,
  COMMISSION_FORECAST_COLOR,
} from "./CommissionBadge.constants";
import { styled } from "../../lib/styled.helpers";

// A forecast differs from a fact by more than colour: dashed border, italics,
// a leading tilde and an outlined icon all survive greyscale (FR-020, FR-026).
export const Badge = styled(Box)<{ $isForecast: boolean }>(({ theme, $isForecast }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  maxWidth: "100%",
  padding: "1px 6px",
  borderRadius: 8,
  fontSize: "0.8125rem",
  fontWeight: $isForecast ? 500 : 700,
  fontStyle: $isForecast ? "italic" : "normal",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  color: $isForecast ? COMMISSION_FORECAST_COLOR : COMMISSION_FACT_COLOR,
  backgroundColor: $isForecast ? "transparent" : "#F3E5F5",
  border: $isForecast
    ? `1px dashed ${COMMISSION_FORECAST_COLOR}`
    : `1px solid ${COMMISSION_FACT_BORDER_COLOR}`,
}));

export const BadgeText = styled("span")({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const Icon = styled(Box)({
  display: "inline-flex",
  "& .MuiSvgIcon-root": {
    fontSize: 16,
  },
});
