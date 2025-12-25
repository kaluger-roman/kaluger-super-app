import type { FC } from "react";
import { useEffect } from "react";

import { CssBaseline, CircularProgress } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";
import { useUnit } from "effector-react";
import { BrowserRouter as Router } from "react-router-dom";

import { userModel } from "@entities";
import { theme, NotificationProvider } from "@shared";

import * as Styled from "./App.styled";
import { AppContent } from "./components";
import { appInitModel, blockingModel, webSocketModel } from "./model";

const App: FC = () => {
  const isAuthenticated = useUnit(userModel.$isAuthenticated);
  const user = useUnit(userModel.$user);
  const appInitialized = useUnit(appInitModel.$appInitialized);
  const isBlocking = useUnit(blockingModel.$isBlocking);

  useEffect(() => {
    // Set auth token from localStorage on app start and restore profile
    (async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        userModel.setAuthToken(token);
        try {
          // Wait for profile to be fetched before initializing the rest of the app
          await userModel.getProfileFx();
        } catch (e) {
          // Ignore profile fetch errors here; initialize app anyway
          // (getProfileFx will set stores on success/fail)
          // eslint-disable-next-line no-console
          console.error("Failed to restore profile:", e);
        }
      }

      // Initialize app (load students, upcoming lessons etc.)
      appInitModel.initializeApp({});
    })();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      webSocketModel.connectWebSocket();
    } else {
      webSocketModel.disconnectWebSocket();
    }

    return () => {
      webSocketModel.disconnectWebSocket();
    };
  }, [isAuthenticated]);

  if (!appInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Styled.StyledBackdrop open={true}>
          <CircularProgress color="inherit" />
        </Styled.StyledBackdrop>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Router>
          <AppContent isLoggedIn={isAuthenticated} user={user} />
          <NotificationProvider />
          <Styled.ModalBackdrop open={isBlocking}>
            <CircularProgress color="inherit" />
          </Styled.ModalBackdrop>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export { App };
