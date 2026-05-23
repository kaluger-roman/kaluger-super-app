import CloseIcon from "@mui/icons-material/Close";
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

  const isChrome = showBanner && installPrompt;

  if (!isChrome && !showIosHint) return null;

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => actions.dismiss());
  };

  const handleDismiss = () => (isChrome ? actions.dismiss() : actions.dismissIos());

  return (
    <Styled.Banner elevation={3}>
      <Styled.TextWrapper>
        <Styled.Text>
          {isChrome
            ? "Установите приложение для быстрого доступа и push-уведомлений"
            : "Установите приложение для push-уведомлений"}
        </Styled.Text>
        {!isChrome && (
          <Styled.IosInstruction>
            Нажмите <Styled.ShareIcon /> → «На экран Домой»
          </Styled.IosInstruction>
        )}
      </Styled.TextWrapper>
      {isChrome && (
        <Styled.InstallButton variant="contained" size="small" onClick={handleInstall}>
          Установить
        </Styled.InstallButton>
      )}
      <Styled.CloseButtonWrapper>
        <IconButton size="small" onClick={handleDismiss}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Styled.CloseButtonWrapper>
    </Styled.Banner>
  );
};
