import { Button as MuiButton, Paper as MuiPaper, Typography as MuiTypography } from "@mui/material";

import { styled } from "@shared";

export const Banner = styled(MuiPaper)`
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 1300;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const Text = styled(MuiTypography)`
  font-size: 14px;
`;

export const InstallButton = styled(MuiButton)`
  white-space: nowrap;
`;
