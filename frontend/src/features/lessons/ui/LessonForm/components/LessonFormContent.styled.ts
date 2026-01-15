import { DialogContent, Box } from "@mui/material";

import { styled } from "@shared";

export const StyledDialogContent = styled(DialogContent)<{ $isMobile: boolean }>(
  ({ theme, $isMobile }) => ({
    paddingLeft: $isMobile ? theme.spacing(2) : theme.spacing(3),
    paddingRight: $isMobile ? theme.spacing(2) : theme.spacing(3),
  })
);

export const FormContainer = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: "column",
  gap: $isMobile ? theme.spacing(2) : theme.spacing(3),
}));

export const CheckboxContainer = styled(Box)();

export const DateFieldWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
}));
