import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { NOTES_COLLAPSED_LINES } from "./LessonNotes.constants";

export const NotesContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  paddingTop: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const NotesText = styled(Typography)<{ $expanded: boolean }>(
  ({ theme, $expanded }) => ({
    color: theme.palette.text.secondary,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    ...(!$expanded && {
      display: "-webkit-box",
      WebkitLineClamp: NOTES_COLLAPSED_LINES,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    }),
  })
);

export const ToggleButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  padding: theme.spacing(0.75, 0.5),
  minHeight: 32,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: theme.palette.primary.main,
  font: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 600,
  lineHeight: 1.2,
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    textDecoration: "underline",
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));
