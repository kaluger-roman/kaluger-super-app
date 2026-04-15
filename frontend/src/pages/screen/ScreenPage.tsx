import type { FC } from "react";

import { ContentCopy as CopyIcon } from "@mui/icons-material";
import { Typography, Alert, IconButton, Tooltip } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { screenModel } from "./model";
import * as Styled from "./ScreenPage.styled";

export const ScreenPage: FC = () => {
  useGate(screenModel.ScreenGate);

  const screenToken = useUnit(screenModel.$screenToken);
  const uploadUrl = useUnit(screenModel.$uploadUrl);
  const screenImage = useUnit(screenModel.$screenImage);
  const lastUpdated = useUnit(screenModel.$lastUpdated);
  const hasImage = useUnit(screenModel.$hasImage);

  const scriptCommand = `while true; do screencapture -t jpg -x ~/Desktop/sc_raw.jpg && sips -s formatOptions 30 ~/Desktop/sc_raw.jpg --out ~/Desktop/sc.jpg > /dev/null 2>&1 && curl -s -L --post301 -X POST -H "Content-Type: image/jpeg" -H "X-Screen-Token: ${screenToken}" --data-binary "@\\$HOME/Desktop/sc.jpg" ${uploadUrl}; sleep 2; done`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCommand);
  };

  return (
    <Styled.StyledContainer maxWidth="lg">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h3" component="h1" gutterBottom>
          Мониторинг экрана
        </Styled.StyledTitle>
        <Typography variant="h6" color="text.secondary">
          Наблюдение за экраном в реальном времени
        </Typography>
      </Styled.HeaderBox>

      {screenToken && (
        <Styled.TokenSection>
          <Typography variant="subtitle1" gutterBottom>
            Команда для запуска на Mac:
          </Typography>
          <Styled.CodeBlock>
            <Styled.CodeText>{scriptCommand}</Styled.CodeText>
            <Tooltip title="Скопировать">
              <IconButton onClick={handleCopyScript} size="small">
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Styled.CodeBlock>
        </Styled.TokenSection>
      )}

      <Styled.ScreenSection>
        {hasImage && screenImage ? (
          <>
            <Styled.ScreenImage src={screenImage} alt="Скриншот экрана" />
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary" align="center">
                Обновлено: {new Date(lastUpdated).toLocaleString("ru-RU")}
              </Typography>
            )}
          </>
        ) : (
          <Alert severity="info">
            Скриншоты пока не поступали. Запустите команду выше на целевом Mac.
          </Alert>
        )}
      </Styled.ScreenSection>
    </Styled.StyledContainer>
  );
};
