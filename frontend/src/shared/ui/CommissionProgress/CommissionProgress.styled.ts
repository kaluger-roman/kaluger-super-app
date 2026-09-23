import { Box, LinearProgress, Typography } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

const COMMISSION_COLOR = "#6A1B9A";

export const Container = styled(Box)<{ $isCompact: boolean }>(({ theme, $isCompact }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing($isCompact ? 0.5 : 1),
  padding: $isCompact ? 0 : theme.spacing(1.5),
  marginTop: theme.spacing(1),
  borderRadius: $isCompact ? 0 : 12,
  border: $isCompact ? "none" : "1px solid #E1BEE7",
  backgroundColor: $isCompact ? "transparent" : "#FAF4FC",
}));

export const Title = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  fontWeight: 600,
  color: COMMISSION_COLOR,
  "& .MuiSvgIcon-root": {
    fontSize: 18,
  },
}));

// display: block, not flex — on a narrow screen flex keeps the text from
// wrapping onto the icon line and the icon ends up stranded on its own row.
export const CompactSummary = styled(Typography)({
  display: "block",
  color: COMMISSION_COLOR,
  fontWeight: 600,
  "& .MuiSvgIcon-root": {
    fontSize: 16,
    verticalAlign: "-3px",
    marginRight: 4,
  },
});

export const ClosedLine = styled(Typography)({
  display: "block",
});

export const Bar = styled(LinearProgress)<{ $isCompact: boolean }>(({ $isCompact }) => ({
  height: $isCompact ? 4 : 8,
  borderRadius: 4,
  backgroundColor: "#EDE0F2",
  "& .MuiLinearProgress-bar": {
    borderRadius: 4,
    backgroundColor: COMMISSION_COLOR,
  },
}));

export const Row = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
});

export const RowValue = styled(Typography)({
  fontWeight: 600,
});
