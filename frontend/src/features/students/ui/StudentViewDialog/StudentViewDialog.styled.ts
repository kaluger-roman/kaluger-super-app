import { Box, Dialog, DialogActions, Typography } from "@mui/material";

import { styled } from "@shared";

// inline-flex с gap'ом для эмоджи: пробел между глифом эмодзи и текстом
// нестабилен на разных шрифтах.
export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const SectionEmoji = styled("span")({
  display: "inline-block",
  lineHeight: 1,
});

export const IconRow = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

type ActionsContainerProps = {
  $isMobile: boolean;
};

export const ActionsContainer = styled(DialogActions)<ActionsContainerProps>(
  ({ theme, $isMobile }) => ({
    padding: theme.spacing(3),
    paddingTop: theme.spacing(1),
    display: "flex",
    flexDirection: $isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: $isMobile ? "stretch" : "center",
    width: "100%",
    gap: theme.spacing(2),
  })
);

export const ActionsLeft = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flexGrow: 1,
}));

export const ActionsRight = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flexGrow: 1,
}));

type StyledDialogProps = {
  $isMobile: boolean;
};

export const StyledDialog = styled(Dialog)<StyledDialogProps>(({ theme, $isMobile }) => ({
  "& .MuiDialog-paper": {
    borderRadius: $isMobile ? 0 : theme.spacing(2),
    maxHeight: $isMobile ? "100vh" : "90vh",
  },
  // На macOS системные скроллбары скрыты — без явного фолбэка пользователь
  // не понимает, что контент диалога можно прокручивать.
  "& .MuiDialogContent-root": {
    scrollbarWidth: "thin",
    scrollbarColor: `${theme.palette.action.active} transparent`,
    "&::-webkit-scrollbar": {
      width: 8,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.action.active,
      borderRadius: 4,
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
  },
}));
