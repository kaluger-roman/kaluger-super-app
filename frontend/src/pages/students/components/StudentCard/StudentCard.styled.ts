import { Box, Typography, Card, Accordion, Divider } from "@mui/material";

import { styled } from "@shared";

export const StyledCard = styled(Card)({
  cursor: "pointer",
});

export const CardContentBox = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const HeaderBox = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

export const ContentBox = styled(Box)({
  flex: 1,
});

export const StudentName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
}));

export const DetailsAccordion = styled(Accordion)(({ theme }) => ({
  marginTop: theme.spacing(2),
  boxShadow: "none",
}));

export const AccordionContent = styled(Box)({
  padding: 0,
  minHeight: "auto",
  "& .MuiAccordionSummary-content": {
    margin: "8px 0",
  },
});

export const AccordionDetailsBox = styled(Box)({
  padding: 0,
});

export const NotesBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

export const NotesLabel = styled(Typography)({
  fontWeight: 600,
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));
