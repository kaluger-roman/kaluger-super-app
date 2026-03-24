import CloseIcon from "@mui/icons-material/Close";
import IosShareIcon from "@mui/icons-material/IosShare";
import { IconButton } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./InstallPrompt.styled";
import { appInitModel } from "../../model";

export const InstallPrompt = () => {
  const showBanner = useUnit(appInitModel.$showInstallBanner);
  const installPrompt = useUnit(appInitModel.$installPrompt);
  const showIosHint = useUnit(appInitModel.$showIosInstallHint);

  const actions = useUnit({
    dismiss: appInitModel.installPromptDismissed,
    dismissIos: appInitModel.iosInstallHintDismissed,
  });

  // Chrome/Edge install prompt
  if (showBanner && installPrompt) {
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
  }

  // iOS Safari install hint
  if (showIosHint) {
    return (
      <Styled.Banner elevation={3}>
        <div>
          <Styled.Text>Установите приложение на домашний экран</Styled.Text>
          <Styled.IosInstruction>
            Нажмите <IosShareIcon sx={{ fontSize: 16, verticalAlign: "middle" }} /> → «На экран Домой»
          </Styled.IosInstruction>
        </div>
        <IconButton size="small" onClick={() => actions.dismissIos()}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Styled.Banner>
    );
  }

  return null;
};
