import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./InstallPrompt.styled";
import { appInitModel } from "../../model";

export const InstallPrompt = () => {
  const showBanner = useUnit(appInitModel.$showInstallBanner);
  const installPrompt = useUnit(appInitModel.$installPrompt);

  const actions = useUnit({
    installApp: appInitModel.installApp,
    dismiss: appInitModel.installPromptDismissed,
  });

  if (!showBanner || !installPrompt) return null;

  const handleInstall = () => {
    installPrompt.prompt();
    installPrompt.userChoice.then(() => actions.dismiss());
  };

  return (
    <Styled.Banner elevation={3}>
      <Styled.Text>Установите приложение для быстрого доступа</Styled.Text>
      <Styled.InstallButton variant="contained" size="small" onClick={handleInstall}>
        Установить
      </Styled.InstallButton>
      <IconButton size="small" onClick={() => actions.dismiss()}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Styled.Banner>
  );
};
