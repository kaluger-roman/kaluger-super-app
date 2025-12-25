import { Box, Typography, Dialog } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

type DialogPaperProps = {
  $isMobile: boolean;
};

export const StyledDialog = styled(Dialog)<DialogPaperProps>(({ theme, $isMobile }) => ({
  "& .MuiDialog-paper": {
    borderRadius: $isMobile ? 0 : theme.spacing(0.25),
    margin: $isMobile ? theme.spacing(2) : theme.spacing(3),
  },
}));

export const TitleBox = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

type ActionsBoxProps = {
  $isMobile: boolean;
};

export const ActionsBox = styled(Box)<ActionsBoxProps>(({ theme, $isMobile }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(1),
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  gap: $isMobile ? theme.spacing(1) : 0,
}));

type TitleTextProps = {
  $isMobile: boolean;
};

export const TitleText = styled(Typography)<TitleTextProps>(({ $isMobile }) => ({
  variant: $isMobile ? "h6" : "h6",
}));

type ContentTextProps = {
  $isMobile: boolean;
};

export const ContentText = styled(Typography)<ContentTextProps>(({ $isMobile }) => ({
  variant: $isMobile ? "body2" : "body1",
}));
