import { Container, Box, Typography, Paper } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)({
  paddingTop: 32,
  paddingBottom: 32,
});

export const HeaderBox = styled(Box)({
  marginBottom: 32,
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
}) as typeof Typography;

export const TokenSection = styled(Paper)({
  padding: 16,
  marginBottom: 24,
});

export const CodeBlock = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  backgroundColor: "#1e1e1e",
  borderRadius: 8,
  padding: 12,
  marginTop: 8,
});

export const CodeText = styled(Typography)({
  fontFamily: "monospace",
  fontSize: 13,
  color: "#d4d4d4",
  wordBreak: "break-all",
  flex: 1,
});

export const ScreenSection = styled(Box)({
  marginTop: 16,
});

export const ScreenImage = styled("img")({
  width: "100%",
  borderRadius: 8,
  border: "1px solid rgba(0, 0, 0, 0.12)",
});
